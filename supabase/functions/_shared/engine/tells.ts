/**
 * Mechanical review: the tiered AI-tell detector and the format hard gates. Pure code, no model call.
 *
 * Ported from research/tells/analyze.py (the regexes and the structural counters) and shaped by
 * docs/04-copy-standard.md §7: Tier 0 hard rejects, Tier 1 weight 4, Tier 2 weight 2 by density per 1,000 words,
 * Tier 3 weight 1 and never alone. Score = sum of weights per 300 words; review flag at 6, hard fail at 10 or any
 * Tier 0 hit. Density thresholds are the human per-document p90 from research/tells/human_calibration_report.md
 * (899 public DR documents), per format profile where the report gives one. The non-tells in §7 are never scanned:
 * exclamation marks, ellipses, ALL CAPS, fragments, "Dear Friend", "P.S.".
 *
 * The owner's list (§7.1) governs where it and the calibration disagree: em dashes, emojis and hashtags are Tier 0
 * in every format, and the owner's pattern tells and words are Tier 1 per hit, scanned outside quotations and
 * testimonials, skipping proper nouns and the literal words of what the offer sells. Two or more owner hits in a
 * piece are the stack: a hard fail that sends the draft back to revision.
 *
 * Two entry points:
 *  - analyzeDraft(sections, spec): block-aware. Headline, deck and crosshead blocks are legitimate display text, so
 *    markdown artifacts (headings, bold-label-colon, emoji bullets) are scanned on paragraph and bullet text only.
 *  - analyzeText(text, {format}): raw text (a pasted draft, a corpus sample) treated as paragraphs; here a `# heading`
 *    line is what the model emitted and counts as a Tier 0 artifact.
 */
import type { Block, Section } from "./schemas/draft.ts";
import type { MechanicalReport } from "./schemas/review.ts";
import type { FormatSpec } from "./formats/spec.ts";
import type { FormatId } from "./schemas/common.ts";
import { LEDGER_TAG, NEEDS_SOURCE_TAG } from "./schemas/common.ts";
import { sectionBaseId, sectionItemIndex } from "./formats/index.ts";
import { draftWordCount } from "./render.ts";

// ---------------------------------------------------------------------------------------------------------------
// Rule table
// ---------------------------------------------------------------------------------------------------------------

export type Tier = 0 | 1 | 2 | 3;
export type TellScope = "all" | "body" | "paragraph" | "structural";

/** Human-corpus profile a format is calibrated against (human_calibration_report.md §3). */
export type DensityProfile = "email" | "social" | "optin" | "page" | "ad";
export const DENSITY_PROFILES: Record<FormatId, DensityProfile> = {
  email_single: "email",
  email_sequence: "email",
  cold_email: "email",
  sms: "email",
  organic_social: "social",
  tiktok_reels: "social",
  optin: "optin",
  sales_letter: "page",
  landing_page_short: "page",
  upsell: "page",
  order_bump: "page",
  order_form: "page",
  thank_you: "page",
  webinar_package: "page",
  vsl_long: "page",
  vsl_short: "page",
  youtube_ad: "page",
  advertorial: "page",
  product_description: "page",
  pricing_page: "page",
  podcast_read: "page",
  meta_ad: "ad",   // no human control yet; carries the page thresholds
  google_rsa: "ad",
};

export interface TellRule {
  tier: Tier;
  name: string;
  /** Null for rules computed structurally in code (listed so the admin UI can display them). */
  regex: RegExp | null;
  weight: number;
  example: string;
  fix: string;
  /** Density rule: flag only the hits above this many per 1,000 words. 0 means any hit is flagged. */
  density_per_1000?: number;
  /** Per-profile override of density_per_1000 (human p90 by format). */
  density_by_profile?: Partial<Record<DensityProfile, number>>;
  /** Hits exempt before counting (e.g. "cancel anytime" said once in the offer block). */
  free_hits?: number;
  /** Where the rule is scanned: every block; body prose and bullet items; paragraph blocks only; or code. */
  scope: TellScope;
  note?: string;
  /** The owner's list (§7.1), with the tell's number there when it has one. Owner rules other than 11-13 skip quotations and testimonials. */
  owner?: { tell?: number; words?: boolean };
}

export const TIER_WEIGHT: Record<Tier, number> = { 0: 10, 1: 4, 2: 2, 3: 1 };
export const TELL_THRESHOLDS = { flag: 6, hard_fail: 10 } as const;
/** Scores are normalised per 300 words; copy shorter than this is scored as if it were this long. */
export const SCORE_FLOOR_WORDS = 300;
/** Density thresholds are per 1,000 words; copy shorter than this uses this denominator so one hit in an SMS is not a density. */
export const DENSITY_FLOOR_WORDS = 500;
/** §7.1: two or more owner tells (Tier 1 patterns and words) in one piece are the stack, a hard fail. */
export const OWNER_STACK = 2;

const A = "['’]?"; // optional straight or curly apostrophe
/** Negated sentence openers of the "It's not X. It's not Y. It's Z." three-beat. */
const NEG_OPEN = `(?:It${A}s not|It is not|It isn${A}t|It was not|It wasn${A}t|This is not|This isn${A}t|This was not|This wasn${A}t|That${A}s not|That is not|That isn${A}t)`;

/**
 * The owner's never-rules (§7.1, tells 11-13), defined once: the detector counts with these and the tell edit's
 * backstop (draft/tell_edit.ts) removes with them, so what the backstop leaves is never what the detector flags.
 *
 * Emoji: emoji-presentation characters, any pictograph shown as an emoji (VS16), check marks and hearts, flags,
 * keycaps, with skin tones, ZWJ sequences and tag characters attached. Rating stars, check boxes, card suits, ©, ®
 * and ™ are typography, not emoji.
 */
export const EMOJI_SOURCE = String.raw`(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F|[✓✔☑❤♥])(?:\uFE0F|\u200D(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})\uFE0F?|[\u{1F3FB}-\u{1F3FF}]|[\u{E0020}-\u{E007F}])*|[\u{1F1E6}-\u{1F1FF}]{1,2}|[0-9#*]\uFE0F?\u20E3`;
/** A hashtag: "#" then a tag holding a letter ("#SEO", "#100DaysOfCode"; "#1" is not one), not inside a word, an entity, a URL, a markdown anchor or a quote, and not a hex colour with a digit. */
export const HASHTAG_SOURCE = String.raw`(?<![\p{L}\p{N}_&#/=?.\-("'“‘\[])#(?!(?=[0-9a-fA-F]*\d)[0-9a-fA-F]{3,8}\b)((?=[\p{N}_]*\p{L})[\p{L}\p{N}_]+)`;
/** An em dash, a spaced en dash or a double hyphen used as one. Links are blanked before scanning. */
export const EM_DASH_SOURCE = String.raw`—|(?<=\S) – (?=\S)|(?<=\S) -- (?=\S)|(?<=\w)--(?=\w)`;
/** Links in copy, blanked before the em dash scan (a URL may hold "--") and kept whole by the backstop. */
export const LINK_SOURCE = String.raw`https?:\/\/[^\s)\]]+|www\.[^\s)\]]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|co|io|net|org|ai|app|me|us|uk|ca|de|store|shop|so|gg)\b(?:\/[^\s)\]]*)?`;

