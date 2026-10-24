/**
 * Mechanical review: the tiered AI-tell detector and the format hard gates. Pure code, no model call.
 *
 * Ported from research/tells/analyze.py (the regexes and the structural counters) and shaped by
 * docs/04-copy-standard.md §7: Tier 0 hard rejects, Tier 1 weight 4, Tier 2 weight 2 by density per 1,000 words,
 * Tier 3 weight 1 and never alone. Score = sum of weights per 300 words; review flag at 6, hard fail at 10 or any
 * Tier 0 hit. The non-tells in §7 are never scanned: exclamation marks, ellipses, ALL CAPS, fragments,
 * "Here's what / how / why", "Dear Friend", "P.S.", em dashes.
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

export interface TellRule {
  tier: Tier;
  name: string;
  /** Null for rules computed structurally in code (listed so the admin UI can display them). */
  regex: RegExp | null;
  weight: number;
  example: string;
  fix: string;
  /** Tier 2 only: flag when hits per 1,000 words exceed this. 0 means any hit is flagged. */
  density_per_1000?: number;
  /** Where the rule is scanned: every block; body prose and bullet items; paragraph blocks only; or code. */
  scope: TellScope;
  note?: string;
}

export const TIER_WEIGHT: Record<Tier, number> = { 0: 10, 1: 4, 2: 2, 3: 1 };
export const TELL_THRESHOLDS = { flag: 6, hard_fail: 10 } as const;
/** Scores are normalised per 300 words; copy shorter than this is scored as if it were this long. */
export const SCORE_FLOOR_WORDS = 300;
/** Density thresholds are per 1,000 words; copy shorter than this uses this denominator so one hit in an SMS is not a density. */
export const DENSITY_FLOOR_WORDS = 500;

const A = "['’]?"; // optional straight or curly apostrophe

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
    note: "Any bracketed word, XXX, blanks or bare numbers. Ledger tags [[L:id]], [[NEEDS SOURCE]] and markdown links are excluded; timestamps like [0:12] are not matched.",
  },
  {
    tier: 0, name: "bold_label_colon", weight: 10, scope: "body",
    regex: /\*\*[^*\n]{1,45}:\*\*|\*\*[^*\n]{1,45}\*\*\s*:|__[^_\n]{1,45}:__/g,
    example: "**Speed:** get reports in minutes",
    fix: "A sentence with the claim and its carrier.",
  },
  {
    tier: 0, name: "markdown_heading", weight: 10, scope: "body",
    regex: /^\s{0,3}#{1,6}\s+\S/gm,
    example: "### What's Inside",
    fix: "A crosshead block that states the answer, or a sentence.",
    note: "Scanned on paragraph and bullet text only; headline, deck and crosshead blocks are rendered as headings legitimately.",
  },
  {
    tier: 0, name: "emoji_bullet", weight: 10, scope: "body",
    regex: /^\s*(?:[-*•]\s*)?(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})/gmu,
    example: "✅ Syncs your sales automatically.",
    fix: "A plain sentence. Meta ads may keep up to three.",
    note: "Formats with allow_emoji_bullets keep an allowance (Meta: 3); the excess is a Tier 2 flag instead.",
  },

  // ---- Tier 1: weight 4 ----
  {
    tier: 1, name: "designed_to", weight: 4, scope: "all",
    regex: /\b(?:designed|built|crafted|engineered|tailored|curated) (?:to|for|specifically)\b/gi,
    example: "designed to help busy founders",
    fix: "Say what it does: \"pulls the number when the client opens the report\".",
  },
  {
    tier: 1, name: "thats_why_we_built", weight: 4, scope: "all",
    regex: new RegExp(`\\bthat${A}s why (?:we|I) (?:created|built|made|designed|developed|put together)\\b`, "gi"),
    example: "That's why we built Reportly.",
    fix: "A reason-why turn: discovery, failed fixes, cause.",
  },
  {
    tier: 1, name: "cancel_anytime_triad", weight: 4, scope: "all",
    regex: /\bcancel anytime\b|\bno (?:long[- ]term )?contracts?\b|\bno set-?up fees?\b/gi,
    example: "Cancel anytime. No contracts. No setup fees.",
    fix: "The denominated guarantee, once.",
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
    tier: 1, name: "summary_closer", weight: 4, scope: "all",
    regex: /(?:^|[.!?]\s+)(?:In (?:short|summary|conclusion)|To (?:sum up|summarize|recap|wrap (?:it |things )?up)|So,? to recap|All in all|In a nutshell)\b/gm,
    example: "In short, X gives you A, B and C.",
    fix: "The CTA and what happens after the click.",
  },
  {
    tier: 1, name: "self_posed_question_header", weight: 4, scope: "structural",
    regex: /^\s*(?:#{1,6}\s*)?\*\*[^*\n]{3,80}\?\*\*\s*$/gm,
    example: "### Why only $49?",
    fix: "A crosshead that states the answer.",
    note: "Also counts crosshead and deck blocks that end with a question mark.",
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

  // ---- Tier 2: weight 2 by density per 1,000 words ----
  {
    tier: 2, name: "rule_of_three", weight: 2, scope: "all", density_per_1000: 3,
    regex: /(?<![,\w])[^,.;:\n()]{2,28}, [^,.;:\n()]{2,28},? and [^,.;:\n()]{2,28}(?:[.?!\n]|$)/gm,
    example: "faster, cheaper, and easier.",
    fix: "Break the third item or add a fourth with a number.",
  },
  {
    tier: 2, name: "trailing_participle", weight: 2, scope: "structural", density_per_1000: 0.6,
    regex: /,\s+([a-z]{2,}ing)\b[^.?!\n]{0,80}[.?!]/g,
    example: ", giving you more time with your family.",
    fix: "A new sentence with a subject.",
    note: "analyze.py required eight letters and so missed \", giving you\"; the port accepts five and keeps a stop list of -ing nouns and prepositions (during, including, morning...).",
  },
  {
    tier: 2, name: "hedge", weight: 2, scope: "body", density_per_1000: 1,
    regex: /\b(?:[Uu]sually|[Oo]ften|may|might|[Tt]ypically|[Gg]enerally|tends? to|in many cases|can help|may help|helps? support|supports? (?:a |your )?(?:healthy|normal)|results (?:may )?vary|individual results|many (?:people|customers|users|parents|owners|agents) (?:say|report|find|notice))\b/g,
    example: "usually saves most users a few hours",
    fix: "State the claim at the ledger grade; compliance is handled line by line in the factual review, never with \"may\".",
    note: "Testimonial and disclosure blocks are excluded (the customer's hedges are theirs).",
  },
  {
    tier: 2, name: "intensifier", weight: 2, scope: "all", density_per_1000: 2,
    regex: /\bactually\b|\bexactly\b|\bevery single\b/gi,
    example: "exactly what you need, every single day",
    fix: "Cut.",
  },
  {
    tier: 2, name: "anaphora_triad", weight: 2, scope: "structural", density_per_1000: 1.5,
    regex: null,
    example: "They skip it. They forget it. They regret it.",
    fix: "One plain sentence.",
    note: "Three or more consecutive sentences opening with the same word.",
  },
  {
    tier: 2, name: "no_no_just", weight: 2, scope: "all", density_per_1000: 0,
    regex: /\bNo [^.?!\n]{1,30}\.\s*No [^.?!\n]{1,30}\.(?:\s*No [^.?!\n]{1,30}\.)?\s*(?:Just|Only)\b/g,
    example: "No fluff. No theory. Just results.",
    fix: "One plain sentence.",
  },
  {
    tier: 2, name: "rather_than", weight: 2, scope: "all", density_per_1000: 6.67,
    regex: /\brather than\b/gi,
    example: "rather than guessing",
    fix: "Above two per 300 words, state the chosen thing alone.",
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
    fix: "Answer it with a specific on the next line, or cut it.",
    note: "An \"Imagine...\" or question opener whose next line carries no number, name, price or quote.",
  },
  {
    tier: 2, name: "its_not_x_its_y", weight: 2, scope: "all", density_per_1000: 1,
    regex: new RegExp(`\\b(?:it${A}s|this is|that${A}s|this isn${A}t|it isn${A}t) not (?:just |only |about )?[^.?!\\n]{1,60}[.;—–-]\\s*(?:It${A}s|It is|This is|That${A}s)\\b`, "gi"),
    example: "It's not a diet. It's a system.",
    fix: "Allowed once per 1,000 words when it corrects a belief the reader holds; otherwise state the thing.",
  },
  {
    tier: 2, name: "not_this_that_clip", weight: 2, scope: "all", density_per_1000: 2,
    regex: /(?:^|[.!?]\s+)[A-Z][^.?!\n]{1,50}\. Not [^.?!\n]{1,40}\./gm,
    example: "Real food. Not powder.",
    fix: "One sentence with a subject and a verb.",
    note: "Human DR uses the clip (0.06 per 1,000 against 0.17 in AI drafts), so the threshold is looser than the \"It's not X. It's Y.\" rule.",
  },
  {
    tier: 2, name: "not_just_but", weight: 2, scope: "all", density_per_1000: 1,
    regex: new RegExp(`\\bnot (?:just|only|merely|simply)\\b[^.?!\\n]{1,70}?\\b(?:but|it${A}s)\\b`, "gi"),
    example: "not just a tool but a partner",
    fix: "Fine at human rates; above one per 1,000 words, state the second thing alone.",
  },
  {
    tier: 2, name: "most_x_dont_because", weight: 2, scope: "all", density_per_1000: 0,
    regex: new RegExp(`\\b(?:don${A}t|doesn${A}t|didn${A}t|isn${A}t|aren${A}t|never|not) [^.?!\\n]{1,60}? because [^.?!\\n]{1,60}\\. (?:They|It|You|We|He|She) [^.?!\\n]{1,40} because\\b`, "gi"),
    example: "Most sellers don't fail because of effort. They fail because nobody checks their numbers.",
    fix: "A claim with a carrier.",
  },

  // ---- Tier 3: weight 1, never alone ----
  {
    tier: 3, name: "phrase_4o_era", weight: 1, scope: "all",
    regex: new RegExp(
      `\\bgame[- ]chang(?:er|ing)\\b|\\bpicture this\\b|\\bhere${A}s the kicker\\b|\\blet that sink in\\b|\\bno[- ]brainer\\b|\\bspoiler alert\\b|\\bfast[- ]forward\\b|\\blet${A}s dive in\\b|\\bdive in\\b|\\bthink of it (?:as|like)\\b|\\bhere${A}s the thing\\b|\\bthe best part\\?|\\bthe result\\?|\\blet${A}s (?:be honest|face it|be real)\\b|\\bsay (?:goodbye|hello) to\\b|\\bit${A}s time to\\b|\\blook no further\\b|\\bwithout the fluff\\b|\\bno[- ]fluff\\b|\\bno (?:gimmicks|hype)\\b`,
      "gi",
    ),
    example: "Here's the kicker: it's a game-changer.",
    fix: "Cut; carry the point with a specific.",
  },
  {
    tier: 3, name: "marketing_vocab", weight: 1, scope: "all",
    regex: new RegExp(
      `\\bunlock(?:s|ed|ing)?\\b|\\belevat(?:e|es|ed|ing)\\b|\\bseamless(?:ly)?\\b|\\bstreamlin(?:e|es|ed|ing)\\b|\\beffortless(?:ly)?\\b|\\bcutting[- ]edge\\b|\\bstate[- ]of[- ]the[- ]art\\b|\\bjourney\\b|\\bnext level\\b|\\bsupercharge[sd]?\\b|\\brevolutioniz(?:e|es|ed|ing)\\b|\\brevolutionary\\b|\\btransformative\\b|\\bempower(?:s|ed|ing|ment)?\\b|\\bharness(?:es|ed|ing)?\\b|\\bleverag(?:e|es|ed|ing)\\b|\\bdelv(?:e|es|ed|ing)\\b|\\btapestry\\b|\\btestament to\\b|\\brobust\\b|\\bholistic\\b|\\binnovative\\b|\\bin today${A}s\\b|\\bever[- ]evolving\\b|\\bunparalleled\\b|\\bpeace of mind\\b|\\bstress[- ]free\\b|\\bhassle[- ]free\\b`,
      "gi",
    ),
    example: "unlock a seamless journey to the next level",
    fix: "The mechanism, the number or the scene the word stands in for.",
  },
  {
    tier: 3, name: "hey_there_greeting", weight: 1, scope: "all",
    regex: /^(?:Hey|Hi) (?:there|friend)\b/gm,
    example: "Hey there,",
    fix: "The greeting from the voice profile, or the reader's name from the ESP.",
    note: "Measured 674x the human rate; below §7's Tier 1 list, so a tiebreaker.",
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

/** Listed for the admin UI; never scanned or penalised (§7 "Not tells"). */
export const NON_TELLS: { name: string; why: string }[] = [
  { name: "exclamation_marks", why: "Human DR runs 6.1 per 1,000 words against 0.25 in AI drafts." },
  { name: "ellipses", why: "Human DR runs 9.7 per 1,000 against 0.5." },
  { name: "all_caps_words", why: "Human DR uses them in 87% of documents." },
  { name: "fragments", why: "Fragment rows appear in 71% of human documents and 97% of Halbert issues." },
  { name: "heres_what_how_why", why: "Halbert uses it in 41% of issues." },
  { name: "dear_friend", why: "The classic salutation." },
  { name: "ps", why: "A second headline for the skimmer." },
  { name: "not_just_x_but_y_at_human_rates", why: "Human DR 0.08 per 1,000; only density above 1 per 1,000 is flagged." },
  { name: "em_dashes", why: "Human DR 1.57 per 1,000 against 0.70 in AI; the cap is withdrawn." },
  { name: "superlatives_with_proof", why: "A superlative with its carrier is a claim, not a tell." },
];

/** §7 overrides by format. */
export const FORMAT_OVERRIDES: Partial<Record<FormatId, { emoji_bullets?: number; bold_leadins?: number; keep_watching?: number }>> = {
  meta_ad: { emoji_bullets: 3 },
  optin: { bold_leadins: 5 },
  upsell: { bold_leadins: 5 },
  vsl_long: { keep_watching: 1 },
  vsl_short: { keep_watching: 1 },
};

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

function unitsOf(sections: Section[]): Unit[] {
  const out: Unit[] = [];
  for (const s of sections) {
    const item = sectionItemIndex(s.section_id);
    for (const b of s.blocks) {
      const t = clean(b.text);
      if (t) out.push({ text: t, kind: DISPLAY_TYPES.has(b.type) ? "display" : "body", type: b.type, sectionId: s.section_id, item });
      for (const i of b.items ?? []) {
        const it = clean(i);
        if (it) out.push({ text: it, kind: "item", type: b.type, sectionId: s.section_id, item });
      }
    }
  }
  return out;
}

const WORD_RE = /[A-Za-z0-9'’]+/g;
function countWords(text: string): number {
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

/** "Imagine..." / "What if..." / a lone short question, with no specific on the next line. */
function unansweredOpeners(bodyUnits: Unit[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < bodyUnits.length; i++) {
    const u = bodyUnits[i];
    if (!PROSE_TYPES.has(u.type) || u.type === "testimonial") continue;
    const sents = sentences(u.text);
    if (!sents.length) continue;
    const s0 = sents[0];
    const staged = /^(?:imagine|picture this|what if|wouldn['’]?t it be)\b/i.test(s0);
    const loneQuestion = sents.length === 1 && s0.endsWith("?") && countWords(s0) <= 15;
    if (!staged && !loneQuestion) continue;
    const answer = sents.length > 1 ? sents.slice(1).join(" ") : (bodyUnits[i + 1]?.text ?? "");
    if (!answer || !hasSpecific(answer)) out.push(s0);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------------------------------------------

interface Hit {
  rule: TellRule;
  count: number;
  examples: string[];
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

function pushExamples(hit: Hit, items: string[]) {
  for (const i of items) if (hit.examples.length < 3) hit.examples.push(i.length > 160 ? i.slice(0, 157) + "…" : i);
}

export interface TellFlagOut {
  tier: Tier;
  tell: string;
  weight: number;
  count: number;
  examples: string[];
  fix: string;
}

/** Run every rule over the units; returns flags (with density thresholds applied) and the raw per-rule hits. */
function detectTells(units: Unit[], spec: FormatSpec, words: number): { flags: TellFlagOut[]; score: number; tier0: TellFlagOut[] } {
  const ov = FORMAT_OVERRIDES[spec.id] ?? {};
  const allTexts = units.map((u) => u.text);
  const bodyTexts = units.filter((u) => u.kind !== "display").map((u) => u.text);
  const paragraphTexts = units.filter((u) => u.kind === "body" && u.type === "paragraph").map((u) => u.text);
  const hedgeTexts = units.filter((u) => u.kind !== "display" && u.type !== "testimonial" && u.type !== "disclosure").map((u) => u.text);
  const bodyUnits = units.filter((u) => u.kind !== "display");
  const proseText = bodyUnits.map((u) => u.text).join("\n");
  const proseSentences = sentences(proseText);
  const densDenom = Math.max(words, DENSITY_FLOOR_WORDS);

  const hits: Hit[] = [];
  for (const rule of TELLS) {
    let hit: Hit;
    switch (rule.name) {
      case "hedge":
        hit = scanRegex(rule, hedgeTexts);
        break;
      case "self_posed_question_header": {
        hit = scanRegex(rule, bodyTexts);
        const qHeads = units.filter((u) => (u.type === "crosshead" || u.type === "deck") && /\?\s*$/.test(u.text)).map((u) => u.text);
        hit.count += qHeads.length;
        pushExamples(hit, qHeads);
        break;
      }
      case "trailing_participle": {
        const found = trailingParticiples(proseText);
        hit = { rule, count: found.length, examples: [] };
        pushExamples(hit, found);
        break;
      }
      case "anaphora_triad": {
        const found = anaphoraTriads(proseSentences);
        hit = { rule, count: found.length, examples: [] };
        pushExamples(hit, found);
        break;
      }
      case "unanswered_opener": {
        const found = unansweredOpeners(bodyUnits);
        hit = { rule, count: found.length, examples: [] };
        pushExamples(hit, found);
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
        hit = { rule, count: found.length, examples: [] };
        pushExamples(hit, found);
        break;
      }
      default:
        hit = scanRegex(rule, rule.scope === "paragraph" ? paragraphTexts : rule.scope === "body" ? bodyTexts : allTexts);
    }
    hits.push(hit);
  }

  const flags: TellFlagOut[] = [];
  const tier0: TellFlagOut[] = [];
  let w0 = 0, w1 = 0, w2 = 0, w3 = 0;
  for (const h of hits) {
    const r = h.rule;
    let count = h.count;
    if (count === 0) continue;

    // §7 overrides and spec switches
    if (r.name === "markdown_heading" && spec.allow_markdown_headings) continue;
    if (r.name === "emoji_bullet" && spec.allow_emoji_bullets) {
      const allowed = ov.emoji_bullets ?? 0;
      if (count > allowed) {
        const f: TellFlagOut = { tier: 2, tell: "emoji_bullets_over_allowance", weight: TIER_WEIGHT[2], count: count - allowed, examples: h.examples, fix: `Keep at most ${allowed} emoji bullets in this format; the rest become sentences.` };
        flags.push(f);
        w2 += TIER_WEIGHT[2] * f.count;
      }
      continue;
    }
    if (r.name === "bold_leadin_bullet" && ov.bold_leadins) {
      count -= ov.bold_leadins;
      if (count <= 0) continue;
    }
    if (r.name === "stay_with_me" && ov.keep_watching) {
      count -= ov.keep_watching;
      if (count <= 0) continue;
    }

    if (r.tier === 2) {
      const threshold = r.density_per_1000 ?? 0;
      const allowed = Math.floor((threshold * densDenom) / 1000);
      const excess = count - allowed;
      if (excess <= 0) continue;
      flags.push({ tier: 2, tell: r.name, weight: r.weight, count: excess, examples: h.examples, fix: r.fix });
      w2 += r.weight * excess;
      continue;
    }

    const f: TellFlagOut = { tier: r.tier, tell: r.name, weight: r.weight, count, examples: h.examples, fix: r.fix };
    flags.push(f);
    if (r.tier === 0) {
      tier0.push(f);
      w0 += r.weight * count;
    } else if (r.tier === 1) w1 += r.weight * count;
    else w3 += r.weight * count;
  }

  // Tier 3 never scores alone.
  const raw = w0 + w1 + w2 + (w1 + w2 > 0 ? w3 : 0);
  const score = Math.round((raw * 300 / Math.max(words, SCORE_FLOOR_WORDS)) * 100) / 100;
  flags.sort((a, b) => a.tier - b.tier || b.weight * b.count - a.weight * a.count || a.tell.localeCompare(b.tell));
  return { flags, score, tier0 };
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
  const re = /^\s*(?:[-*•]\s*)?(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})/u;
  let n = 0;
  for (const { block } of blocks(sections)) {
    for (const i of block.items ?? []) if (re.test(clean(i))) n += 1;
    if (!DISPLAY_TYPES.has(block.type)) for (const line of clean(block.text).split("\n")) if (re.test(line)) n += 1;
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
  emoji_bullets: { kind: "item", text: true, note: "bullet items or lines opening with an emoji", compute: (c) => emojiBulletCount(c.sections) },
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

export function analyzeDraft(sections: Section[], spec: FormatSpec, opts: { textOnly?: boolean } = {}): MechanicalReport {
  const units = unitsOf(sections);
  const wordCountAll = draftWordCount({ sections });
  const allText = units.map((u) => u.text).join("\n\n");
  const words = countWords(allText);
  const proseText = units.filter((u) => u.kind !== "display").map((u) => u.text).join("\n\n");

  const { flags, score, tier0 } = detectTells(units, spec, words);
  const gates = evaluateGates(sections, spec, opts);

  const cadence_cv = sentenceLengthCV(proseText);
  const cadence_flag = words >= 300 && cadence_cv !== null && cadence_cv < spec.cadence_floor_cv;
  const and_then_count = (allText.match(/\band then\b/gi) ?? []).length;

  const hard_fail_reasons: string[] = [];
  for (const t of tier0) hard_fail_reasons.push(`tier0:${t.tell} x${t.count}`);
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
  };
}

/** Raw text (ledger tags are stripped here) treated as a run of paragraphs; only text-computable gates are evaluated. */
export function analyzeText(text: string, opts: { format: FormatSpec }): MechanicalReport {
  return analyzeDraft(textToSections(text), opts.format, { textOnly: true });
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