export const TELLS: TellRule[] = [
  // ---- Tier 0: hard reject ----
  {
    tier: 0, name: "assistant_residue", weight: 10, scope: "all",
    regex: new RegExp(
      "(?:^(?:\\*\\*|#{1,6}\\s*)?(?:Notes?:|A few notes|Quick notes|Production notes|Implementation notes|Compliance (?:notes?|tips)|Notes? before|Things to (?:swap|replace|customize)|What to customize|Next steps\\b|Creative ideas\\b|Before (?:you|this) (?:send|publish|run|launch|go(?:es)? live))" +
        `|\\b(?:Want me to|If you (?:share|tell me|send me)|If you${A}d like (?:a|me)|Here${A}s (?:a|the|your) draft|Let me know if|Swap in\\b|I can also (?:write|draft|tailor|adjust|shorten)|Fill in the brackets|Replace the brackets|as placeholders?\\b|I left [^.\\n]{0,40}placeholder))`,
      "gim",
    ),
    example: "Notes: swap in your product name.",
    fix: "Delete. Reasoning and instructions live in structured fields, never in the copy.",
  },
  {
    tier: 0, name: "bracket_placeholder", weight: 10, scope: "all",
    regex: /(?<!\[)\[(?!\[)(?:[A-Za-z][^[\]\n]{0,40}|\$?(?:X[X,.\d]*|_{2,}[^\]\n]{0,20})|\d+(?:[-–/]\d+)*|\.\.\.)\](?!\()/g,
    example: "[Product Name] helps [target audience]",
    fix: "Fill from the ledger or stop and ask. Never ship a bracket.",
    note: "Any bracketed word, XXX, blanks or bare numbers. Ledger tags [[L:id]], [[NEEDS SOURCE]] and markdown links are excluded; timestamps like [0:12] are not matched. One hit in 879k human words.",
  },
  {
    tier: 0, name: "bold_label_colon", weight: 10, scope: "body",
    regex: /\*\*[^*\n]{1,45}:\*\*|\*\*[^*\n]{1,45}\*\*\s*:|__[^_\n]{1,45}:__/g,
    example: "**Speed:** get reports in minutes",
    fix: "A sentence with the claim and its carrier.",
    note: "Markdown branches only. analyze.py's plain-text `Label:` branch fires on 55% of human documents (92% of sales pages) and is demoted to Tier 3 as label_colon_line.",
  },
  {
    tier: 0, name: "markdown_heading", weight: 10, scope: "body",
    regex: /^\s{0,3}#{1,6}\s+\S/gm,
    example: "### What's Inside",
    fix: "A crosshead block that states the answer, or a sentence.",
    note: "Scanned on paragraph and bullet text only; headline, deck and crosshead blocks are rendered as headings legitimately.",
  },
  {
    tier: 0, name: "em_dash", weight: 10, scope: "all", owner: { tell: 11 },
    regex: new RegExp(EM_DASH_SOURCE, "g"),
    example: "It works — fast.",
    fix: "A period, a comma or parentheses.",
    note: "The owner's rule (§7.1, tell 11), in every format, quotations included. A spaced en dash or a double hyphen used as a dash is the same tell; an unspaced en dash in a range (3–5) is not, and links are not scanned. Human direct response runs 1.57 per 1,000; the owner bans it anyway.",
  },
  {
    tier: 0, name: "emoji", weight: 10, scope: "all", owner: { tell: 12 },
    regex: new RegExp(EMOJI_SOURCE, "gu"),
    example: "✅ Syncs your sales automatically.",
    fix: "Remove it; never add one.",
    note: "The owner's rule (§7.1, tell 12), in every format and block: emoji-presentation characters and pictographs shown as emoji, check marks, hearts, flags and keycaps. Rating stars (★ ☆), check boxes, card suits, ©, ® and ™ are typography, not emoji.",
  },
  {
    tier: 0, name: "hashtag", weight: 10, scope: "all", owner: { tell: 13 },
    regex: new RegExp(HASHTAG_SOURCE, "gu"),
    example: "#SEO #marketing",
    fix: "Remove it; never add one.",
    note: "The owner's rule (§7.1, tell 13). \"#1\", \"C#\", HTML entities, URL fragments, markdown anchors and hex colours with a digit are not hashtags.",
  },

  // ---- Tier 1: weight 4 (phrases at 0.00-0.02 per 1,000 in 879k human words) ----
  {
    tier: 0, name: "proof_confession", weight: 10, scope: "all",
    regex: new RegExp(
      "\\b(?:no (?:blind |independent |split |a/b )?(?:test|evaluation|study|trial|comparison)s? (?:has|have) (?:yet )?been (?:run|done|conducted|completed)" +
        `|(?:has|have)n${A}t (?:yet )?been (?:tested|proven|measured|evaluated)` +
        `|(?:we|I) (?:have ?n${A}t|have not) (?:yet )?(?:tested|proven|measured)` +
        `|can${A}t (?:show|prove) (?:you )?(?:yet|that it|it (?:sells|works|converts))` +
        `|won${A}t (?:tell|claim|promise)(?: you)? (?:that )?(?:it|this|the copy|this copy) (?:sells|works|converts|outsells|beats)` +
        "|(?:is|are|has|have) not (?:yet )?(?:been )?proven to" +
        `|hasn${A}t been proven` +
        "|no (?:customer )?(?:results|testimonials|reviews|case studies) (?:yet|to show)" +
        `|(?:we|I) (?:don${A}t|do not) have (?:any )?(?:proof|results|testimonials|data) (?:yet|that))`,
      "gi",
    ),
    example: "No blind test has been run, so I won't tell you it sells better.",
    fix: "Cut it. Make only the claims the ledger carries; the absence of proof is never copy (rules 8 and 12).",
    note: "Zero hits in 871,661 words of human direct response (900 documents); six in 2,410 words of the engine's own drafts before rule 12 was tightened.",
  },
  {
    tier: 1, name: "thats_why_we_built", weight: 4, scope: "all",
    regex: new RegExp(`\\bthat${A}s why (?:we|I) (?:created|built|made|designed|developed|put together)\\b`, "gi"),
    example: "That's why we built Reportly.",
    fix: "A reason-why turn: discovery, failed fixes, cause.",
  },
  {
    tier: 1, name: "youre_not_alone", weight: 4, scope: "all",
    regex: new RegExp(`\\byou${A}re not alone\\b|\\bif (?:that|this) sounds (?:like you|familiar)\\b|\\bsound familiar\\?|\\bsound like you\\?`, "gi"),
    example: "If that sounds familiar, you're not alone.",
    fix: "A quoted verbatim from the research.",
  },
  {
    tier: 1, name: "less_than_a_cup", weight: 4, scope: "all",
    regex: /\bless than (?:a|one|the cost of|the price of|your daily) (?:cup|coffee|latte|lunch|dinner|pizza|tank|netflix|month|day|single)\b/gi,
    example: "for less than your daily latte",
    fix: "A comparable comparison with the full price stated.",
  },
  {
    tier: 1, name: "vsl_opener_promise", weight: 4, scope: "all",
    regex: new RegExp(`\\bin the next (?:few|\\d+) minutes\\b|\\bI${A}m (?:going to|about to) (?:show|share|reveal|walk you through)\\b|\\bin this (?:video|short video|presentation)\\b`, "gi"),
    example: "In the next few minutes I'll show you exactly how...",
    fix: "The interrupt tied to the promise.",
  },
  {
    tier: 1, name: "stay_with_me", weight: 4, scope: "all",
    regex: /\b(?:stay with me|stick with me|stick around|keep (?:watching|reading))\b/gi,
    example: "Stay with me, because...",
    fix: "An open loop with a specific. VSLs may say \"keep watching\" once.",
  },
  {
    tier: 1, name: "summary_closer", weight: 4, scope: "all", owner: { words: true },
    regex: /(?:^|[.!?]\s+)(?:In (?:short|summary|conclusion)|To (?:sum up|summarize|recap|wrap (?:it |things )?up)|So,? to recap|All in all|In a nutshell)\b/gim,
    example: "In short, X gives you A, B and C.",
    fix: "The CTA and what happens after the click.",
  },
  {
    tier: 1, name: "self_posed_question_header", weight: 4, scope: "structural",
    regex: /^\s*(?:#{1,6}\s*)?\*\*[^*\n]{3,80}\?\*\*\s*$/gm,
    example: "### Why only $49?",
    fix: "A crosshead that states the answer.",
    note: "Also counts crosshead and deck blocks that end with a question mark. 0.00 per 1,000 in human copy.",
  },
  {
    tier: 1, name: "bold_leadin_bullet", weight: 4, scope: "body",
    regex: /^\s*(?:[-*•]\s*)?\*\*[^*\n:]{2,60}\*\*\s+\S/gm,
    example: "**Seven dinners planned.** With quick weeknight meals...",
    fix: "A bullet that withholds the closing noun, or a sentence. Opt-in and upsell blocks may keep five plain bold lead-ins.",
  },
  {
    tier: 1, name: "markdown_list_in_paragraph", weight: 4, scope: "structural",
    regex: /^\s*(?:[-*•]|\d+[.)])\s+\S/gm,
    example: "- Payouts that never line up",
    fix: "A bullets block, or prose.",
    note: "Counted once per run of list lines inside a paragraph block, not per line.",
  },

  // ---- Tier 1: the owner's list (§7.1), weight 4 per hit ----
  {
    tier: 1, name: "quietly", weight: 4, scope: "all", owner: { tell: 1 },
    regex: /\bquietly\b/gi,
    example: "Legiit quietly passed a million orders.",
    fix: "Cut it, or say who did not know.",
  },
  {
    tier: 1, name: "three_beat_deep_third", weight: 4, scope: "all", owner: { tell: 2 },
    regex: new RegExp(
      `(?:^|[.!?:]\\s+)(?:Not|No|Never)\\s[^.?!\\n]{1,40}[.!]\\s+(?:Not|No|Never|Nor)\\s[^.?!\\n]{1,40}[.!]\\s+(?:(?:Not|No|Never)\\s[^.?!\\n]{1,40}[.!]\\s+)?(?!(?:Not|No|Never|Nor)\\b)[A-Z0-9$]` +
        `|(?:^|[.!?:]\\s+)${NEG_OPEN}\\s[^.?!\\n]{1,40}[.!]\\s+(?:${NEG_OPEN}|Not|Nor)\\s[^.?!\\n]{1,40}[.!]\\s+(?:It${A}s|It is|It was|This is|This was|That${A}s|It|This)\\b` +
        `|\\b[Nn]ot [^,.?!\\n]{1,30}, not [^,.?!\\n]{1,30}, (?:but|just|only)\\b`,
      "gm",
    ),
    example: "Not a tool. Not a course. It's a system.",
    fix: "State the claim once: \"It's a system.\"",
    note: "Two negated beats, then a third that turns: \"Not a tool. Not a course. A system.\", \"No fluff. No theory. Real results.\", \"It's not about the money. It's not about the fame. It's about the freedom.\" A plain list of negations (\"No ads. No spam. No tracking.\") does not turn and is not counted. Absorbs the old Tier 2 \"No X. No Y. Just Z.\" rule; no social exemption.",
  },
  {
    tier: 1, name: "self_answered_question", weight: 4, scope: "structural", owner: { tell: 3 },
    regex: null,
    example: "The result? More sales.",
    fix: "Make the point: \"You make more sales.\"",
    note: "A question of seven words or fewer followed in the same block by a short statement that is not an instruction: the copy asks and answers itself.",
  },
  {
    tier: 1, name: "heres_the_windup", weight: 4, scope: "all", owner: { tell: 4 },
    regex: new RegExp(
      `\\bhere(?:${A}s| is) (?:the|my|our|one|a|another) (?:real |big |best |worst |crazy |funny |scary |sad |ugly |simple |short |honest |hard |important |interesting |surprising |wild |weird |tricky |good |bad )?(?:kicker|thing|part|catch|deal|truth|secret|twist|problem|rub|key|reason|question|answer|point|difference|bottom line|takeaway|lesson|rule|bit|news|math|trick|kick|story|idea|tip|hint|thought|confession|warning|reminder)\\b` +
        `|\\bhere(?:${A}s| is) (?:the|my|our|a|one|another) (?:[\\w'’-]+ ){0,3}[\\w'’-]+:` +
        `|\\bhere(?:${A}s| is) (?:what|why|how|where|who|when)\\b[^.?!\\n:]{0,60}(?::|\\.(?=\\s|$)|$)` +
        `|\\b(?:the part|what) (?:nobody|no one|few people|most people (?:don${A}t|never)) (?:talks? about|tells? you|mentions?|wants? to (?:hear|admit|say))\\b` +
        `|(?:^|[.!?]\\s+)[A-Z][^.!?\\n:]{0,40}\\b(?:this|these)\\s*:`,
      "gim",
    ),
    example: "Here's the part the score hides:",
    fix: "Make the point directly.",
    note: "\"Here's the ___\" (\"Here's the one number that matters:\") and its near-variants \"Here's what / why / how ...\" (a crosshead or subject line included) and a short clause ending in \"this:\" (\"The score hides this:\", \"Do this:\") announce the point instead of making it.",
  },
  {
    tier: 1, name: "label_windup", weight: 4, scope: "all", owner: { tell: 4 },
    regex: new RegExp(
      `(?:^|[.!?]\\s+)(?:(?:So|And|But|Then|Now),? )?(?:(?:My|Our|The|Your|One) )?(?:rule|fix|bottom line|upshot|takeaway|lesson|point|kicker|catch|twist|good news|bad news|short version|long story short|translation|real talk|pro tip|secret|trick|move|play|verdict|irony|reality|punchline|math)\\s*:` +
        `|\\b(?:I${A}d|I would|I${A}ll|I) (?:ask|check|look at|want to know) (?:two|three|four|five|a few|one) (?:things|questions)\\b` +
        `|\\b(?:two|three|four|five|a few) (?:questions|things|checks|tests|rules) (?:decide|matter|settle|separate)\\b` +
        `|\\b(?:it|this|everything|that) (?:all )?(?:comes|boils) down to (?:one|two|three|four|a few) (?:things|questions)\\b` +
        `|\\bone more (?:check|thing|question|test|step|rule)\\b[^.?!\\n:]{0,40}:`,
      "gim",
    ),
    example: "My rule: never pay for a keyword tool you open once a month.",
    fix: "Drop the label or the count and make the point: \"Never pay for a keyword tool you open once a month.\"",
    note: "The windup reworded as a label (\"My rule:\", \"The fix:\", \"Bottom line:\") or a count of what is coming (\"Two questions decide it.\", \"I'd ask two things.\", \"One more check:\") announces the point instead of making it (§7.1 tell 4).",
  },
  {
    tier: 1, name: "worth_noting", weight: 4, scope: "all", owner: { tell: 5 },
    regex: new RegExp(
      `\\bworth (?:noting|remembering|keeping in mind|bearing in mind|mentioning|pointing out|repeating|highlighting|emphasizing|emphasising|a mention)\\b|\\b(?:keep|bear) in mind\\b|\\bit bears (?:repeating|mentioning|noting)\\b|\\bimportant to (?:note|remember|mention|point out|keep in mind)\\b|\\bshould be noted\\b|(?:^|[.!?]\\s+)(?:Please )?[Nn]ote that\\b`,
      "gim",
    ),
    example: "It's worth noting that the trial is free.",
    fix: "State the point: \"The trial is free.\"",
  },
  {
    tier: 1, name: "buzzword_pile", weight: 4, scope: "all", owner: { tell: 6 }, free_hits: 1,
    regex: /\bdoubl(?:e|es|ed|ing) down\b|\bat scale\b|\bbest[- ]in[- ]class\b|\bmov(?:e|es|ing) fast\b|\bmoved fast\b/gi,
    example: "double down, at scale, best in class, move fast",
    fix: "Keep one precise term, cut the rest.",
    note: "A pile is two or more: the first buzzword in a piece is free.",
  },
  {
    tier: 1, name: "genuinely_meaningfully", weight: 4, scope: "all", owner: { tell: 7 },
    regex: /\bgenuinely\b|\bmeaningfully\b/gi,
    example: "a genuinely useful report",
    fix: "Cut the word when the sentence means the same without it.",
  },
  {
    tier: 1, name: "disguise_frame", weight: 4, scope: "all", owner: { tell: 8 },
    regex: new RegExp(
      `\\b(?:wearing|wears|wore|in) (?:a|an|the|its|their) [^.?!\\n]{1,30}?\\bcostumes?\\b|\\bcosplay(?:s|ed|ing|er|ers)?\\b|\\b(?:dressed|dresses|dressing) (?:up )?as\\b|\\bwrapped (?:up )?in (?:a |an |the )?(?:nicer|shinier|new|fancy|fancier|pretty|prettier|clever|slick|slicker|nice|better)\\b|\\bmasquerad(?:e|es|ed|ing) as\\b|\\bdisguised as\\b|\\bin disguise\\b|\\bin (?:sheep|[a-z]+${A}s) clothing\\b|\\bwith (?:a|an) [^.?!\\n]{1,30}? (?:veneer|skin|wrapper)\\b|\\b(?:posing|poses|posed) as\\b|\\bpass(?:es|ed|ing)? (?:itself|themselves|yourself|himself|herself) off as\\b` +
        `|\\b(?:feels|looks|sounds|seems) like [^.?!\\n]{1,40}\\.\\s+(?:It${A}s|It is|That${A}s|But it${A}s|It${A}s really|It${A}s actually)\\b` +
        `|\\b(?:was|is|were|are)(?: never|n${A}t| not)(?: really| actually)? [^.?!\\n]{1,40}\\.\\s+(?:The|Your|Their|Its|It${A}s|They|That)\\b[^.?!\\n]{1,60}\\b(?:is|are|was|were)\\.`,
      "gi",
    ),
    example: "Sorting by difficulty feels like research. It's where bad content gets made.",
    fix: "State the claim directly: \"X is really Y\" or \"X is just Y\".",
    note: "One thing presented as another in disguise; the reframes \"X feels like Y. It's Z.\" and \"X was never Y. Z is.\" are the same pattern.",
  },
  {
    tier: 1, name: "hard_truth", weight: 4, scope: "all", owner: { tell: 9 },
    regex: new RegExp(
      `\\b(?:uncomfortable|hard|harsh|brutal|ugly|cold|painful|inconvenient|sobering) truths?\\b|\\btruth (?:nobody|no one|few people) (?:wants|likes|talks|tells|admits)\\b|\\btruth bombs?\\b|(?:^|[.!?]\\s+)The truth is\\b`,
      "gim",
    ),
    example: "The hard truth: most pages never rank.",
    fix: "Drop the signpost; a plain \"honestly\" once is fine.",
  },
  {
    tier: 1, name: "pressure_test", weight: 4, scope: "all", owner: { tell: 10 },
    regex: /\b(?:stress|pressure)[- ]?test(?:s|ed|ing)?\b|\bsanity[- ]?check(?:s|ed|ing)?\b|\bgut[- ]?check(?:s|ed)?\b/gi,
    example: "Let's stress test this.",
    fix: "Say what is checked and how.",
  },
  {
    tier: 1, name: "ai_words", weight: 4, scope: "all", owner: { words: true },
    regex: /\bdelv(?:e|es|ed|ing)\b|\btapestr(?:y|ies)\b|\brealms?\b|\bnavigat(?:e|es|ed|ing|ion)\b|\bunlock(?:s|ed|ing)?\b|\bseamless(?:ly)?\b|\belevat(?:e|es|ed|ing)\b|\blandscapes?\b|\btestament\b|\bbustling\b|\bharness(?:es|ed|ing)?\b|\bever[- ]evolving\b|\bever[- ]changing\b|\bmultifaceted\b|\bmeticulous(?:ly)?\b|\bbespoke\b|\btailored\b|\bcaptivat(?:e|es|ed|ing)\b|\benthrall(?:s|ed|ing)?\b|\bbeacons?\b|\bunleash(?:es|ed|ing)?\b|\benrich(?:es|ed|ing)?\b|\bpoised\b|\btowards\b|\bunderpin(?:s|ned|ning)?\b|\bdemystif(?:y|ies|ied|ying)\b|\binsurmountable\b|\bunprecedented\b|\brobust\b/gi,
    example: "Unlock a seamless, robust way to navigate the landscape.",
    fix: "The plainest word that keeps the meaning, or cut it.",
  },
  {
    tier: 1, name: "corporate_filler", weight: 4, scope: "all", owner: { words: true },
    regex: new RegExp(
      `\\bparadigm shifts?\\b|\\bcutting[- ]edge\\b|\\bgame[- ]chang(?:ing|er|ers)\\b|\\btransformative\\b|\\bgroundbreaking\\b|\\brevolutionar(?:y|ies)\\b|\\brevolutioni[sz](?:e|es|ed|ing)\\b|\\bsynerg(?:y|ies|istic)\\b|\\becosystems?\\b|\\bscalab(?:le|ility)\\b|\\bdisruptive\\b|\\bmov(?:e|es|ing) the needle\\b|\\bmoved the needle\\b|\\bcircl(?:e|es|ed|ing) back\\b|\\bat the end of the day\\b|\\bwhen it comes to\\b|\\bthe world of\\b|\\bnot only\\b|\\bnot (?:just|merely|simply)\\b[^.?!\\n]{1,70}?\\b(?:but|it${A}s|it is|they${A}re)\\b|\\bnext[- ]level\\b|\\boptimi[sz]ed\\b|\\bvalue[- ]adds?\\b|\\bleverag(?:e|es|ed|ing)\\b`,
      "gi",
    ),
    example: "a game-changing, scalable ecosystem that moves the needle",
    fix: "The plainest word that keeps the meaning, or cut it.",
    note: "\"not just X but Y\" and \"not just X, it's Y\" are the near-variants of \"not only\" and count here.",
  },
  {
    tier: 1, name: "guru_speak", weight: 4, scope: "all", owner: { words: true },
    regex: /\babundance mindset\b|\bmanifest(?:s|ed|ing|ation)?\b|\bhigh[- ]vibrations?\b|\bthe universe\b|\balignment\b|\bhold(?:s|ing)? space\b|\bsit(?:ting)? with it\b|\bauthentic(?:ity|ally)?\b|\blean(?:s|ed|ing)? into\b|\byour truth\b|\bintentional(?:ly)?\b|\bmindful(?:ly|ness)?\b/gi,
    example: "lean into your truth with an abundance mindset",
    fix: "The plainest word that keeps the meaning, or cut it.",
  },
  {
    tier: 1, name: "empty_hedge", weight: 4, scope: "all", owner: { words: true },
    regex: new RegExp(`\\b(?:just )?my two cents\\b|\\bfor what it${A}s worth\\b|\\bfor what it is worth\\b|\\bFWIW\\b|\\bin my humble opinion\\b|\\bIMHO\\b|\\bin my (?:honest |personal )?(?:opinion|view)\\b|\\bif you ask me\\b|\\bwith a grain of salt\\b|\\byour mileage may vary\\b|\\bYMMV\\b`, "gi"),
    example: "Just my two cents, but your mileage may vary.",
    fix: "Cut it and state the point.",
  },
  {
    tier: 1, name: "formal_words", weight: 4, scope: "all", owner: { words: true },
    regex: /\butili[sz](?:e|es|ed|ing|ation)\b|\bendeavou?r(?:s|ed|ing)?\b|(?:^|[.!?]\s+)(?:Furthermore|Moreover|Additionally|In addition)\b/gim,
    example: "Furthermore, you can utilize the report.",
    fix: "\"Use\", \"try\"; a new sentence or paragraph instead of the connective.",
  },
  {
    tier: 1, name: "empty_teaser", weight: 4, scope: "all", owner: { words: true },
    regex: new RegExp(
      `\\b(?:earlier|sooner|bigger|worse|deeper|closer|simpler|faster|harder) than you (?:think|might think|realize|realise|expect)\\b|\\bwhere (?:the )?(?:real )?(?:trouble|problem|mess|damage|rot|bad [a-z]+) (?:starts|begins|gets made|comes from)\\b|\\bthat${A}s where (?:it gets|things get) (?:interesting|tricky|ugly|good)\\b|(?:^|[.!?]\\s+)(?:But )?[Ff]irst,? though\\b|\\bmore on (?:that|this) (?:in a (?:second|minute|moment)|later|below)\\b|\\bthe real question is\\b|\\bbut there${A}s a catch\\b|\\bstay tuned\\b`,
      "gim",
    ),
    example: "And the guess starts one step earlier than you think.",
    fix: "End on the point: name the specific, or cut the line.",
    note: "A teaser that withholds nothing specific is a windup at the end of a line (§3 Hooks, §7.1 structure).",
  },
  {
    tier: 1, name: "windup_opener", weight: 4, scope: "all", owner: { words: true },
    regex: new RegExp(
      `(?:^|[.!?]\\s+)(?:In today${A}s (?:world|market|economy|landscape|digital (?:age|world)|fast[- ]paced (?:world|market))|In (?:a|this) (?:world|day and age) where|Today,? (?:I|we)(?: want| wanted|${A}m going| am going|${A}d like| would like) to (?:talk|share|discuss|show|cover|chat)|Let${A}s (?:talk|chat) about|In this (?:post|article|email|guide|blog),? (?:I|we)\\b)`,
      "gim",
    ),
    example: "In today's world, content is everything.",
    fix: "Open on the point.",
  },

  // ---- Tier 2: weight 2 by density per 1,000 words (human p90 by format) ----
  {
    tier: 2, name: "designed_to", weight: 2, scope: "all", density_per_1000: 1,
    regex: /\b(?:designed|built|crafted|engineered|curated) (?:to|for|specifically)\b/gi,
    example: "designed to help busy founders",
    fix: "Say what it does: \"pulls the number when the client opens the report\".",
    note: "Human sales pages p90 about 1 per 1,000 (AI 1.25, 35% of drafts); per-hit weight 4 flagged a product page on its second mention, so it is a density tell.",
  },
  {
    tier: 2, name: "cancel_anytime_triad", weight: 2, scope: "all", density_per_1000: 0, free_hits: 1,
    regex: /\bcancel anytime\b|\bno (?:long[- ]term )?contracts?\b|\bno set-?up fees?\b/gi,
    example: "Cancel anytime. No contracts. No setup fees.",
    fix: "The denominated guarantee, once.",
    note: "Allowed once (the offer block says it; 28% of human subscription sales pages do). The second and later mentions are the triad.",
  },
  {
    tier: 2, name: "rule_of_three", weight: 2, scope: "all", density_per_1000: 7, density_by_profile: { email: 4, social: 4, page: 7, optin: 11, ad: 7 },
    regex: /(?<![,\w])[^,.;:\n()]{2,28}, [^,.;:\n()]{2,28},? and [^,.;:\n()]{2,28}(?:[.?!\n]|$)/gm,
    example: "faster, cheaper, and easier.",
    fix: "Break the third item or add a fourth with a number.",
    note: "Human per-document p90: email 4.0, social 4.2, sales page 6.7, opt-in 10.9 per 1,000. The AI pooled rate (3.99) sits at the human sales-page median, so this only discriminates at the extreme.",
  },
  {
    tier: 2, name: "trailing_participle", weight: 2, scope: "structural", density_per_1000: 2,
    regex: /,\s+([a-z]{2,}ing)\b[^.?!\n]{0,80}[.?!]/g,
    example: ", giving you more time with your family.",
    fix: "A new sentence with a subject.",
    note: "Human p90 1.7-2.5 across long formats (AI 0.78). analyze.py required eight letters and missed \", giving you\"; the port accepts five and keeps a stop list of -ing nouns and prepositions.",
  },
  {
    tier: 2, name: "hedge", weight: 2, scope: "body", density_per_1000: 2,
    regex: /\b(?:[Uu]sually|[Oo]ften|may|might|[Tt]ypically|[Gg]enerally|tends? to|in many cases|can help|may help|helps? support|supports? (?:a |your )?(?:healthy|normal)|results (?:may )?vary|individual results|many (?:people|customers|users|parents|owners|agents) (?:say|report|find|notice))\b/g,
    example: "usually saves most users a few hours",
    fix: "State the claim at the ledger grade; compliance is handled line by line in the factual review, never with \"may\".",
    note: "Human p90 1.5-2.6 (AI 0.67). Testimonial and disclosure blocks are excluded. A bare vocabulary count; the ledger match inside claim sentences belongs to the factual review.",
  },
  {
    tier: 2, name: "intensifier", weight: 2, scope: "all", density_per_1000: 2, density_by_profile: { optin: 4, social: 4 },
    regex: /\bactually\b|\bexactly\b|\bevery single\b/gi,
    example: "exactly what you need, every single day",
    fix: "Cut.",
    note: "The one Tier 2 density tell that still separates: AI 3.65 vs human 1.08 per 1,000. Human p90: email 3.3, sales page 2.2, opt-in 4.7, social 3.9.",
  },
  {
    tier: 2, name: "anaphora_triad", weight: 2, scope: "structural", density_per_1000: 1.5,
    regex: null,
    example: "They skip it. They forget it. They regret it.",
    fix: "One plain sentence.",
    note: "Three or more consecutive sentences opening with the same word. Exempt in social formats (human threads 2.74 per 1,000, list style).",
  },
  {
    tier: 2, name: "generic_emotion", weight: 2, scope: "body", density_per_1000: 1,
    regex: /\b(?:frustrated|frustrating|overwhelmed|overwhelming|juggling|stressed out|burned out|burnt out|burnout)\b/gi,
    example: "overwhelmed by juggling it all",
    fix: "Replace with the consequence scene from a verbatim.",
    note: "Approximates \"generic emotion words as the only emotional content\" by density.",
  },
  {
    tier: 2, name: "unanswered_opener", weight: 2, scope: "structural", density_per_1000: 0,
    regex: null,
    example: "Imagine never worrying about dinner again.",
    fix: "Open on the specific instead: the scene, the number or the name from the research.",
    note: "An \"Imagine...\" or \"What if...\" opener whose next line carries no number, name, price or quote. A lone question is left alone: rule 22 wants a question the reader answers about their own situation, with no answer on the next line.",
  },
  {
    tier: 2, name: "its_not_x_its_y", weight: 2, scope: "all", density_per_1000: 1,
    regex: new RegExp(`\\b(?:it${A}s|this is|that${A}s|this isn${A}t|it isn${A}t) not (?:just |only |about )?[^.?!\\n]{1,60}[.;—–-]\\s*(?:It${A}s|It is|This is|That${A}s)\\b`, "gi"),
    example: "It's not a diet. It's a system.",
    fix: "Allowed once per 1,000 words when it corrects a belief the reader holds; otherwise state the thing.",
    note: "Human p95 0.0-0.14 per 1,000; fires on about 2% of human documents.",
  },
  {
    tier: 2, name: "not_this_that_clip", weight: 2, scope: "all", density_per_1000: 2,
    regex: /(?:^|[.!?]\s+)[A-Z][^.?!\n]{1,50}\. Not [^.?!\n]{1,40}\./gm,
    example: "Real food. Not powder.",
    fix: "One sentence with a subject and a verb.",
    note: "Human DR uses the clip (0.06 per 1,000 against 0.17 in AI drafts), so the threshold is looser than the \"It's not X. It's Y.\" rule.",
  },
  {
    tier: 2, name: "most_x_dont_because", weight: 2, scope: "all", density_per_1000: 0,
    regex: new RegExp(`\\b(?:don${A}t|doesn${A}t|didn${A}t|isn${A}t|aren${A}t|never|not) [^.?!\\n]{1,60}? because [^.?!\\n]{1,60}\\. (?:They|It|You|We|He|She) [^.?!\\n]{1,40} because\\b`, "gi"),
    example: "Most sellers don't fail because of effort. They fail because nobody checks their numbers.",
    fix: "A claim with a carrier.",
  },

  // ---- Tier 3: weight 1, never alone ----
  {
    tier: 3, name: "rather_than", weight: 1, scope: "all", density_per_1000: 6.67,
    regex: /\brather than\b/gi,
    example: "rather than guessing",
    fix: "Above two per 300 words, state the chosen thing alone.",
    note: "Demoted from Tier 2: the threshold is never reached by either corpus (human max 6.4, AI 0.03).",
  },
  {
    tier: 3, name: "label_colon_line", weight: 1, scope: "body", density_per_1000: 3,
    regex: /^\s*(?:[-*•]\s*)?[A-Z][A-Za-z' ]{2,40}:\s/gm,
    example: "Speed: get reports in minutes",
    fix: "A sentence with the claim and its carrier.",
    note: "The plain-text branch of analyze.py's bold_label_colon, demoted: \"Editor's note:\", speaker labels and FAQ labels are ordinary human copy (sales page p90 2.9 per 1,000). Exempt in social formats (threads 8.4).",
  },
  {
    tier: 3, name: "phrase_4o_era", weight: 1, scope: "all",
    regex: new RegExp(
      `\\bpicture this\\b|\\blet that sink in\\b|\\bno[- ]brainer\\b|\\bspoiler alert\\b|\\bfast[- ]forward\\b|\\blet${A}s dive in\\b|\\bdive in\\b|\\bthink of it (?:as|like)\\b|\\blet${A}s (?:be honest|face it|be real)\\b|\\bsay (?:goodbye|hello) to\\b|\\blook no further\\b|\\bwithout the fluff\\b|\\bno[- ]fluff\\b|\\bno (?:gimmicks|hype)\\b`,
      "gi",
    ),
    example: "Picture this: let that sink in.",
    fix: "Cut; carry the point with a specific.",
    note: "At or near zero in both corpora; kept on prior evidence. \"It's time to\" dropped (human 0.04, AI 0.00). \"Here's the kicker\", \"Here's the thing\", \"The result?\" and \"game-changer\" moved to the owner's list.",
  },
  {
    tier: 3, name: "marketing_vocab", weight: 1, scope: "all",
    regex: new RegExp(
      `\\bstreamlin(?:e|es|ed|ing)\\b|\\bstate[- ]of[- ]the[- ]art\\b|\\bsupercharge[sd]?\\b|\\bunparalleled\\b`,
      "gi",
    ),
    example: "a streamlined, state-of-the-art, supercharged solution",
    fix: "The mechanism, the number or the scene the word stands in for.",
    note: "The words the owner's list names (seamless, cutting-edge, delve, tapestry, testament, landscape, ever-evolving, \"in today's\") are Tier 1 there. \"transform\", \"empower\", \"effortless\", \"journey\" are genre markers of human self-development pages and are not scanned.",
  },
  {
    tier: 3, name: "hey_there_greeting", weight: 1, scope: "all",
    regex: /^(?:Hey|Hi) (?:there|friend)\b/gm,
    example: "Hey there,",
    fix: "The greeting from the voice profile, or the reader's name from the ESP.",
    note: "Human 0.01 per 1,000; AI 0.50.",
  },
  {
    tier: 3, name: "quick_question_opener", weight: 1, scope: "all",
    regex: /(?:^|[.!?]\s+)(?:Quick|Honest|Simple|Real) (?:question|answer|truth|talk)[:?]/gm,
    example: "Quick question: when did you last trust your numbers?",
    fix: "Ask the question.",
  },
  {
    tier: 3, name: "youve_tried", weight: 1, scope: "all",
    regex: new RegExp(`\\byou${A}ve (?:probably |already )?tried\\b`, "gi"),
    example: "You've probably tried meal kits.",
    fix: "Name the specific prior solution from the research.",
  },
  {
    tier: 3, name: "stop_verbing_opener", weight: 1, scope: "all",
    regex: /(?:^|[.!?]\s+)Stop [a-z]+ing\b/gm,
    example: "Stop guessing.",
    fix: "State what to do instead, with the mechanism.",
  },
  {
    tier: 3, name: "most_people_opener", weight: 1, scope: "all",
    regex: new RegExp(`(?:^|[.!?]\\s+)Most (?:people|[a-z]+s) (?:don${A}t|never|struggle|think|assume|spend|waste|fail|try|believe)\\b`, "gm"),
    example: "Most people never launch because...",
    fix: "A number from the research, or the reader's own verbatim.",
  },
];

/** Listed for the admin UI; never scanned or penalised (§7 "Not tells"). Rates from the 899-document human corpus. */
export const NON_TELLS: { name: string; why: string }[] = [
  { name: "exclamation_marks", why: "Human DR 1.7 per 1,000 words (four-author corpus 6.1) against 0.25 in AI drafts." },
  { name: "ellipses", why: "Human DR 5.9 per 1,000 (financial e-letters 11.7) against 0.47." },
  { name: "all_caps_words", why: "Human DR 11.8 per 1,000 in 70% of documents; AI caps density is higher still." },
  { name: "fragments", why: "29% of human sentences are four words or fewer, against 23% in AI drafts." },
  { name: "dear_friend", why: "The classic salutation." },
  { name: "ps", why: "A second headline for the skimmer." },
  { name: "genre_vocabulary", why: "\"transform\", \"empower\", \"effortless\", \"journey\": human self-development pages 3.65 per 1,000, AI 0.03. The owner's list (§7.1) scores \"unlock\", \"elevate\", \"next level\" and the rest anyway." },
  { name: "superlatives_with_proof", why: "A superlative with its carrier is a claim, not a tell." },
  { name: "readability", why: "AI drafts read one to two grades easier than human copy; the FK grade is reported, never enforced." },
];

/** §7 overrides and calibration exemptions by format. */
export const FORMAT_OVERRIDES: Partial<Record<FormatId, { bold_leadins?: number; keep_watching?: number; exempt?: string[] }>> = {
  optin: { bold_leadins: 5 },
  upsell: { bold_leadins: 5 },
  vsl_long: { keep_watching: 1 },
  vsl_short: { keep_watching: 1 },
  organic_social: { exempt: ["anaphora_triad", "label_colon_line"] },
  tiktok_reels: { exempt: ["anaphora_triad", "label_colon_line"] },
};

/** The density threshold (per 1,000 words) a rule uses for a format, or undefined for a per-hit rule. */
export function densityThreshold(rule: TellRule, spec: FormatSpec): number | undefined {
  return rule.density_by_profile?.[DENSITY_PROFILES[spec.id]] ?? rule.density_per_1000;
}

/** Hits allowed before a density rule flags: floor(threshold × max(words, floor) / 1,000). */
export function densityAllowance(thresholdPer1000: number, words: number): number {
  return Math.floor((thresholdPer1000 * Math.max(words, DENSITY_FLOOR_WORDS)) / 1000);
}

// ---------------------------------------------------------------------------------------------------------------
// Text units
// ---------------------------------------------------------------------------------------------------------------

type UnitKind = "display" | "body" | "item";
interface Unit {
  text: string;
  kind: UnitKind;
  type: Block["type"];
  sectionId: string;
  item: number;
  /** an FAQ section or item: the buyer's questions, answered */
  faq: boolean;
}

const DISPLAY_TYPES = new Set<Block["type"]>(["headline", "deck", "preheadline", "crosshead", "subject", "preview", "label", "button", "field"]);
const PROSE_TYPES = new Set<Block["type"]>(["paragraph", "beat", "hook", "slide", "caption", "cta", "ps", "greeting", "signoff", "recap", "price", "guarantee", "testimonial", "disclosure"]);

/** Strip ledger tags and the NEEDS SOURCE marker, keeping line structure (render.ts's stripLedger collapses newlines). */
function clean(text: string): string {
  return (text ?? "")
    .replace(LEDGER_TAG, "")
    .split(NEEDS_SOURCE_TAG).join(" ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const FAQ_RE = /\bfaqs?\b|frequently asked/i;

function unitsOf(sections: Section[]): Unit[] {
  const out: Unit[] = [];
  for (const s of sections) {
    const item = sectionItemIndex(s.section_id);
    const faqSection = FAQ_RE.test(sectionBaseId(s.section_id).replace(/_/g, " ")) || FAQ_RE.test(s.title ?? "");
    for (const b of s.blocks) {
      const faq = faqSection || FAQ_RE.test((b.meta?.role ?? "").replace(/_/g, " "));
      const t = clean(b.text);
      if (t) out.push({ text: t, kind: DISPLAY_TYPES.has(b.type) ? "display" : "body", type: b.type, sectionId: s.section_id, item, faq });
      for (const i of b.items ?? []) {
        const it = clean(i);
        if (it) out.push({ text: it, kind: "item", type: b.type, sectionId: s.section_id, item, faq });
      }
    }
  }
  return out;
}

const WORD_RE = /[A-Za-z0-9'’]+/g;
/** The word counter the density denominators use (analyze.py's token rule). */
export function countWords(text: string): number {
  return (text.match(WORD_RE) ?? []).length;
}

export function sentences(text: string): string[] {
  const t = text.replace(/\s*\n\s*\n\s*/g, " \n\n ");
  return t.split(/(?<=[.!?…]["”’)]?)\s+|\n\n/).map((p) => p.trim()).filter((p) => countWords(p) >= 1);
}

// ---------------------------------------------------------------------------------------------------------------
// Readability and cadence
// ---------------------------------------------------------------------------------------------------------------

/** Syllable estimate: vowel groups, minus silent endings, minimum one. Tokens with digits count one. */
export function syllables(word: string): number {
  if (/\d/.test(word)) return 1;
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:(?<![sc]h)[^laeiouyxsz]es|[^laeiouytd]ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = w.match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function fleschKincaidGrade(text: string): number | null {
  const words = text.match(WORD_RE) ?? [];
  const sents = sentences(text);
  if (words.length < 1 || sents.length < 1) return null;
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  const grade = 0.39 * (words.length / sents.length) + 11.8 * (syl / words.length) - 15.59;
  return Math.round(grade * 10) / 10;
}

/** Coefficient of variation of sentence length in words; null under three sentences. */
export function sentenceLengthCV(text: string): number | null {
  const lens = sentences(text).map(countWords).filter((n) => n > 0);
  if (lens.length < 3) return null;
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
  return Math.round((sd / mean) * 1000) / 1000;
}

// ---------------------------------------------------------------------------------------------------------------
// Structural counters (ported from analyze.py `constructions`)
// ---------------------------------------------------------------------------------------------------------------

const STOP_ING = new Set(
  "thing during morning evening something nothing anything everything bring king ring sing wing spring string ceiling feeling building meeting wedding marketing advertising writing shopping training including according regarding following pending notwithstanding being".split(" "),
);

function trailingParticiples(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/,\s+([a-z]{2,}ing)\b[^.?!\n]{0,80}[.?!]/g)) if (!STOP_ING.has(m[1])) out.push(m[0]);
  return out;
}

function anaphoraTriads(sents: string[]): string[] {
  const out: string[] = [];
  let prev: string | null = null, k = 0, start = 0;
  for (let i = 0; i < sents.length; i++) {
    const fw = (sents[i].split(/\s+/)[0] ?? "").toLowerCase().replace(/^["“*']+|["”*',.:;!?]+$/g, "");
    if (fw && fw === prev) k += 1;
    else {
      k = 1;
      prev = fw;
      start = i;
    }
    if (k === 3) out.push(sents.slice(start, i + 1).join(" "));
  }
  return out;
}

function hasSpecific(text: string): boolean {
  if (/\d|[$€£%]|["“”]/.test(text)) return true;
  const toks = text.split(/\s+/);
  for (let i = 1; i < toks.length; i++) {
    if (/^[A-Z][a-z]{2,}/.test(toks[i]) && !/[.!?]$/.test(toks[i - 1]) && toks[i] !== "I") return true;
  }
  return false;
}

/** "Imagine..." / "What if..." with no specific on the next line. A lone question is the reader's to answer (rule 22). */
function unansweredOpeners(bodyUnits: Unit[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < bodyUnits.length; i++) {
    const u = bodyUnits[i];
    if (!PROSE_TYPES.has(u.type) || u.type === "testimonial") continue;
    const sents = sentences(u.text);
    if (!sents.length) continue;
    const s0 = sents[0];
    if (!/^(?:imagine|picture this|what if|wouldn['’]?t it be)\b/i.test(s0)) continue;
    const answer = sents.length > 1 ? sents.slice(1).join(" ") : (bodyUnits[i + 1]?.text ?? "");
    if (!answer || !hasSpecific(answer)) out.push(s0);
  }
  return out;
}

const CHECK_LINE_RE = /^\s*(?:[-*•]\s*)?[✓✔✅☑]/u;
const EMOJI_LINE_RE = /^\s*(?:[-*•]\s*)?(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})/u;

// ---------------------------------------------------------------------------------------------------------------
// The owner's list (§7.1): quotations, testimonials, proper nouns and the offer's own words are exempt
// ---------------------------------------------------------------------------------------------------------------

/** A quotation; a straight quote after a digit is an inch mark (6") and never opens one. */
const QUOTED_RE = /(?<!\d)"[^"\n]{1,600}"|“[^”\n]{1,600}”/g;

/**
 * Quotations of three words or more blanked to spaces (same length, so snippets stay aligned): a verbatim or quoted
 * source keeps its words. A quotation that ends a sentence leaves a period, so the next sentence still opens one.
 * Scare quotes and quoted labels ("free", "SEO expert") are the copy's own words and are scanned.
 */
export function blankQuotes(text: string): string {
  return text.replace(QUOTED_RE, (m) => {
    const inner = m.slice(1, -1);
    if (countWords(inner) < 3) return m;
    const blank = " ".repeat(m.length);
    const end = /[.!?](?=\s*$)/.exec(inner);
    return end ? blank.slice(0, 1 + end.index) + "." + blank.slice(2 + end.index) : blank;
  });
}

/** Function words: never an offer term, and never enough on their own to exempt a match. */
const STOP_WORDS = new Set(
  "a an and are as at be been but by for from has have here how in into is it its it's just more my no not of on only or our so than that the their them then there these they this those to too up very was we were what when where which who why will with you your yours".split(" "),
);

/** A crude stem, so "veneers" matches "veneer": a final "s" goes (not "ss"), and a final "'s". */
function stem(word: string): string {
  const w = word.toLowerCase().replace(/['’]s$/, "");
  return w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
}

/** Words of four letters or more from the offer's own name and product name, hyphenated parts included, function words left out: the literal words of what it sells. */
export function exemptTermsFrom(...names: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const n of names) {
    for (const w of (n ?? "").toLowerCase().match(/[a-z][a-z'’-]{2,}/g) ?? []) {
      for (const part of [w, ...w.split("-")]) if (part.length >= 4 && !STOP_WORDS.has(part)) out.add(part);
    }
  }
  return Array.from(out);
}

/** A match made only of the offer's own words ("landscape lighting" for a landscaper): one content word or more, every one an offer term. */
function offerWordsOnly(match: string, exempt: Set<string>): boolean {
  if (!exempt.size) return false;
  const words = (match.toLowerCase().match(/[a-z][a-z'’]*/g) ?? []).filter((w) => !STOP_WORDS.has(w));
  return words.length > 0 && words.every((w) => exempt.has(stem(w)));
}

/** A line set in Title Case (a headline, a subject line, an RSA asset): three in four of its longer words after the first are capitalised. */
export function isTitleCaseLine(line: string): boolean {
  const words = (line.match(/[A-Za-z][A-Za-z'’-]*/g) ?? []).slice(1).filter((w) => w.length >= 4);
  if (words.length < 2) return false;
  return words.filter((w) => /^[A-Z]/.test(w)).length / words.length >= 0.75;
}

function lineAt(text: string, index: number): { start: number; line: string } {
  const start = text.lastIndexOf("\n", index - 1) + 1;
  const end = text.indexOf("\n", index);
  return { start, line: text.slice(start, end < 0 ? text.length : end) };
}

/** Before index there is a sentence end (a period, question or exclamation mark, an ellipsis or a colon, maybe closed by a quote mark or bracket), or only list markers and punctuation on the line. */
function opensSentence(text: string, index: number): boolean {
  const { start } = lineAt(text, index);
  const prefix = text.slice(start, index).replace(/^\s*(?:[-*•–]|\d+[.)])\s*/, "");
  if (!/[\p{L}\p{N}]/u.test(prefix)) return true;
  return /[.!?…:]["”’)\]]*$/.test(text.slice(0, index).replace(/\s+$/, ""));
}

const PRONOUN_I = /^I(?:['’](?:m|d|ll|ve|re))?$/;

/**
 * A capitalised word inside a match that does not open a sentence makes the match a proper noun ("the Realm app",
 * "Masters of the Universe"), not the word. Capitals say nothing about names in a Title Case or all-caps line, and an
 * all-caps word ("ROBUST", "IMHO") is never a name here.
 */
function isProperNoun(text: string, index: number, match: string): boolean {
  const { line } = lineAt(text, index);
  if (isTitleCaseLine(line) || line === line.toUpperCase()) return false;
  for (const w of match.matchAll(/[A-Za-z][A-Za-z'’]*/g)) {
    const word = w[0];
    if (!/^[A-Z]/.test(word) || PRONOUN_I.test(word) || (word.length > 1 && word === word.toUpperCase())) continue;
    if (!opensSentence(text, index + (w.index ?? 0))) return true;
  }
  return false;
}

/** The sentence holding a match, and the part of it before the match. */
function sentenceAround(text: string, start: number, end: number): { sentence: string; before: string } {
  let s = 0;
  for (const p of ["\n", ".", "!", "?"]) s = Math.max(s, text.lastIndexOf(p, start - 1) + 1);
  let e = text.length;
  for (const p of ["\n", ".", "!", "?"]) {
    const i = text.indexOf(p, end);
    if (i >= 0 && i < e) e = i;
  }
  return { sentence: text.slice(s, e), before: text.slice(s, start) };
}

const SOUND_RE = /\b\d+(?:\.\d+)?\s?(?:dB|dBA|decibels?)\b|\b(?:noise|noisy|loud|louder|silent|silence|sound|hear|heard|whisper(?:s|ing)?|hum(?:s|ming)?|decibels?|rattles?|squeak(?:s|y)?)\b/i;
const PERSON_BEFORE_RE = /\b(?:kids?|child(?:ren)?|boys?|girls?|bab(?:y|ies)|toddlers?|guests?|people|staff|everyone|anyone|someone|he|she|they|we|you|I|dogs?|cats?|pets?|actors?|dancers?|models?|students?|fans?|members?|attendees?|men|women|man|woman|players?|cast|crew|volunteers?|customers?|visitors?)\s+(?:[a-z]+\s+){0,2}$/i;
const MATERIAL_RE = /\b(?:porcelain|ceramic|composite|wood(?:en)?|oak|walnut|maple|cherry|teak|vinyl|leather|silicone|rubber|plastic|foil|paper|tissue|stone|marble|granite|quartz|metal|steel|alumini?um|brass|copper|glass|resin|laminate|acrylic|chocolate|sugar|pastry|gift|ribbon|bubble wrap)\b/i;

/** Matches in the literal sense, not the tell: "runs quietly at 24 dB" is about sound; "kids dressed as superheroes" and "a porcelain veneer" are what they say. */
const LITERAL_SENSE: Record<string, (sentence: string, match: string, before: string) => boolean> = {
  quietly: (sentence) => SOUND_RE.test(sentence),
  disguise_frame: (sentence, match, before) =>
    (/\b(?:costumes?|dress(?:ed|es|ing)|wear(?:ing|s)?|wore)\b/i.test(match) && PERSON_BEFORE_RE.test(before)) ||
    (/\b(?:veneer|skin|wrapper|wrapped)\b/i.test(match) && MATERIAL_RE.test(sentence)),
};

/** Owner rules other than tells 11-13 (em dash, emoji, hashtag) leave quotations and testimonials alone. */
function quoteExempt(rule: TellRule): boolean {
  return !!rule.owner && !((rule.owner.tell ?? 0) >= 11);
}

interface OwnerHits {
  hit: Hit;
  /** hits per scanned text, for the per-piece stack */
  perText: number[];
}

/**
 * Scan the owner's regex rules in table order. A span one rule has counted is not counted again by a later rule, so
 * "Here's the hard truth:" is one tell, not two. Words skip proper nouns; every rule skips matches made only of the
 * offer's own words and matches in their literal sense.
 */
function scanOwnerRules(rules: TellRule[], texts: string[], exempt: Set<string>, originals: string[]): Map<string, OwnerHits> {
  const claimed: [number, number][][] = texts.map(() => []);
  const out = new Map<string, OwnerHits>();
  for (const rule of rules) {
    const hit: Hit = { rule, count: 0, examples: [] };
    const perText = texts.map(() => 0);
    const re = new RegExp(rule.regex!.source, rule.regex!.flags.includes("g") ? rule.regex!.flags : rule.regex!.flags + "g");
    texts.forEach((t, ti) => {
      for (const m of t.matchAll(re)) {
        const lead = m[0].replace(/^[\s.!?:]+/, "").trimEnd();
        if (!lead) continue;
        const at = (m.index ?? 0) + m[0].indexOf(lead);
        const end = at + lead.length;
        if (rule.owner?.words && isProperNoun(t, at, lead)) continue;
        if (offerWordsOnly(lead, exempt)) continue;
        const literal = LITERAL_SENSE[rule.name];
        if (literal) {
          const { sentence, before } = sentenceAround(t, at, end);
          if (literal(sentence, lead, before)) continue;
        }
        if (claimed[ti].some(([s, e]) => at < e && s < end)) continue;
        claimed[ti].push([at, end]);
        perText[ti] += 1;
        hit.count += 1;
        if (hit.examples.length < 3) hit.examples.push(snippet(originals[ti] ?? t, at, lead.length));
      }
    });
    out.set(rule.name, { hit, perText });
  }
  return out;
}

const INSTRUCTION_START = /^(?:click|tap|call|read|open|get|grab|try|go|watch|see|join|book|reply|comment|hit|start|check|look|sign|download|scroll|send|text|e-?mail|visit|order|claim|pick|choose|write|count|ask|tell|keep|stop|take|use|put|find|add|make|do|don['’]t|let|please|contact|follow|subscribe|register|reach out|learn|discover|explore|as always)\b/i;
/** "..., okay?" and "..., right?" check in with the reader; they are not a question the copy then answers. */
const TAG_QUESTION = /,\s*(?:okay|ok|right|huh|eh|yes|no|yeah|see|got it)\?+$/i;
/** The buyer's own question in the first person ("Can I cancel?", "What if I hate it?"): objection handling, not the tell. */
const BUYER_FIRST_PERSON = /\b(?:I|I['’](?:m|d|ll|ve)|my|me|mine)\b/;
/** A question put to the reader ("Ready?", "Want the list?", "How many of your posts rank?"). */
const READER_DIRECTED = /\byou(?:r|rs|['’](?:re|ve|d|ll))?\b|^(?:ready|interested|curious|need|prefer|new to|looking for|still (?:here|with me|reading)|want|sound (?:good|fair)|make sense|deal|agreed|questions)\b/i;

/** The copy asks and answers itself: "The result? More sales." "Why? Because..." "The fix? Use the score as a filter." */
function selfAnswered(q: string, a: string): boolean {
  if (!q.endsWith("?") || a.endsWith("?") || countWords(a) === 0 || a.startsWith("(")) return false;
  const qWords = countWords(q);
  if (qWords > 7 || TAG_QUESTION.test(q) || BUYER_FIRST_PERSON.test(q)) return false;
  // a question to the reader followed by what to do is a call to action ("Ready? Click below.")
  if (READER_DIRECTED.test(q) && INSTRUCTION_START.test(a)) return false;
  if (qWords <= 4 || /^because\b/i.test(a)) return true;
  return countWords(a) <= 20;
}

/** Sentences of a text, linear on runs with no sentence punctuation. */
function sentencesOf(text: string): string[] {
  return (text.replace(/\n+/g, " ").match(/[^.?!]+(?:[.?!]+|$)/g) ?? []).map((x) => x.trim()).filter(Boolean);
}

/**
 * Self-answered questions, per unit: a question of seven words or fewer answered by the next statement in the same
 * text, or a question that is a whole paragraph answered by the next paragraph of its section. FAQ sections and
 * roles are the buyer's questions and are skipped.
 */
function selfAnsweredQuestions(units: { text: string; kind: UnitKind; sectionId: string; faq: boolean }[]): { found: string[]; perText: number[] } {
  const found: string[] = [];
  const perText = units.map(() => 0);
  units.forEach((u, i) => {
    if (u.faq) return;
    const sents = sentencesOf(u.text);
    for (let k = 0; k + 1 < sents.length; k++) {
      if (selfAnswered(sents[k], sents[k + 1])) {
        found.push(`${sents[k]} ${sents[k + 1]}`);
        perText[i] += 1;
      }
    }
    const next = units[i + 1];
    if (sents.length === 1 && u.kind !== "display" && next && next.kind !== "display" && !next.faq && next.sectionId === u.sectionId) {
      const a = sentencesOf(next.text)[0] ?? "";
      if (selfAnswered(sents[0], a)) {
        found.push(`${sents[0]} ${a}`);
        perText[i] += 1;
      }
    }
  });
  return { found, perText };
}

// ---------------------------------------------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------------------------------------------

interface Hit {
  rule: TellRule;
  count: number;
  examples: string[];
  groups?: Record<string, string[]>;
}

function snippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + length + 50);
  let s = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) s = "…" + s;
  if (end < text.length) s = s + "…";
  return s.length > 160 ? s.slice(0, 157) + "…" : s;
}

function scanRegex(rule: TellRule, texts: string[]): Hit {
  const hit: Hit = { rule, count: 0, examples: [] };
  if (!rule.regex) return hit;
  for (const t of texts) {
    const re = new RegExp(rule.regex.source, rule.regex.flags.includes("g") ? rule.regex.flags : rule.regex.flags + "g");
    for (const m of t.matchAll(re)) {
      hit.count += 1;
      if (hit.examples.length < 3) hit.examples.push(snippet(t, m.index ?? 0, m[0].length));
    }
  }
  return hit;
}

function trimExamples(items: string[]): string[] {
  return items.slice(0, 3).map((i) => (i.length > 160 ? i.slice(0, 157) + "…" : i));
}

export interface TellFlagOut {
  tier: Tier;
  tell: string;
  weight: number;
  count: number;
  examples: string[];
  fix: string;
}

/**
 * The piece a unit belongs to, for the owner's stack: the whole draft, or in a multi-item format one item (an email
 * of a sequence) or one fixed asset (an RSA headline).
 */
function pieceOf(u: Unit, spec: FormatSpec): string {
  if (!spec.multi_item) return "piece";
  return u.item > 0 ? `item:${u.item}` : `section:${u.sectionId}`;
}

/** Run every rule over the units; returns flags (with allowances and density thresholds applied) and the score. */
function detectTells(units: Unit[], spec: FormatSpec, words: number, exemptTerms: string[] = []): { flags: TellFlagOut[]; score: number; tier0: TellFlagOut[]; owner: number; ownerStack: number } {
  const ov = FORMAT_OVERRIDES[spec.id] ?? {};
  const allTexts = units.map((u) => u.text);
  // the owner's patterns and words skip quotations and testimonials (their words are kept as given)
  const ownerUnits = units.filter((u) => u.type !== "testimonial");
  const ownerTexts = ownerUnits.map((u) => blankQuotes(u.text));
  const ownerOriginals = ownerUnits.map((u) => u.text);
  const exempt = new Set(exemptTerms.map(stem));
  const ownerScan = scanOwnerRules(TELLS.filter((r) => quoteExempt(r) && r.regex), ownerTexts, exempt, ownerOriginals);
  const questions = selfAnsweredQuestions(ownerUnits.map((u, i) => ({ ...u, text: ownerTexts[i] })));
  const ownerPerText = new Map<string, number[]>([...Array.from(ownerScan, ([name, o]) => [name, o.perText] as [string, number[]]), ["self_answered_question", questions.perText]]);
  const pieces = ownerUnits.map((u) => pieceOf(u, spec));
  const bodyTexts = units.filter((u) => u.kind !== "display").map((u) => u.text);
  const paragraphTexts = units.filter((u) => u.kind === "body" && u.type === "paragraph").map((u) => u.text);
  const hedgeTexts = units.filter((u) => u.kind !== "display" && u.type !== "testimonial" && u.type !== "disclosure").map((u) => u.text);
  const bodyUnits = units.filter((u) => u.kind !== "display");
  const proseText = bodyUnits.map((u) => u.text).join("\n");
  const proseSentences = sentences(proseText);

  const hits: Hit[] = [];
  for (const rule of TELLS) {
    let hit: Hit;
    switch (rule.name) {
      case "hedge":
        hit = scanRegex(rule, hedgeTexts);
        break;
      case "em_dash": {
        const link = new RegExp(LINK_SOURCE, "gi");
        hit = scanRegex(rule, allTexts.map((t) => t.replace(link, (m) => " ".repeat(m.length))));
        break;
      }
      case "self_answered_question":
        hit = { rule, count: questions.found.length, examples: trimExamples(questions.found) };
        break;
      case "self_posed_question_header": {
        hit = scanRegex(rule, bodyTexts);
        const qHeads = units.filter((u) => (u.type === "crosshead" || u.type === "deck") && /\?\s*$/.test(u.text)).map((u) => u.text);
        hit.count += qHeads.length;
        hit.examples = trimExamples([...hit.examples, ...qHeads]);
        break;
      }
      case "trailing_participle": {
        const found = trailingParticiples(proseText);
        hit = { rule, count: found.length, examples: trimExamples(found) };
        break;
      }
      case "anaphora_triad": {
        const found = anaphoraTriads(proseSentences);
        hit = { rule, count: found.length, examples: trimExamples(found) };
        break;
      }
      case "unanswered_opener": {
        const found = unansweredOpeners(bodyUnits);
        hit = { rule, count: found.length, examples: trimExamples(found) };
        break;
      }
      case "markdown_list_in_paragraph": {
        const found: string[] = [];
        for (const t of paragraphTexts) {
          let inRun = false;
          for (const line of t.split("\n")) {
            const isList = /^\s*(?:[-*•]|\d+[.)])\s+\S/.test(line);
            if (isList && !inRun) found.push(line);
            inRun = isList;
          }
        }
        hit = { rule, count: found.length, examples: trimExamples(found) };
        break;
      }
      default:
        hit = ownerScan.get(rule.name)?.hit ?? scanRegex(rule, rule.scope === "paragraph" ? paragraphTexts : rule.scope === "body" ? bodyTexts : allTexts);
    }
    hits.push(hit);
  }

  const flags: TellFlagOut[] = [];
  const tier0: TellFlagOut[] = [];
  const weightByTier: Record<Tier, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  let owner = 0;
  const ownerNames = new Set(TELLS.filter((t) => t.owner).map((t) => t.name));
  // the owner's Tier 1 hits per piece: two or more in one piece are the stack
  const stackByPiece = new Map<string, number>();
  const push = (f: TellFlagOut) => {
    flags.push(f);
    weightByTier[f.tier] += f.weight * f.count;
    if (f.tier === 0) tier0.push(f);
    if (ownerNames.has(f.tell)) owner += f.count;
  };

  for (const h of hits) {
    const r = h.rule;
    let count = h.count;
    if (count === 0) continue;
    if (ov.exempt?.includes(r.name)) continue;
    if (r.name === "markdown_heading" && spec.allow_markdown_headings) continue;

    const perText = r.tier === 1 ? ownerPerText.get(r.name) : undefined;
    if (perText) {
      // free hits are per piece ("one buzzword is not a pile" holds for each email of a sequence)
      const byPiece = new Map<string, number>();
      perText.forEach((n, i) => n && byPiece.set(pieces[i], (byPiece.get(pieces[i]) ?? 0) + n));
      count = 0;
      for (const [piece, n] of byPiece) {
        const excess = n - (r.free_hits ?? 0);
        if (excess <= 0) continue;
        count += excess;
        stackByPiece.set(piece, (stackByPiece.get(piece) ?? 0) + excess);
      }
      if (count <= 0) continue;
      push({ tier: r.tier, tell: r.name, weight: r.weight, count, examples: h.examples, fix: r.fix });
      continue;
    }

    if (r.name === "bold_leadin_bullet" && ov.bold_leadins) count -= ov.bold_leadins;
    if (r.name === "stay_with_me" && ov.keep_watching) count -= ov.keep_watching;
    if (r.free_hits) count -= r.free_hits;
    if (count <= 0) continue;

    const threshold = densityThreshold(r, spec);
    const excess = threshold === undefined ? count : count - densityAllowance(threshold, words);
    if (excess <= 0) continue;
    push({ tier: r.tier, tell: r.name, weight: r.weight, count: excess, examples: h.examples, fix: r.fix });
  }

  // Tier 3 never scores alone.
  const raw = weightByTier[0] + weightByTier[1] + weightByTier[2] + (weightByTier[1] + weightByTier[2] > 0 ? weightByTier[3] : 0);
  const score = Math.round((raw * 300 / Math.max(words, SCORE_FLOOR_WORDS)) * 100) / 100;
  flags.sort((a, b) => a.tier - b.tier || b.weight * b.count - a.weight * a.count || a.tell.localeCompare(b.tell));
  return { flags, score, tier0, owner, ownerStack: Math.max(0, ...stackByPiece.values()) };
}

// ---------------------------------------------------------------------------------------------------------------
// Format hard gates
// ---------------------------------------------------------------------------------------------------------------

export type GateOp = "<=" | ">=" | "<" | ">" | "==" | "!=";
export interface ParsedGate {
  raw: string;
  scope: string;
  metric: string;
  op: GateOp | null;
  value: number | null;
}

/** Grammar: `scope.metric<op>number` (op in <= >= < > == !=) or `scope.flag` for a boolean metric that must be true. */
export function parseGate(raw: string): ParsedGate | null {
  const m = /^([a-z_]+)\.([a-z_][a-z0-9_]*)\s*(?:(<=|>=|==|!=|<|>)\s*(-?\d+(?:\.\d+)?))?$/.exec(raw.trim());
  if (!m) return null;
  return { raw, scope: m[1], metric: m[2], op: (m[3] as GateOp | undefined) ?? null, value: m[4] !== undefined ? Number(m[4]) : null };
}

interface MetricCtx {
  sections: Section[];      // the item's sections (or all sections for aggregate metrics)
  all: Section[];           // every section of the draft
  spec: FormatSpec;
}
type MetricValue = number | boolean | null;
interface MetricDef {
  kind: "item" | "aggregate" | "advisory";
  note: string;
  /** True when the metric is meaningful on raw paragraphs (no block types); analyzeText evaluates only these. */
  text?: boolean;
  compute: (c: MetricCtx) => MetricValue;
}

const URL_RE = /https?:\/\/[^\s)\]]+|www\.[^\s)\]]+|\b[a-z0-9-]+\.(?:com|co|io|net|org|ai|app|me|us)\b(?:\/[^\s)\]]*)?/gi;
const MD_LINK_RE = /\[[^\]\n]+\]\((?:https?:\/\/)?[^)\s]+\)/g;
const LINK_BLOCKS = new Set<Block["type"]>(["cta", "button"]);
const SPOKEN_EXCLUDED = new Set<Block["type"]>(["caption", "label", "disclosure", "subject", "preview", "button", "field", "headline", "deck", "preheadline", "crosshead"]);

function blocks(sections: Section[]): { block: Block; section: Section }[] {
  const out: { block: Block; section: Section }[] = [];
  for (const s of sections) for (const b of s.blocks) out.push({ block: b, section: s });
  return out;
}
function textOf(b: Block): string {
  return [clean(b.text), ...(b.items ?? []).map(clean)].filter(Boolean).join("\n");
}
function wordsIn(bs: { block: Block }[]): number {
  return bs.reduce((n, { block }) => n + countWords(textOf(block)), 0);
}
function urlsIn(text: string): number {
  const md = (text.match(MD_LINK_RE) ?? []).length;
  const rest = text.replace(MD_LINK_RE, " ");
  return md + (rest.match(URL_RE) ?? []).length;
}
function linksIn(sections: Section[]): number {
  let n = 0;
  for (const { block } of blocks(sections)) {
    if (LINK_BLOCKS.has(block.type)) n += 1;
    else n += urlsIn(textOf(block));
  }
  return n;
}
function maxChars(bs: { block: Block }[]): number | null {
  if (!bs.length) return null;
  return Math.max(...bs.map(({ block }) => clean(block.text).length));
}
function field(b: Block): string | undefined {
  return b.meta?.platform_field;
}
function inBase(s: Section, ...bases: string[]): boolean {
  return bases.includes(sectionBaseId(s.section_id));
}
function headlineBlocks(sections: Section[]) {
  return blocks(sections).filter(({ block }) => block.type === "headline" || field(block) === "headline");
}
function descriptionBlocks(sections: Section[]) {
  return blocks(sections).filter(({ block, section }) => field(block) === "description" || (inBase(section, "description", "descriptions") && (block.type === "paragraph" || block.type === "deck")));
}
function emojiBulletCount(sections: Section[]): number {
  let n = 0;
  for (const { block } of blocks(sections)) {
    for (const i of block.items ?? []) if (CHECK_LINE_RE.test(clean(i)) || EMOJI_LINE_RE.test(clean(i))) n += 1;
    if (!DISPLAY_TYPES.has(block.type)) for (const line of clean(block.text).split("\n")) if (CHECK_LINE_RE.test(line) || EMOJI_LINE_RE.test(line)) n += 1;
  }
  return n;
}
function itemIndexes(sections: Section[]): Set<number> {
  return new Set(sections.map((s) => sectionItemIndex(s.section_id)));
}
function distinctItems(sections: Section[]): number {
  return sections.length ? itemIndexes(sections).size : 0;
}
function normalise(t: string): string {
  return clean(t).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Every metric a hard gate may name. `item` metrics run per item (any failing item fails the gate); `aggregate` over the draft; `advisory` ones are model-judged and skipped here. */
export const GATE_METRICS: Record<string, MetricDef> = {
  // size
  chars: { kind: "item", text: true, note: "characters of all copy, blocks joined by newlines", compute: (c) => blocks(c.sections).map(({ block }) => textOf(block)).filter(Boolean).join("\n").length },
  words: { kind: "item", text: true, note: "words excluding subject and preview blocks", compute: (c) => wordsIn(blocks(c.sections).filter(({ block }) => block.type !== "subject" && block.type !== "preview")) },
  spoken_words: { kind: "item", text: true, note: "words in spoken blocks (no captions, labels, buttons, headings)", compute: (c) => wordsIn(blocks(c.sections).filter(({ block }) => !SPOKEN_EXCLUDED.has(block.type))) },
  spot_words: { kind: "aggregate", note: "words in the `spot` section", compute: (c) => wordsIn(blocks(c.all.filter((s) => inBase(s, "spot")))) },
  words_outside_recap: { kind: "item", note: "words outside the `recap` section, field blocks excluded", compute: (c) => wordsIn(blocks(c.sections.filter((s) => !inBase(s, "recap"))).filter(({ block }) => block.type !== "field")) },
  sentences: { kind: "item", text: true, note: "sentence count over all copy", compute: (c) => sentences(blocks(c.sections).map(({ block }) => textOf(block)).join("\n\n")).length },
  subject_chars: { kind: "item", note: "longest subject block", compute: (c) => maxChars(blocks(c.sections).filter(({ block }) => block.type === "subject")) },
  subject_words: { kind: "item", note: "most words in a subject block", compute: (c) => { const s = blocks(c.sections).filter(({ block }) => block.type === "subject"); return s.length ? Math.max(...s.map(({ block }) => countWords(clean(block.text)))) : null; } },
  headline_chars: { kind: "item", note: "longest headline block (or platform_field=headline)", compute: (c) => maxChars(headlineBlocks(c.sections)) },
  description_chars: { kind: "item", note: "longest description (platform_field=description or paragraphs in `descriptions`)", compute: (c) => maxChars(descriptionBlocks(c.sections)) },
  primary_text_chars: { kind: "item", note: "characters of the first block of each `primary_text` section (the text above the fold)", compute: (c) => {
    const vals: number[] = [];
    for (const s of c.sections) {
      const bs = s.blocks.filter((b) => inBase(s, "primary_text") || field(b) === "primary_text");
      if (bs.length) vals.push(textOf(bs[0]).length);
    }
    return vals.length ? Math.max(...vals) : null;
  } },
  // counts
  links: { kind: "item", text: true, note: "cta and button blocks plus URLs in other text", compute: (c) => linksIn(c.sections) },
  email_one_links: { kind: "aggregate", text: true, note: "links in the lowest-indexed item (email one)", compute: (c) => { const idx = Math.min(...itemIndexes(c.all)); return linksIn(c.all.filter((s) => sectionItemIndex(s.section_id) === idx)); } },
  body_urls: { kind: "item", text: true, note: "URLs in text outside the `first_comment` section", compute: (c) => blocks(c.sections.filter((s) => !inBase(s, "first_comment"))).reduce((n, { block }) => n + urlsIn(textOf(block)), 0) },
  questions: { kind: "item", text: true, note: "question marks outside subject blocks", compute: (c) => blocks(c.sections).filter(({ block }) => block.type !== "subject").reduce((n, { block }) => n + (textOf(block).match(/\?/g) ?? []).length, 0) },
  cta_count: { kind: "item", note: "cta and button blocks", compute: (c) => blocks(c.sections).filter(({ block }) => LINK_BLOCKS.has(block.type)).length },
  presentation_ctas: { kind: "aggregate", note: "cta and button blocks in `presentation_*` sections", compute: (c) => blocks(c.all.filter((s) => sectionBaseId(s.section_id).startsWith("presentation_"))).filter(({ block }) => LINK_BLOCKS.has(block.type)).length },
  replay_emails: { kind: "aggregate", note: "distinct items among `replay_email` sections", compute: (c) => distinctItems(c.all.filter((s) => inBase(s, "replay_email"))) },
  emails: { kind: "aggregate", note: "distinct items in the draft", compute: (c) => distinctItems(c.all) },
  variations: { kind: "aggregate", note: "distinct items in the draft", compute: (c) => distinctItems(c.all) },
  items: { kind: "aggregate", note: "distinct items in the draft", compute: (c) => distinctItems(c.all) },
  headline_count: { kind: "aggregate", note: "headline blocks", compute: (c) => headlineBlocks(c.all).length },
  description_count: { kind: "aggregate", note: "description blocks", compute: (c) => descriptionBlocks(c.all).length },
  fields: { kind: "item", note: "field blocks", compute: (c) => blocks(c.sections).filter(({ block }) => block.type === "field").length },
  bullet_items: { kind: "item", note: "items across bullets blocks", compute: (c) => blocks(c.sections).filter(({ block }) => block.type === "bullets").reduce((n, { block }) => n + (block.items ?? []).length, 0) },
  benefit_bullets: { kind: "item", note: "bullet items in `bullets` or `benefits` sections", compute: (c) => blocks(c.sections.filter((s) => inBase(s, "bullets", "benefits"))).filter(({ block }) => block.type === "bullets").reduce((n, { block }) => n + (block.items ?? []).length, 0) },
  emoji_bullets: { kind: "item", text: true, note: "bullet items or lines opening with an emoji or check mark", compute: (c) => emojiBulletCount(c.sections) },
  plans: { kind: "aggregate", note: "price blocks in `plans`/`plan` sections", compute: (c) => blocks(c.all.filter((s) => inBase(s, "plans", "plan"))).filter(({ block }) => block.type === "price").length },
  // shares
  close_share: { kind: "item", note: "words in `close` sections over all words", compute: (c) => { const total = wordsIn(blocks(c.sections)); return total ? wordsIn(blocks(c.sections.filter((s) => inBase(s, "close")))) / total : null; } },
  price_position_share: { kind: "item", note: "words before the first price block over all words", compute: (c) => {
    const bs = blocks(c.sections);
    const i = bs.findIndex(({ block }) => block.type === "price");
    if (i < 0) return null;
    const total = wordsIn(bs);
    return total ? wordsIn(bs.slice(0, i)) / total : null;
  } },
  // booleans
  no_markdown_headings: { kind: "item", text: true, note: "no paragraph or bullet text line starts with #", compute: (c) => !blocks(c.sections).some(({ block }) => !DISPLAY_TYPES.has(block.type) && /^\s{0,3}#{1,6}\s+\S/m.test(textOf(block))) },
  no_submit_button: { kind: "item", note: "no button reads \"Submit\"", compute: (c) => !blocks(c.sections).some(({ block }) => block.type === "button" && /^\W*submit\W*$/i.test(clean(block.text))) },
  no_coupon_field: { kind: "item", note: "no field names a coupon or promo code", compute: (c) => !blocks(c.sections).some(({ block }) => block.type === "field" && /coupon|promo|discount code/i.test(clean(block.text))) },
  has_price: { kind: "item", text: true, note: "a currency amount appears", compute: (c) => /[$€£]\s?\d|\d\s?(?:USD|EUR|GBP|dollars)\b/i.test(blocks(c.sections).map(({ block }) => textOf(block)).join("\n")) },
  stop_wording: { kind: "item", text: true, note: "the word STOP appears (carrier opt-out)", compute: (c) => /\bSTOP\b/.test(blocks(c.sections).map(({ block }) => textOf(block)).join("\n")) },
  no_dollar_off: { kind: "item", text: true, note: "no \"$X off\"", compute: (c) => !/[$€£]\s?\d[\d,.]*\s*off\b/i.test(blocks(c.sections).map(({ block }) => textOf(block)).join("\n")) },
  decline_present: { kind: "item", note: "a plain No link: a block in `no_link` or text starting \"No thanks\"", compute: (c) => blocks(c.sections).some(({ block, section }) => (inBase(section, "no_link") && clean(block.text).length > 0) || /^no[,.!]?\s+(?:thanks|thank you)/i.test(clean(block.text))) },
  ftc_label: { kind: "item", note: "a label or disclosure block reading Ad, Advertisement or Paid Advertisement", compute: (c) => blocks(c.sections).some(({ block }) => (block.type === "label" || block.type === "disclosure") && /^\W*(?:ad|advertisement|paid advertisement)\W*$/i.test(clean(block.text))) },
  not_only_contact_us: { kind: "item", note: "at least one cta or button that is not \"Contact us/sales\"", compute: (c) => { const ctas = blocks(c.sections).filter(({ block }) => LINK_BLOCKS.has(block.type)); return ctas.length ? ctas.some(({ block }) => !/contact (?:us|sales)|talk to sales/i.test(clean(block.text))) : null; } },
  no_duplicate_headlines: { kind: "aggregate", note: "headline texts are distinct after normalisation", compute: (c) => { const hs = headlineBlocks(c.all).map(({ block }) => normalise(block.text)); return new Set(hs).size === hs.length; } },
  no_all_caps_headlines: { kind: "aggregate", note: "no headline of two or more words set entirely in capitals", compute: (c) => !headlineBlocks(c.all).some(({ block }) => { const t = clean(block.text); return countWords(t) >= 2 && /[A-Z]/.test(t) && t === t.toUpperCase(); }) },
  no_exclamation_headlines: { kind: "aggregate", note: "no exclamation mark in a headline (platform policy)", compute: (c) => !headlineBlocks(c.all).some(({ block }) => clean(block.text).includes("!")) },
  // model-judged; listed so specs may name them, skipped here
  single_idea: { kind: "advisory", note: "one idea per email: judged by the editorial reviewer", compute: () => null },
  speaker_by_word: { kind: "advisory", note: "speaker identified by word 150: judged by the editorial reviewer", compute: () => null },
};

export interface GateOutcome {
  gate: string;
  /** true passed, false failed, null not computable here (advisory or no matching blocks). */
  ok: boolean | null;
  actual: MetricValue[];
  note: string;
}

function compare(actual: MetricValue, op: GateOp | null, value: number | null): boolean | null {
  if (actual === null) return null;
  if (op === null) return actual === true;
  if (typeof actual !== "number" || value === null) return null;
  switch (op) {
    case "<=": return actual <= value;
    case ">=": return actual >= value;
    case "<": return actual < value;
    case ">": return actual > value;
    case "==": return actual === value;
    case "!=": return actual !== value;
  }
}

function fmt(v: MetricValue): string {
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v);
}

/**
 * Evaluate the spec's hard gates. Unknown or advisory gates are reported with ok=null and never fail the draft.
 * With `textOnly`, metrics that need block types (cta, field, price, headline...) are skipped as well.
 */
export function evaluateGates(sections: Section[], spec: FormatSpec, opts: { textOnly?: boolean } = {}): { failures: string[]; outcomes: GateOutcome[] } {
  const outcomes: GateOutcome[] = [];
  const failures: string[] = [];
  const byItem = new Map<number, Section[]>();
  for (const s of sections) {
    const i = sectionItemIndex(s.section_id);
    byItem.set(i, [...(byItem.get(i) ?? []), s]);
  }
  const items = [...byItem.entries()].sort((a, b) => a[0] - b[0]);

  for (const raw of spec.hard_gates) {
    const g = parseGate(raw);
    if (!g) {
      outcomes.push({ gate: raw, ok: null, actual: [], note: "unparseable gate" });
      continue;
    }
    const def = GATE_METRICS[g.metric];
    if (!def) {
      outcomes.push({ gate: raw, ok: null, actual: [], note: "unknown metric" });
      continue;
    }
    if (def.kind === "advisory" || (opts.textOnly && !def.text)) {
      outcomes.push({ gate: raw, ok: null, actual: [], note: def.kind === "advisory" ? def.note : "needs block structure; skipped on raw text" });
      continue;
    }
    const targets = def.kind === "aggregate" ? [sections] : items.map(([, ss]) => ss);
    const actual: MetricValue[] = [];
    let ok: boolean | null = null;
    for (const target of targets) {
      const v = def.compute({ sections: target, all: sections, spec });
      actual.push(v);
      const r = compare(v, g.op, g.value);
      if (r === false) ok = false;
      else if (r === true && ok === null) ok = true;
    }
    outcomes.push({ gate: raw, ok, actual, note: def.note });
    if (ok === false) failures.push(`${raw} (actual ${actual.filter((v) => v !== null).map(fmt).join(", ")})`);
  }
  return { failures, outcomes };
}

// ---------------------------------------------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------------------------------------------

export function analyzeDraft(sections: Section[], spec: FormatSpec, opts: { textOnly?: boolean; exemptTerms?: string[] } = {}): MechanicalReport {
  const units = unitsOf(sections);
  const wordCountAll = draftWordCount({ sections });
  const allText = units.map((u) => u.text).join("\n\n");
  const words = countWords(allText);
  const proseText = units.filter((u) => u.kind !== "display").map((u) => u.text).join("\n\n");

  const { flags, score, tier0, owner, ownerStack } = detectTells(units, spec, words, opts.exemptTerms ?? []);
  const gates = evaluateGates(sections, spec, opts);

  const cadence_cv = sentenceLengthCV(proseText);
  const cadence_flag = words >= 300 && cadence_cv !== null && cadence_cv < spec.cadence_floor_cv;
  const and_then_count = (allText.match(/\band then\b/gi) ?? []).length;

  const hard_fail_reasons: string[] = [];
  for (const t of tier0) hard_fail_reasons.push(`tier0:${t.tell} x${t.count}`);
  // Tier 0 owner tells already fail on their own; the stack is about the Tier 1 patterns and words, per piece
  if (ownerStack >= OWNER_STACK) hard_fail_reasons.push(`owner_stack: ${ownerStack} of the owner's tells or words in one piece (§7.1)`);
  if (score >= TELL_THRESHOLDS.hard_fail) hard_fail_reasons.push(`tell_score ${score} >= ${TELL_THRESHOLDS.hard_fail} per 300 words`);
  for (const g of gates.failures) hard_fail_reasons.push(`gate:${g}`);

  return {
    tell_score_per_300: score,
    flags,
    hard_fail: hard_fail_reasons.length > 0,
    hard_fail_reasons,
    fk_grade: fleschKincaidGrade(proseText),
    cadence_cv,
    cadence_flag,
    and_then_count,
    format_gate_failures: gates.failures,
    word_count: wordCountAll,
    owner_tells: owner,
  };
}

/** Raw text (ledger tags are stripped here) treated as a run of paragraphs; only text-computable gates are evaluated. */
export function analyzeText(text: string, opts: { format: FormatSpec; exemptTerms?: string[] }): MechanicalReport {
  return analyzeDraft(textToSections(text), opts.format, { textOnly: true, exemptTerms: opts.exemptTerms });
}

/** Paragraphs split on blank lines become paragraph blocks of one `body` section. */
export function textToSections(text: string): Section[] {
  const paras = clean(text).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return [{
    section_id: "body",
    title: null,
    blocks: paras.map((p, i) => ({ id: `p${i + 1}`, type: "paragraph" as const, text: p, items: null, meta: null })),
  }];
}
