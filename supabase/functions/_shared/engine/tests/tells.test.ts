import { assert, assertEquals } from "@std/assert";
import type { Block, Section } from "../schemas/draft.ts";
import { MechanicalReport } from "../schemas/review.ts";
import { FORMATS } from "../formats/index.ts";
import type { FormatSpec } from "../formats/spec.ts";
import {
  analyzeDraft,
  analyzeText,
  countWords,
  densityAllowance,
  densityThreshold,
  DENSITY_PROFILES,
  blankQuotes,
  evaluateGates,
  exemptTermsFrom,
  fleschKincaidGrade,
  NON_TELLS,
  OWNER_STACK,
  sentenceLengthCV,
  syllables,
  TELL_THRESHOLDS,
  TELLS,
} from "../tells.ts";

const CORPUS = new URL("../../../../../research/tells/ai_corpus/", import.meta.url);

async function corpus(name: string): Promise<string> {
  const t = await Deno.readTextFile(new URL(name, CORPUS));
  return t.replace(/^PROMPT:.*?\n\n/s, ""); // same as analyze.py extract_ai
}

let n = 0;
function block(type: Block["type"], text: string, items: string[] | null = null, meta: Record<string, string> | null = null): Block {
  return { id: `b${++n}`, type, text, items, meta };
}
function section(section_id: string, blocks: Block[]): Section {
  return { section_id, title: null, blocks };
}
const tells = (r: MechanicalReport, name: string) => r.flags.find((f) => f.tell === name);
const rule = (name: string) => TELLS.find((t) => t.name === name)!;

// ---------------------------------------------------------------------------------------------------------------
// Known-bad AI drafts from the research corpus
// ---------------------------------------------------------------------------------------------------------------

Deno.test("an AI-style email from the corpus hard-fails on Tier 0 and scores above the flag threshold", async () => {
  const r = analyzeText(await corpus("opus_email_05.txt"), { format: FORMATS.email_single });
  MechanicalReport.parse(r);
  assert(r.hard_fail);
  assert(r.tell_score_per_300 > TELL_THRESHOLDS.flag, `score ${r.tell_score_per_300}`);
  const tier0 = r.flags.filter((f) => f.tier === 0).map((f) => f.tell);
  for (const t of ["bold_label_colon", "bracket_placeholder", "assistant_residue", "emoji"]) assert(tier0.includes(t), `expected tier 0 ${t}, got ${tier0.join(",")}`);
  assert(tells(r, "thats_why_we_built"), "That's why we built");
  assert(r.hard_fail_reasons.some((x) => x.startsWith("tier0:")));
});

Deno.test("an AI-style VSL opener from the corpus trips the VSL opener promise, the triad and the residue block", async () => {
  const r = analyzeText(await corpus("haiku_vsl_opener_00.txt"), { format: FORMATS.vsl_long });
  assert(r.hard_fail);
  assert(tells(r, "vsl_opener_promise"));
  assert(tells(r, "cancel_anytime_triad"), "said more than once");
  assert(tells(r, "bracket_placeholder"));
  assert(tells(r, "assistant_residue"));
});

Deno.test("the AI corpus still mostly flags and hard-fails after the human calibration", async () => {
  let count = 0, flagged = 0, hard = 0;
  for await (const e of Deno.readDir(CORPUS)) {
    if (!e.name.endsWith(".txt")) continue;
    const r = analyzeText(await corpus(e.name), { format: FORMATS.email_single });
    count++;
    if (r.tell_score_per_300 >= TELL_THRESHOLDS.flag) flagged++;
    if (r.hard_fail) hard++;
  }
  assert(count >= 100, `corpus has ${count} docs`);
  assert(flagged / count >= 0.9, `flag rate ${flagged}/${count}`);
  assert(hard / count >= 0.85, `hard-fail rate ${hard}/${count}`);
});

// ---------------------------------------------------------------------------------------------------------------
// Human-style copy and the non-tells
// ---------------------------------------------------------------------------------------------------------------

const HUMAN = `Dear Friend,

If you've ever lain awake at 3 a.m. wondering how you're going to make payroll on Friday... this letter is for you.

In the spring of 1987, I was BROKE. Flat broke. I had $128.42 in my checking account and a stack of bills on the kitchen table that was taller than my coffee cup.

Then a man named Jim Straw sent me a letter (four pages, typed on a manual typewriter) that changed everything. I still have it.

He told me one thing, and I want you to read it twice:

"The money is in the list. The LIST."

I didn't believe him. So I tested it. I mailed 2,000 letters to a list of people who had bought a $39 course on coin collecting in the previous 90 days. The letter was ugly. It had two typos! But it pulled 4.1%, which at $79 a sale came to $6,478 on a $1,100 mailing.

That was the first time I ever made money in my sleep. It was not the last.

Look. I am not going to tell you this is easy. It isn't. You will mail letters that die. I have mailed letters that lost $20,000 in a week. But the ones that work... they work for YEARS!

So do this. Get out a pen. Write down the name of the one market you know better than anyone you've ever met. Then call me at the number below.

Sincerely,

Gary

P.S. The coin-collecting letter is reprinted on page 14 of the enclosed booklet, with my notes in the margin. Read it before you call.`;

Deno.test("human-style copy with caps, fragments, ellipses, exclamation marks, Dear Friend and P.S. is not penalised", () => {
  assert((HUMAN.match(/!/g) ?? []).length >= 2);
  assert((HUMAN.match(/\.\.\./g) ?? []).length >= 2);
  assert(/\b[A-Z]{4,}\b/.test(HUMAN));
  assert(/Dear Friend/.test(HUMAN) && /P\.S\./.test(HUMAN));

  const r = analyzeText(HUMAN, { format: FORMATS.email_single });
  MechanicalReport.parse(r);
  assertEquals(r.hard_fail, false, r.hard_fail_reasons.join("; "));
  assert(r.tell_score_per_300 < TELL_THRESHOLDS.flag, `score ${r.tell_score_per_300}: ${r.flags.map((f) => f.tell).join(",")}`);
  assertEquals(r.flags.filter((f) => f.tier === 0).length, 0);
  assertEquals(r.flags.filter((f) => f.tier === 1).length, 0, r.flags.map((f) => f.tell).join(","));
  assertEquals(r.format_gate_failures, []);
  const names = TELLS.map((t) => t.name);
  for (const nt of ["exclaim", "ellipsis", "caps_word", "fragment_rows", "dear_friend", "ps"]) assert(!names.includes(nt), nt);
  for (const gone of ["em_dashes", "heres_what_how_why", "not_just_x_but_y_at_human_rates"]) assert(!NON_TELLS.some((x) => x.name === gone), `${gone} is banned by the owner's list now`);
});

Deno.test("the owner's list flags em dashes and windups even in human copy (§7.1 governs the calibration)", () => {
  const original = "Here's what happened to me in the spring of 1987. I was BROKE.\n\nThen a man named Jim Straw sent me a letter — four pages, typed on a manual typewriter — that changed everything.\n\nHere's what he told me, and I want you to read this twice:";
  const r = analyzeText(original, { format: FORMATS.email_single });
  assertEquals(tells(r, "em_dash")?.count, 2);
  assertEquals(tells(r, "em_dash")?.tier, 0);
  assertEquals(tells(r, "heres_the_windup")?.count, 2);
  assert(r.hard_fail);
  assert(r.hard_fail_reasons.some((x) => x.startsWith("owner_stack:")), r.hard_fail_reasons.join("; "));
});

Deno.test("loud punctuation and plain Label: lines produce no score; em dashes and the owner's words do", () => {
  const loud = "WAIT! Don't go yet!!! The price DOUBLES at midnight tonight, no kidding. Really. Call NOW! Or don't... your choice!";
  const r = analyzeText(loud, { format: FORMATS.email_single });
  assertEquals(r.flags, []);
  assertEquals(r.tell_score_per_300, 0);
  const dashSentences = ["The jar — the big one — ships Monday.", "Dana — our driver — leaves at six.", "Forty jars — packed in straw — fill one crate."];
  const dashes = analyzeText(Array.from({ length: 30 }, (_, i) => dashSentences[i % 3]).join(" "), { format: FORMATS.email_single });
  assertEquals(tells(dashes, "em_dash")?.count, 60, "every em dash counts, at any rate");
  assert(dashes.hard_fail);
  const genre = analyzeText("Transform your mornings. Unlock the ritual. Elevate the first hour and empower the rest of the day with an effortless journey to the next level.", { format: FORMATS.sales_letter });
  assertEquals(tells(genre, "ai_words")?.count, 2, "unlock and elevate are on the owner's list");
  assertEquals(tells(genre, "corporate_filler")?.count, 1, "next level is on the owner's list");
  assertEquals(genre.flags.filter((f) => f.tell === "marketing_vocab"), [], "transform, empower, effortless and journey are not scanned");
  const labels = analyzeDraft([section("body", [block("paragraph", "Editor's note: the April batch sold out.\nSpeaker: Dana\nFAQ: does it ship abroad?")])], FORMATS.email_single);
  assertEquals(labels.flags.filter((f) => f.tier === 0), [], "plain-text Label: lines are not Tier 0");
  assertEquals(labels.tell_score_per_300, 0, "a Tier 3 label_colon_line never scores alone");
});

// ---------------------------------------------------------------------------------------------------------------
// Density thresholds behave per 1,000 words, at the human p90 by format profile
// ---------------------------------------------------------------------------------------------------------------

const FILLER = [
  "The first batch shipped on a Tuesday in March.",
  "Nobody at the warehouse expected the second order to arrive before noon.",
  "A customer in Ohio wrote to say the box had been opened by her dog.",
  "We refunded her on the spot.",
  "The next print run doubled the page count without raising the price.",
  "Our bookkeeper keeps a ledger in pencil because she trusts it more than the screen.",
  "Two of the drivers have worked the same route since 2011.",
  "Rain delayed the Thursday delivery by four hours.",
  "The old press still runs on the original motor.",
  "Each crate holds forty jars packed in straw.",
  "Her brother drove the truck for the first year.",
  "The label was printed in the wrong green once.",
  "Thirty people showed up to the open house in a snowstorm.",
  "The bakery next door lends us their scale when ours drifts.",
];

function filler(targetWords: number): string {
  const out: string[] = [];
  let words = 0, i = 0;
  while (words < targetWords) {
    const s = FILLER[i++ % FILLER.length];
    out.push(s);
    words += s.split(/\s+/).length;
    if (i % 4 === 0) out.push("\n");
  }
  return out.join(" ").replace(/ \n /g, "\n\n");
}

/** Build a text with `hits` copies of `sentence` after ~1,000 words of filler and return the report plus the allowance the detector applied. */
function densityRun(spec: FormatSpec, tell: string, sentence: string, hits: number) {
  const text = `${filler(1000)}\n\n${Array.from({ length: hits }, () => sentence).join("\n\n")}`;
  const r = analyzeText(text, { format: spec });
  const threshold = densityThreshold(rule(tell), spec)!;
  const allowed = densityAllowance(threshold, countWords(text));
  return { r, allowed, threshold };
}

/** The flag count must equal max(0, hits - allowance) at every hit count around the allowance (the hit sentences add words, so the allowance is read from each run's own text). */
function assertDensity(spec: FormatSpec, tell: string, sentence: string) {
  const probe = densityRun(spec, tell, sentence, 1);
  assert(probe.allowed >= 1, `${tell} on ${spec.id}: allowance ${probe.allowed} should be at least one in 1,000 words`);
  let unflagged = 0, flagged = 0;
  for (const hits of [probe.allowed - 1, probe.allowed, probe.allowed + 1, probe.allowed + 2, probe.allowed + 3]) {
    if (hits < 1) continue;
    const run = densityRun(spec, tell, sentence, hits);
    const expected = Math.max(0, hits - run.allowed);
    const f = tells(run.r, tell);
    assertEquals(f?.count, expected || undefined, `${tell} on ${spec.id}: ${hits} hits, allowance ${run.allowed} (threshold ${run.threshold} per 1,000)`);
    if (f) {
      assertEquals(f.tier, rule(tell).tier);
      flagged++;
    } else unflagged++;
  }
  assert(unflagged > 0 && flagged > 0, `${tell} on ${spec.id}: expected both sides of the threshold`);
}

const RULE_OF_THREE = "The kit ships with a scale, a timer, and a notebook.";

Deno.test("thresholds are the human p90 by profile: rule of three 4/4/7/11, intensifiers 2 (4 for opt-in and social), participles 2, hedges 2", () => {
  assertEquals(densityThreshold(rule("rule_of_three"), FORMATS.email_single), 4);
  assertEquals(densityThreshold(rule("rule_of_three"), FORMATS.cold_email), 4);
  assertEquals(densityThreshold(rule("rule_of_three"), FORMATS.organic_social), 4);
  assertEquals(densityThreshold(rule("rule_of_three"), FORMATS.sales_letter), 7);
  assertEquals(densityThreshold(rule("rule_of_three"), FORMATS.vsl_long), 7);
  assertEquals(densityThreshold(rule("rule_of_three"), FORMATS.optin), 11);
  assertEquals(densityThreshold(rule("rule_of_three"), FORMATS.meta_ad), 7);
  assertEquals(densityThreshold(rule("intensifier"), FORMATS.sales_letter), 2);
  assertEquals(densityThreshold(rule("intensifier"), FORMATS.email_single), 2);
  assertEquals(densityThreshold(rule("intensifier"), FORMATS.optin), 4);
  assertEquals(densityThreshold(rule("intensifier"), FORMATS.tiktok_reels), 4);
  assertEquals(densityThreshold(rule("trailing_participle"), FORMATS.sales_letter), 2);
  assertEquals(densityThreshold(rule("hedge"), FORMATS.email_single), 2);
  assertEquals(densityThreshold(rule("designed_to"), FORMATS.sales_letter), 1);
  assertEquals(densityThreshold(rule("anaphora_triad"), FORMATS.sales_letter), 1.5);
  assertEquals(densityThreshold(rule("thats_why_we_built"), FORMATS.sales_letter), undefined, "per-hit rule");
  for (const id of Object.keys(FORMATS)) assert(DENSITY_PROFILES[id as keyof typeof FORMATS], `${id} has a density profile`);
});

Deno.test("rule of three is flagged only above the profile threshold, per 1,000 words", () => {
  assertDensity(FORMATS.sales_letter, "rule_of_three", RULE_OF_THREE);
  assertDensity(FORMATS.email_single, "rule_of_three", RULE_OF_THREE);
  assertDensity(FORMATS.optin, "rule_of_three", RULE_OF_THREE);
  const page = densityRun(FORMATS.sales_letter, "rule_of_three", RULE_OF_THREE, 7);
  assertEquals(tells(page.r, "rule_of_three"), undefined, "seven per 1,000 is the human sales-page p90");
  const email = densityRun(FORMATS.email_single, "rule_of_three", RULE_OF_THREE, 7);
  assertEquals(tells(email.r, "rule_of_three")?.count, 7 - email.allowed, "the same copy as an email is over the email p90");
});

Deno.test("intensifiers, trailing participles and hedges are density tells at their thresholds", () => {
  assertDensity(FORMATS.sales_letter, "intensifier", "It is actually here.");
  assertDensity(FORMATS.optin, "intensifier", "It is exactly here.");
  assertDensity(FORMATS.sales_letter, "trailing_participle", "The plan runs itself, giving you the evening back.");
  assertDensity(FORMATS.email_single, "hedge", "It usually takes a week.");
  const stop = analyzeText(`${filler(1000)}\n\nWe met at the store, morning after morning.`, { format: FORMATS.sales_letter });
  assertEquals(tells(stop, "trailing_participle"), undefined, "stop-list -ing nouns are not participles");
});

Deno.test("designed to is a Tier 2 density tell; cancel anytime is allowed once; rather than is Tier 3", () => {
  assertEquals(rule("designed_to").tier, 2);
  assertDensity(FORMATS.sales_letter, "designed_to", "It was designed to fit the crate.");
  assertEquals(rule("cancel_anytime_triad").tier, 2);
  assertEquals(rule("cancel_anytime_triad").free_hits, 1);
  const once = analyzeDraft([section("offer", [block("paragraph", "Cancel anytime; the guarantee is 60 days [[L:0f1e2d3c4b5a]].")])], FORMATS.sales_letter);
  assertEquals(tells(once, "cancel_anytime_triad"), undefined);
  const triad = analyzeDraft([section("offer", [block("paragraph", "Cancel anytime. No contracts. No setup fees.")])], FORMATS.sales_letter);
  assertEquals(tells(triad, "cancel_anytime_triad")?.count, 2);
  assertEquals(rule("rather_than").tier, 3);
  assertEquals(rule("label_colon_line").tier, 3);
});

Deno.test("short copy uses the density floor so one hit is not a density", () => {
  const r = analyzeText("The kit ships with a scale, a timer, and a notebook. Order by Friday.", { format: FORMATS.sms });
  assertEquals(tells(r, "rule_of_three"), undefined);
});

Deno.test("Tier 3 never scores alone, but counts once a Tier 1 or 2 tell is present", () => {
  const base = filler(600);
  const alone = analyzeText(`${base}\n\nIt was a no-brainer for the shop.`, { format: FORMATS.sales_letter });
  assertEquals(tells(alone, "phrase_4o_era")?.count, 1);
  assertEquals(alone.tell_score_per_300, 0);
  const withTier1 = analyzeText(`${base}\n\nIt was a no-brainer for the shop. That's why we built the kit.`, { format: FORMATS.sales_letter });
  assert(withTier1.tell_score_per_300 > 0);
  // weights: 4 (tier 1) + 1 (tier 3) over the word count, per 300 words
  assertEquals(withTier1.tell_score_per_300, Math.round((5 * 300 / Math.max(countWords(`${base}\n\nIt was a no-brainer for the shop. That's why we built the kit.`), 300)) * 100) / 100);
});

Deno.test("social formats are exempt from anaphora and label-colon lines", () => {
  const text = "They skip it. They forget it. They regret it.\n\nSpeed: open the jar.\nSmell: close your eyes.\nCall: ring me after.";
  const social = analyzeDraft([section("main", [block("paragraph", text)])], FORMATS.organic_social);
  assertEquals(tells(social, "anaphora_triad"), undefined);
  assertEquals(tells(social, "label_colon_line"), undefined);
  const email = analyzeDraft([section("body", [block("paragraph", text)])], FORMATS.email_single);
  assertEquals(tells(email, "anaphora_triad")?.count, 1);
  assertEquals(tells(email, "label_colon_line")?.count, 2, "three labels, allowance one at the 500-word floor");
});

// ---------------------------------------------------------------------------------------------------------------
// Block-aware Tier 0 and structural rules
// ---------------------------------------------------------------------------------------------------------------

Deno.test("headline and crosshead blocks are legitimate; a markdown heading inside a paragraph is Tier 0", () => {
  const clean = analyzeDraft([section("lead", [block("headline", "The Ohio bakery that doubled its Tuesday orders"), block("crosshead", "What the dog found in the box"), block("paragraph", "Her dog opened the box before she did. We refunded her on the spot.")])], FORMATS.sales_letter);
  assertEquals(tells(clean, "markdown_heading"), undefined);
  assertEquals(tells(clean, "self_posed_question_header"), undefined);

  const bad = analyzeDraft([section("lead", [block("paragraph", "## What the dog found in the box\n\nHer dog opened the box before she did.")])], FORMATS.sales_letter);
  const f = tells(bad, "markdown_heading");
  assert(f && f.tier === 0);
  assert(bad.hard_fail);
  assert(bad.format_gate_failures.some((g) => g.startsWith("page.no_markdown_headings")));
});

Deno.test("a crosshead that asks a question is a self-posed question header (Tier 1)", () => {
  const r = analyzeDraft([section("price", [block("crosshead", "Why only $49?"), block("paragraph", "Because the second print run cost half as much as the first.")])], FORMATS.sales_letter);
  const f = tells(r, "self_posed_question_header");
  assert(f && f.tier === 1 && f.count === 1);
});

Deno.test("bold-label-colon bullets are Tier 0 (markdown only); plain bold lead-ins are Tier 1 with the opt-in allowance", () => {
  const colon = analyzeDraft([section("body", [block("bullets", "", ["**Speed:** get reports in minutes", "**Accuracy:** every number checked"])])], FORMATS.email_single);
  assertEquals(tells(colon, "bold_label_colon")?.tier, 0);
  assert(colon.hard_fail);
  const plain = analyzeDraft([section("body", [block("bullets", "", ["Speed: get reports in minutes", "Accuracy: every number checked"])])], FORMATS.sales_letter);
  assertEquals(tells(plain, "bold_label_colon"), undefined, "the plain-text branch is not Tier 0");
  assertEquals(plain.flags.filter((f) => f.tier === 0), []);
  assertEquals(plain.hard_fail_reasons.filter((x) => x.startsWith("tier0:")), []);

  const leadins = ["**Seven dinners planned.** One relaxed weekend cook.", "**A list sorted by aisle.** Shop once.", "**Prep notes.** Cut weeknight time."];
  const email = analyzeDraft([section("body", [block("bullets", "", leadins)])], FORMATS.email_single);
  assertEquals(tells(email, "bold_leadin_bullet")?.count, 3);
  const optin = analyzeDraft([section("bullets", [block("bullets", "", leadins)])], FORMATS.optin);
  assertEquals(tells(optin, "bold_leadin_bullet"), undefined, "opt-in allows five plain bold lead-ins");
});

Deno.test("emojis are Tier 0 in every format and block, check marks included; stars, suits, ©, ® and ™ are not emojis", () => {
  const items = ["✅ Syncs your sales", "✅ Sorts your expenses", "✅ Shows real profit"];
  const email = analyzeDraft([section("body", [block("bullets", "", items)])], FORMATS.email_single);
  assertEquals(tells(email, "emoji")?.tier, 0);
  assertEquals(tells(email, "emoji")?.count, 3);
  const meta = analyzeDraft([section("primary_text#1", [block("paragraph", "Books done by Friday."), block("bullets", "", items)])], FORMATS.meta_ad);
  assertEquals(tells(meta, "emoji")?.count, 3, "Meta ads no longer keep an emoji allowance");
  assert(meta.hard_fail);
  const page = analyzeDraft([section("benefits", [block("paragraph", filler(250)), block("bullets", "", ["✓ Ships Monday", "✔ Packed in straw"])])], FORMATS.sales_letter);
  assertEquals(tells(page, "emoji")?.count, 2, "check marks are emojis under the owner's rule");
  const inline = analyzeDraft([section("headline", [block("headline", "Books done by Friday 🚀")]), section("body", [block("paragraph", "Rated ★★★★☆ by the guild. Hold A♠ K♠. Legiit® and Legiit Copy™ © 2026. Team 👩‍💻 ready.")])], FORMATS.landing_page_short);
  assertEquals(tells(inline, "emoji")?.count, 2, "the rocket and the ZWJ sequence; rating stars, card suits, ®, ™ and © are typography");
});

Deno.test("hashtags are Tier 0; #1, C#, HTML entities and URL fragments are not hashtags", () => {
  const r = analyzeText("Post it with #SEO and #marketing.\n\n#contentstrategy", { format: FORMATS.organic_social });
  assertEquals(tells(r, "hashtag")?.count, 3);
  assertEquals(tells(r, "hashtag")?.tier, 0);
  const clean = analyzeText("We are the #1 marketplace. Write it in C# or Go. See example.com/#pricing and &#39;quoted&#39; text.", { format: FORMATS.organic_social });
  assertEquals(tells(clean, "hashtag"), undefined, clean.flags.map((f) => f.examples.join(" / ")).join("; "));
});

Deno.test("em dash variants: a spaced en dash or a double hyphen counts; an en dash in a range does not", () => {
  const r = analyzeText("It works – fast. It ships -- today. It rose--slowly. Pages 3–5 cover it.", { format: FORMATS.email_single });
  assertEquals(tells(r, "em_dash")?.count, 3);
});

Deno.test("assistant residue and bracket placeholders are Tier 0; ledger tags and NEEDS SOURCE are not", () => {
  const r = analyzeDraft([section("body", [
    block("paragraph", "Notes: swap in your product name before sending."),
    block("paragraph", "[Product Name] helps [target audience] every week."),
    block("paragraph", "Of 1,912 members, 6% reached $4,000 in a month [[L:0f1e2d3c4b5a]] and the median made $210 [[NEEDS SOURCE]]."),
    block("paragraph", "Read the full terms at [the order page](https://example.com/terms)."),
  ])], FORMATS.email_single);
  assert((tells(r, "assistant_residue")?.count ?? 0) >= 1, "Notes: and swap in");
  assertEquals(tells(r, "assistant_residue")?.tier, 0);
  assertEquals(tells(r, "bracket_placeholder")?.count, 2, "[Product Name] and [target audience], not the ledger tag, NEEDS SOURCE or the markdown link");
});

Deno.test("an Imagine opener with no specific on the next line is flagged; one with a number is not", () => {
  const vague = analyzeDraft([section("lead", [block("paragraph", "Imagine never worrying about dinner again."), block("paragraph", "Our service handles it for you.")])], FORMATS.sales_letter);
  assertEquals(tells(vague, "unanswered_opener")?.count, 1);
  const specific = analyzeDraft([section("lead", [block("paragraph", "Imagine never worrying about dinner again."), block("paragraph", "Our service plans seven dinners for $89 and the box lands on Sunday.")])], FORMATS.sales_letter);
  assertEquals(tells(specific, "unanswered_opener"), undefined);
});

Deno.test("anaphora triads stay Tier 2; the three-beat that lands on a deep third is the owner's Tier 1 tell", () => {
  const r = analyzeDraft([section("body", [block("paragraph", "They skip it. They forget it. They regret it. No fluff. No theory. Just results.")])], FORMATS.email_single);
  assertEquals(tells(r, "anaphora_triad")?.count, 1);
  assertEquals(tells(r, "three_beat_deep_third")?.count, 1);
  assertEquals(tells(r, "three_beat_deep_third")?.tier, 1);
  const deep = analyzeText("Not a tool. Not a course. It's a system.", { format: FORMATS.organic_social });
  assertEquals(tells(deep, "three_beat_deep_third")?.count, 1, "no social exemption");
  const comma = analyzeText("It is not a tool, not a course, but a system you run every week.", { format: FORMATS.email_single });
  assertEquals(tells(comma, "three_beat_deep_third")?.count, 1);
});

Deno.test("hedges are counted in body copy but not inside testimonials", () => {
  const r = analyzeDraft([section("body", [block("testimonial", "It usually takes me a week, and it may take you longer.")])], FORMATS.email_single);
  assertEquals(tells(r, "hedge"), undefined);
  const body = analyzeDraft([section("body", [block("paragraph", "It usually takes a week. It may take longer. It often does.")])], FORMATS.email_single);
  assertEquals(tells(body, "hedge")?.count, 3 - densityAllowance(2, 15), "three hedges, allowance one at the 500-word floor");
});

Deno.test("the VSL keep-watching allowance exempts the first use only", () => {
  const once = analyzeDraft([section("interrupt", [block("beat", "Keep watching and I will show you the Tuesday order sheet.")])], FORMATS.vsl_short);
  assertEquals(tells(once, "stay_with_me"), undefined);
  const twice = analyzeDraft([section("interrupt", [block("beat", "Keep watching. Stay with me for one more minute.")])], FORMATS.vsl_short);
  assertEquals(tells(twice, "stay_with_me")?.count, 1);
});

// ---------------------------------------------------------------------------------------------------------------
// Readability, cadence, and-then
// ---------------------------------------------------------------------------------------------------------------

Deno.test("syllable estimation handles common shapes", () => {
  assertEquals(syllables("cat"), 1);
  assertEquals(syllables("table"), 2);
  assertEquals(syllables("jumped"), 1);
  assertEquals(syllables("boxes"), 2);
  assert(syllables("created") >= 2);
  assertEquals(syllables("beautiful"), 3);
  assertEquals(syllables("$97"), 1);
});

Deno.test("Flesch-Kincaid grade separates simple from dense prose", () => {
  const simple = fleschKincaidGrade("The cat sat on the mat. The dog ran to the park. We ate pie.");
  const dense = fleschKincaidGrade("Notwithstanding the aforementioned considerations, the organisational implementation of comprehensive methodological frameworks necessitates substantial interdepartmental coordination.");
  assert(simple !== null && dense !== null);
  assert(simple < 4, `simple ${simple}`);
  assert(dense > 15, `dense ${dense}`);
  assertEquals(fleschKincaidGrade(""), null);
});

Deno.test("cadence flag uses the format floor: 0.50 for email, 0.70 for pages", () => {
  const flat = Array.from({ length: 40 }, (_, i) => `The driver left the crate at the ${i % 2 ? "front" : "back"} door on Monday.`).join(" ");
  const r = analyzeText(flat, { format: FORMATS.email_single });
  assert(r.word_count >= 300);
  assert(r.cadence_cv !== null && r.cadence_cv < 0.5);
  assertEquals(r.cadence_flag, true);
  // alternating 7- and 13-word sentences: CV about 0.3; under both floors
  const mid = Array.from({ length: 36 }, (_, i) => (i % 2 ? "The crate reached the back door on Monday." : "Rain delayed the second Thursday delivery by four long hours this week.")).join(" ");
  const asEmail = analyzeText(mid, { format: FORMATS.email_single });
  const asPage = analyzeText(mid, { format: FORMATS.sales_letter });
  assert(asEmail.cadence_cv !== null && asEmail.cadence_cv < 0.5, `cv ${asEmail.cadence_cv}`);
  assertEquals(asEmail.cadence_flag, true);
  assertEquals(asPage.cadence_flag, true);
  // an email at CV 0.6 passes the email floor and fails the page floor
  const lens = [3, 9, 14, 6, 18, 4, 11, 8, 16, 5];
  const sixty = Array.from({ length: 40 }, (_, i) => Array.from({ length: lens[i % lens.length] }, (_, k) => (k === 0 ? "Jars" : "shipped")).join(" ") + ".").join(" ");
  const e = analyzeText(sixty, { format: FORMATS.email_single });
  const p = analyzeText(sixty, { format: FORMATS.sales_letter });
  assert(e.cadence_cv !== null && e.cadence_cv > 0.5 && e.cadence_cv < 0.7, `cv ${e.cadence_cv}`);
  assertEquals(e.cadence_flag, false);
  assertEquals(p.cadence_flag, true);
  const varied = analyzeText(HUMAN, { format: FORMATS.email_single });
  assertEquals(varied.cadence_flag, false);
  assertEquals(sentenceLengthCV("One. Two words."), null, "under three sentences");
});

Deno.test("and then is counted", () => {
  const r = analyzeText("We packed it and then we shipped it and then we waited. And then the letter came.", { format: FORMATS.email_single });
  assertEquals(r.and_then_count, 3);
});

// ---------------------------------------------------------------------------------------------------------------
// Format hard gates
// ---------------------------------------------------------------------------------------------------------------

Deno.test("SMS gates: character cap, STOP wording, one link, no dollar-off", () => {
  const long = "Acme: " + "x".repeat(240) + " Reply STOP to opt out";
  const r = analyzeDraft([section("body", [block("paragraph", long)])], FORMATS.sms);
  assert(r.format_gate_failures.some((g) => g.startsWith("sms.chars<=240")), r.format_gate_failures.join("; "));
  assert(r.hard_fail);

  const good = analyzeDraft([section("body", [block("paragraph", "Acme: 40 jars of the March batch left. 20% off until Fri 9pm: acme.co/march")]), section("opt_out", [block("disclosure", "Reply STOP to opt out")])], FORMATS.sms);
  assertEquals(good.format_gate_failures, []);

  const dollarOff = analyzeDraft([section("body", [block("paragraph", "Acme: $10 off the March batch until Fri: acme.co/march")]), section("opt_out", [block("disclosure", "Reply STOP to opt out")])], FORMATS.sms);
  assert(dollarOff.format_gate_failures.some((g) => g.startsWith("sms.no_dollar_off")));

  const noStop = analyzeDraft([section("body", [block("paragraph", "Acme: 20% off until Fri: acme.co/march")])], FORMATS.sms);
  assert(noStop.format_gate_failures.some((g) => g.startsWith("sms.stop_wording")));
});

Deno.test("cold email gates: 90 words, 3-word subject, no links in email one, one question", () => {
  const body = Array.from({ length: 95 }, (_, i) => `w${i}`).join(" ");
  const r = analyzeDraft([section("subject", [block("subject", "ohio tuesday orders")]), section("observation", [block("paragraph", body)]), section("question", [block("paragraph", "Worth a look? Or not?")])], FORMATS.cold_email);
  assert(r.format_gate_failures.some((g) => g.startsWith("cold_email.words<=90")), r.format_gate_failures.join("; "));
  assert(r.format_gate_failures.some((g) => g.startsWith("cold_email.questions<=1")));

  const linked = analyzeDraft([section("subject", [block("subject", "a four word subject")]), section("observation", [block("paragraph", "Saw your post on the Tuesday orders at https://example.com/post.")]), section("followup#1", [block("paragraph", "One more thing: the Ohio bakery doubled its orders.")])], FORMATS.cold_email);
  assert(linked.format_gate_failures.some((g) => g.startsWith("cold_email.subject_words<=3")));
  assert(linked.format_gate_failures.some((g) => g.startsWith("cold_email.email_one_links==0")));
});

Deno.test("Google RSA gates: 30-character headlines, 90-character descriptions, counts, duplicates, caps, exclamation", () => {
  const headlines = Array.from({ length: 15 }, (_, i) => block("headline", `Headline number ${i + 1}`));
  headlines[3] = block("headline", "This headline is thirty-one chars");
  headlines[5] = block("headline", "Headline number 1");
  headlines[6] = block("headline", "FREE SHIPPING TODAY");
  headlines[7] = block("headline", "Order now!");
  const descriptions = Array.from({ length: 4 }, (_, i) => block("paragraph", `Description ${i + 1} with a claim, a proof and a CTA.`, null, { platform_field: "description" }));
  descriptions[1] = block("paragraph", "x".repeat(91), null, { platform_field: "description" });
  const r = analyzeDraft([section("headlines", headlines), section("descriptions", descriptions)], FORMATS.google_rsa);
  for (const g of ["google_rsa.headline_chars<=30", "google_rsa.description_chars<=90", "google_rsa.no_duplicate_headlines", "google_rsa.no_all_caps_headlines", "google_rsa.no_exclamation_headlines"]) {
    assert(r.format_gate_failures.some((x) => x.startsWith(g)), `${g} should fail: ${r.format_gate_failures.join("; ")}`);
  }
  assert(!r.format_gate_failures.some((x) => x.startsWith("google_rsa.headline_count")));
  const short = analyzeDraft([section("headlines", headlines.slice(0, 14)), section("descriptions", descriptions.slice(0, 3))], FORMATS.google_rsa);
  assert(short.format_gate_failures.some((x) => x.startsWith("google_rsa.headline_count==15")));
  assert(short.format_gate_failures.some((x) => x.startsWith("google_rsa.description_count==4")));
});

Deno.test("Meta ad gates: fold text, headline, variation count, evaluated per variation", () => {
  const variation = (i: number, fold: string) => [
    section(`primary_text#${i}`, [block("paragraph", fold), block("paragraph", "The March batch sold out in 9 days. Order the April one."), block("cta", "Order the April batch")]),
    section(`headline#${i}`, [block("headline", "April batch, 40 jars")]),
  ];
  const ok = analyzeDraft([...variation(1, "40 jars left of the batch a dog opened."), ...variation(2, "The press still runs on its 1961 motor."), ...variation(3, "Thirty people came to the open house in a snowstorm.")], FORMATS.meta_ad);
  assertEquals(ok.format_gate_failures, []);
  const bad = analyzeDraft([...variation(1, "x".repeat(151)), ...variation(2, "fine")], FORMATS.meta_ad);
  assert(bad.format_gate_failures.some((g) => g.startsWith("meta_ad.primary_text_chars<=150")));
  assert(bad.format_gate_failures.some((g) => g.startsWith("meta_ad.variations>=3")));
});

Deno.test("email link gate counts cta and button blocks and URLs; the sequence gate runs per email", () => {
  const two = analyzeDraft([section("cta", [block("cta", "Open the order sheet"), block("button", "Open it")])], FORMATS.email_single);
  assert(two.format_gate_failures.some((g) => g.startsWith("email.links<=1")));
  const one = analyzeDraft([section("cta", [block("cta", "Open the order sheet")]), section("ps", [block("ps", "P.S. The sheet closes Friday.")])], FORMATS.email_single);
  assertEquals(one.format_gate_failures, []);

  const seq = analyzeDraft([
    section("subject#1", [block("subject", "the Tuesday sheet")]), section("cta#1", [block("cta", "Open the sheet")]),
    section("subject#2", [block("subject", "what the dog found")]), section("cta#2", [block("cta", "Open the sheet"), block("cta", "Read the story at https://example.com/dog")]),
    section("subject#3", [block("subject", "last call")]), section("cta#3", [block("cta", "Open the sheet")]),
  ], FORMATS.email_sequence);
  assert(seq.format_gate_failures.some((g) => g.startsWith("email.links<=1")), seq.format_gate_failures.join("; "));
  assert(!seq.format_gate_failures.some((g) => g.startsWith("sequence.emails")));
});

Deno.test("sales letter gates: three CTAs and a close of at least 15%; advisory gates are skipped, not failed", () => {
  const body = Array.from({ length: 200 }, (_, i) => `w${i}`).join(" ");
  const r = analyzeDraft([section("lead", [block("paragraph", body)]), section("close", [block("paragraph", "Order today."), block("cta", "Order"), block("cta", "Order"), block("button", "Order")])], FORMATS.sales_letter);
  const { outcomes } = evaluateGates([section("lead", [block("paragraph", body)])], FORMATS.sales_letter);
  const advisory = outcomes.find((o) => o.gate === "page.speaker_by_word<=150");
  assertEquals(advisory?.ok, null);
  assert(!r.format_gate_failures.some((g) => g.startsWith("page.cta_count")));
  assert(r.format_gate_failures.some((g) => g.startsWith("page.close_share>=0.15")));
});

Deno.test("order form and opt-in gates: fields, Submit, coupon, bullet counts", () => {
  const of = analyzeDraft([section("fields", Array.from({ length: 9 }, (_, i) => block("field", i === 8 ? "Coupon code" : `Field ${i}`))), section("button", [block("button", "Submit")])], FORMATS.order_form);
  for (const g of ["order_form.fields<=8", "order_form.no_submit_button", "order_form.no_coupon_field"]) assert(of.format_gate_failures.some((x) => x.startsWith(g)), g);
  const op = analyzeDraft([section("bullets", [block("bullets", "", ["one", "two"])]), section("button", [block("button", "I want the Tuesday sheet")])], FORMATS.optin);
  assert(op.format_gate_failures.some((x) => x.startsWith("optin.bullet_items>=3")));
  assert(!op.format_gate_failures.some((x) => x.startsWith("optin.no_submit_button")));
});

Deno.test("advertorial label gate accepts the three FTC labels and rejects Promoted", () => {
  const ok = analyzeDraft([section("label", [block("label", "Advertisement")]), section("offer_links", [block("cta", "See the batch"), block("cta", "See the batch")])], FORMATS.advertorial);
  assertEquals(ok.format_gate_failures, []);
  const bad = analyzeDraft([section("label", [block("label", "Promoted")]), section("offer_links", [block("cta", "See the batch"), block("cta", "See the batch")])], FORMATS.advertorial);
  assert(bad.format_gate_failures.some((x) => x.startsWith("advertorial.ftc_label")));
});

Deno.test("raw text analysis skips gates that need block structure", () => {
  const r = analyzeText("A short page with no blocks at all.", { format: FORMATS.sales_letter });
  assertEquals(r.format_gate_failures, []);
});

Deno.test("proof confession: announcing missing proof is a Tier 0 hard reject; ordinary candor is not", () => {
  const spec = FORMATS.landing_page_short;
  const hit = (t: string) => analyzeText(t, { format: spec }).flags.some((f) => f.tell === "proof_confession");
  for (const t of [
    "Legiit Copy is new. No blind evaluation has been run yet, so I won't tell you it sells better than ChatGPT.",
    "Here's what I can't show you yet: a blind test against a plain prompt.",
    "It hasn't been proven to raise conversions.",
    "We have no customer results yet, but here is how it works.",
    "I won't claim this copy outsells your control.",
  ]) assertEquals(hit(t), true, t);
  for (const t of [
    "I won't tell you it's easy. It takes a weekend.",
    "Tested on 40 pages, it held its rate.",
    "No contract, no setup fee, cancel any time.",
    "You can't show a skeptic a promise. You can show him the ledger.",
  ]) assertEquals(hit(t), false, t);
  const r = analyzeText("No blind evaluation has been run yet, so I won't tell you it sells better.", { format: spec });
  assertEquals(r.hard_fail, true);
});

// ---------------------------------------------------------------------------------------------------------------
// The owner's list (§7.1)
// ---------------------------------------------------------------------------------------------------------------

Deno.test("each of the owner's pattern tells 1-10 is caught", () => {
  const cases: [string, string][] = [
    ["quietly", "Legiit quietly passed a million orders last spring."],
    ["three_beat_deep_third", "Not a tool. Not a course. It's a system."],
    ["self_answered_question", "The result? More pages that rank."],
    ["heres_the_windup", "Here's the kicker: the trial is free."],
    ["heres_the_windup", "Here's the part the score hides."],
    ["heres_the_windup", "Here's how it works: you paste a list."],
    ["heres_the_windup", "That's the part nobody talks about."],
    ["worth_noting", "It's worth noting that the trial is free."],
    ["worth_noting", "Keep in mind that the trial ends Friday."],
    ["buzzword_pile", "We double down on what works, at scale."],
    ["genuinely_meaningfully", "A genuinely useful report that meaningfully cuts the work."],
    ["disguise_frame", "It's a keyword list wearing a strategy costume."],
    ["disguise_frame", "A sales pitch masquerading as advice."],
    ["disguise_frame", "Sorting your export by keyword difficulty feels like research. It's where bad content gets made."],
    ["hard_truth", "The hard truth: most pages never rank."],
    ["pressure_test", "We stress test every brief and sanity check the numbers."],
  ];
  for (const [name, text] of cases) {
    const r = analyzeText(text, { format: FORMATS.email_single });
    assert(tells(r, name), `${name} not caught in: ${text} (got ${r.flags.map((f) => f.tell).join(",") || "nothing"})`);
    assertEquals(tells(r, name)?.tier, 1, name);
  }
});

Deno.test("the owner's word lists, formal words and windups are caught", () => {
  const cases: [string, string][] = [
    ["ai_words", "Navigate the landscape towards a robust plan."],
    ["corporate_filler", "When it comes to SEO, a game-changing ecosystem moves the needle."],
    ["corporate_filler", "It is not just a list but a plan."],
    ["guru_speak", "Lean into your truth with an abundance mindset."],
    ["empty_hedge", "Just my two cents, and your mileage may vary."],
    ["formal_words", "Furthermore, you can utilize the report."],
    ["windup_opener", "In today's world, content is everything."],
    ["summary_closer", "In conclusion, the report saves a week."],
  ];
  for (const [name, text] of cases) {
    const r = analyzeText(text, { format: FORMATS.email_single });
    assert(tells(r, name), `${name} not caught in: ${text} (got ${r.flags.map((f) => f.tell).join(",") || "nothing"})`);
  }
  const counted = analyzeText("Navigate the landscape towards a robust plan.", { format: FORMATS.email_single });
  assertEquals(tells(counted, "ai_words")?.count, 4);
});

Deno.test("a question the reader answers, or one followed by an instruction, is not the self-answered question", () => {
  const ok = [
    "How many of the posts you paid for last year rank on page one today? Open your analytics and count them.",
    "Ready? Click the button below.",
    "Which keyword would you build first if you had to bet your own money on the page ranking by June?",
  ];
  for (const t of ok) assertEquals(tells(analyzeText(t, { format: FORMATS.email_single }), "self_answered_question"), undefined, t);
  for (const t of ["Why? Because the score never looked at your site.", "The catch? There isn't one.", "What changed? We stopped guessing."]) {
    assert(tells(analyzeText(t, { format: FORMATS.email_single }), "self_answered_question"), t);
  }
});

Deno.test("owner words inside quotations, testimonials, proper nouns and the offer's own words are exempt; em dashes are not", () => {
  const quoted = analyzeText("One buyer wrote: \"It helped me navigate the whole landscape.\" Another said “it is robust”.", { format: FORMATS.email_single });
  assertEquals(tells(quoted, "ai_words"), undefined, "a verbatim keeps its words");
  const testimonial = analyzeDraft([section("proof", [block("testimonial", "It helped me navigate a robust plan towards launch.")])], FORMATS.sales_letter);
  assertEquals(tells(testimonial, "ai_words"), undefined);
  const proper = analyzeText("Our clients include Realm Health and Beacon Dental.", { format: FORMATS.email_single });
  assertEquals(tells(proper, "ai_words"), undefined, proper.flags.map((f) => f.examples.join(" / ")).join("; "));
  const own = analyzeText("We install landscape lighting in two days.", { format: FORMATS.email_single, exemptTerms: exemptTermsFrom("Bright Landscape Lighting") });
  assertEquals(tells(own, "ai_words"), undefined, "landscape is the literal name of what this offer sells");
  const other = analyzeText("We install landscape lighting in two days.", { format: FORMATS.email_single });
  assertEquals(tells(other, "ai_words")?.count, 1);
  const quotedDash = analyzeText("She said, \"It was slow — painfully slow.\"", { format: FORMATS.email_single });
  assertEquals(tells(quotedDash, "em_dash")?.count, 1, "the owner's never-rules apply inside quotations too");
  assertEquals(blankQuotes("a \"b c\" d").length, "a \"b c\" d".length);
});

Deno.test("the stack: one owner tell is not the giveaway, two in a piece are a hard fail", () => {
  assertEquals(OWNER_STACK, 2);
  const one = analyzeText("Our report is genuinely short. It shows six numbers and takes two minutes to read.", { format: FORMATS.email_single });
  assertEquals(one.owner_tells, 1);
  assertEquals(one.hard_fail, false, one.hard_fail_reasons.join("; "));
  const two = analyzeText("Our report is genuinely short. It's worth noting that it takes two minutes to read.", { format: FORMATS.email_single });
  assertEquals(two.owner_tells, 2);
  assert(two.hard_fail);
  assert(two.hard_fail_reasons.some((x) => x.startsWith("owner_stack: 2")), two.hard_fail_reasons.join("; "));
});

Deno.test("the hooks the owner rejected are caught", () => {
  for (const t of [
    "Sorting your Ahrefs export by keyword difficulty feels like research. It's where bad content gets made.",
    "Here's the part the score hides. The keyword was never your competition.",
    "Here's the rule I'd put on the wall of every content team: build only the pages you can win.",
  ]) {
    const r = analyzeText(t, { format: FORMATS.organic_social });
    assert(r.owner_tells && r.owner_tells >= 1, `${t}: ${r.flags.map((f) => f.tell).join(",")}`);
  }
});

Deno.test("near-variants: a reworded windup, an empty teaser and the 'X was never Y. Z is.' reframe are caught", () => {
  const cases: [string, string][] = [
    ["heres_the_windup", "The score hides this: the keyword was never the problem."],
    ["heres_the_windup", "Do this: open your analytics tonight."],
    ["empty_teaser", "And the guess starts one step earlier than you think."],
    ["empty_teaser", "A volume column checks neither, and that is where the trouble starts."],
    ["empty_teaser", "First, though, look at the pages that rank."],
    ["disguise_frame", "The keyword was never your competition. The pages ranking for it are."],
    ["disguise_frame", "Your list isn't the problem. Your process is."],
  ];
  for (const [name, text] of cases) {
    const r = analyzeText(text, { format: FORMATS.organic_social });
    assert(tells(r, name), `${name} not caught in: ${text} (got ${r.flags.map((f) => f.tell).join(",") || "nothing"})`);
  }
  for (const ok of ["The price is $49. It ships Monday.", "Write it down: open rate, click rate, sales.", "The plan is not cheap. It costs $59 a month and pays for itself in one page."]) {
    const r = analyzeText(ok, { format: FORMATS.organic_social });
    assertEquals(r.flags.filter((f) => ["disguise_frame", "empty_teaser", "heres_the_windup"].includes(f.tell)).map((f) => f.tell), [], ok);
  }
});

// ---------------------------------------------------------------------------------------------------------------
// The owner's list: review fixes (sentence starts, Title Case, overlaps, offer words, FAQ, per-piece stack)
// ---------------------------------------------------------------------------------------------------------------

Deno.test("a word that opens a later sentence of a block is counted, not taken for a proper noun", () => {
  const cases: [string, string][] = [
    ["formal_words", "The report is fast. Furthermore, it is cheap."],
    ["summary_closer", "You get six numbers every Monday. In conclusion, the report saves a week."],
    ["windup_opener", "Hi Sam. In today's world, content is everything."],
    ["empty_teaser", "The fix is simple. First, though, look at the page."],
    ["formal_words", "One buyer said \"it is the best arm I own.\" Furthermore, it ships free."],
    ["ai_words", "Three things:\n- Unlock the full list\n- See the rest"],
    ["formal_words", "Utilize the report."],
  ];
  for (const [name, text] of cases) {
    const r = analyzeText(text, { format: FORMATS.email_single });
    assert(tells(r, name), `${name} not caught in: ${text} (got ${r.flags.map((f) => f.tell).join(",") || "nothing"})`);
  }
});

Deno.test("capitals in a Title Case or all-caps line say nothing about names; a capitalised word mid-sentence still does", () => {
  const subject = analyzeDraft([section("email", [block("subject", "How to Navigate the Landscape and Elevate Your Results")])], FORMATS.email_single);
  assertEquals(tells(subject, "ai_words")?.count, 3);
  const headline = analyzeText("Unlock Seamless, Robust Rankings With a Bespoke, Game-Changing Plan", { format: FORMATS.landing_page_short });
  assertEquals(headline.owner_tells, 5);
  assertEquals(analyzeText("This is a ROBUST, SEAMLESS plan.", { format: FORMATS.email_single }).owner_tells, 2);
  assertEquals(analyzeText("Ship it, IMHO.", { format: FORMATS.email_single }).owner_tells, 1);
  assertEquals(analyzeText("I log into the Realm app and the Harness dashboard every day.", { format: FORMATS.email_single }).owner_tells, 0);
  assertEquals(analyzeText("We watched Masters of the Universe again.", { format: FORMATS.email_single }).owner_tells, 0);
});

Deno.test("one phrase is one tell: overlapping owner matches count once", () => {
  for (const t of ["Here's the hard truth: most pages never rank.", "In today's landscape, content is everything.", "Not just a tool, not just a course, but a system."]) {
    const r = analyzeText(t, { format: FORMATS.email_single });
    assertEquals(r.owner_tells, 1, `${t}: ${r.flags.map((f) => `${f.tell}x${f.count}`).join(",")}`);
    assertEquals(r.hard_fail_reasons.some((x) => x.startsWith("owner_stack")), false, t);
  }
});

Deno.test("literal product language is not a pattern tell; the offer's own words are exempt from patterns too", () => {
  const veneer = analyzeText("We bond a chipped tooth with a porcelain veneer in one visit. A smile with a porcelain veneer lasts 15 years.", { format: FORMATS.landing_page_short, exemptTerms: exemptTermsFrom("Porcelain Veneers in One Visit") });
  assertEquals(veneer.owner_tells, 0);
  assertEquals(analyzeText("Every kid in a dinosaur costume gets a free photo. Kids dressed as superheroes get in free.", { format: FORMATS.landing_page_short }).owner_tells, 0);
  assertEquals(analyzeText("It runs quietly at 24 dB on low, so you can sleep through the noise.", { format: FORMATS.product_description }).owner_tells, 0);
  assertEquals(tells(analyzeText("It is a sales pitch dressed as a tutorial.", { format: FORMATS.email_single }), "disguise_frame")?.count, 1);
  assertEquals(tells(analyzeText("Legiit quietly passed a million orders.", { format: FORMATS.email_single }), "quietly")?.count, 1);
  // one buzzword is not a pile
  assertEquals(analyzeText("We grow content at scale for local shops.", { format: FORMATS.email_single }).owner_tells, 0);
  assertEquals(tells(analyzeText("We grow content at scale and we double down on what ranks.", { format: FORMATS.email_single }), "buzzword_pile")?.count, 1);
});

Deno.test("offer terms split on hyphens and leave out function words", () => {
  assertEquals(exemptTermsFrom("Cutting-Edge Dental"), ["cutting-edge", "cutting", "edge", "dental"]);
  assertEquals(exemptTermsFrom("Fix Your Funnel"), ["funnel"]);
  assertEquals(analyzeText("Cutting-edge dental care in one visit. Book a cutting-edge cleaning today.", { format: FORMATS.landing_page_short, exemptTerms: exemptTermsFrom("Cutting-Edge Dental") }).owner_tells, 0);
  assertEquals(analyzeText("Speak your truth.", { format: FORMATS.email_single, exemptTerms: exemptTermsFrom("Fix Your Funnel") }).owner_tells, 1);
});

Deno.test("hashtags that start with a digit are hashtags; #1 is not", () => {
  const r = analyzeText("Day 12 of the sprint. #100DaysOfCode #30DayChallenge", { format: FORMATS.organic_social });
  assertEquals(tells(r, "hashtag")?.count, 2);
  assertEquals(tells(analyzeText("We're #1 in town.", { format: FORMATS.organic_social }), "hashtag"), undefined);
});

Deno.test("self-answered questions: the owner's forms are caught; FAQ answers, buyer questions and calls to action are not", () => {
  for (const t of ["The result?\n\n37 new pages ranked in 90 days.", "Why? Because the score never looks at your site, and the pages that rank were written for one buyer with one problem on one afternoon.", "The fix? Use the score as a filter."]) {
    assert(tells(analyzeText(t, { format: FORMATS.email_single }), "self_answered_question"), t);
  }
  const headline = analyzeDraft([section("hero", [block("headline", "The result? More pages that rank.")])], FORMATS.landing_page_short);
  assert(tells(headline, "self_answered_question"), "a headline that asks and answers itself");
  for (const t of ["Can I cancel? Yes, from the billing page.", "Ready? Click the button below."]) {
    assertEquals(tells(analyzeText(t, { format: FORMATS.email_single }), "self_answered_question"), undefined, t);
  }
  const faq = analyzeDraft([section("body#7", [
    block("paragraph", "Does it work on a new site? Yes. Two of the five case studies started under 40 pages.", null, { item: "7", role: "mid_cart_faq" }),
    block("paragraph", "Is there a contract? No. You cancel from the billing page in one click.", null, { item: "7", role: "mid_cart_faq" }),
  ])], FORMATS.email_sequence);
  assertEquals(tells(faq, "self_answered_question"), undefined, "an FAQ email answers the buyer's questions");
  const faqSection = analyzeDraft([section("faq", [block("paragraph", "Is there a contract? No. You cancel in one click.")])], FORMATS.pricing_page);
  assertEquals(tells(faqSection, "self_answered_question"), undefined);
});

Deno.test("a lone question is the reader's to answer (rule 22), not an unanswered opener; Imagine still is", () => {
  const r = analyzeText("How many of the posts you paid for last year rank on page one today?\n\nOpen your analytics and count them.", { format: FORMATS.email_single });
  assertEquals(tells(r, "unanswered_opener"), undefined);
  assertEquals(tells(analyzeText("Worth a look?", { format: FORMATS.cold_email }), "unanswered_opener"), undefined);
  assert(tells(analyzeText("Imagine never worrying about dinner again.\n\nIt would be nice.", { format: FORMATS.email_single }), "unanswered_opener"));
});

Deno.test("quotations: inch marks never open one, scare quotes are scanned, a quote keeps the next sentence anchored", () => {
  const knife = analyzeText("The 6\" chef knife is genuinely sharp, it quietly outlasts cheaper blades, and the 8\" model ships free.", { format: FORMATS.product_description });
  assertEquals(knife.owner_tells, 2);
  assertEquals(tells(analyzeText("They sell \"seamless\" reports.", { format: FORMATS.email_single }), "ai_words")?.count, 1);
  assertEquals(blankQuotes("He said \"it is the best arm I own.\" Then").indexOf("."), "He said \"it is the best arm I own".length);
});

Deno.test("tells 2, 4, 5 and 9 catch the near-variants of the owner's own examples", () => {
  const cases: [string, string][] = [
    ["corporate_filler", "It's not just a tool, it's a partner."],
    ["three_beat_deep_third", "Our promise: No fluff. No theory. Just results."],
    ["three_beat_deep_third", "Not a tool. Not a course. A system."],
    ["three_beat_deep_third", "No fluff. No theory. Real results."],
    ["three_beat_deep_third", "It's not about the money. It's not about the fame. It's about the freedom."],
    ["three_beat_deep_third", "This isn't a tool. This isn't a course. It's a system."],
    ["hard_truth", "Hard truth: most pages never rank."],
    ["hard_truth", "The Uncomfortable Truth About Keyword Tools"],
    ["worth_noting", "It's important to note that the trial is free."],
    ["worth_noting", "It should be noted that the trial is free."],
    ["worth_noting", "It is worth bearing in mind that the trial is free."],
    ["heres_the_windup", "Here's the one number that matters: revenue per page."],
    ["heres_the_windup", "Here's why your pages never rank"],
    ["label_windup", "My rule: never pay for a keyword tool you open once a month."],
    ["label_windup", "So for any keyword, I'd ask two things. Who searches, and what do they buy?"],
    ["label_windup", "Two questions decide it."],
    ["label_windup", "Then one more check cuts the list again: does a page like yours rank?"],
    ["empty_hedge", "Difficulty is a guess, in my view."],
  ];
  for (const [name, text] of cases) {
    const r = analyzeText(text, { format: FORMATS.email_single });
    assert(tells(r, name), `${name} not caught in: ${text} (got ${r.flags.map((f) => f.tell).join(",") || "nothing"})`);
  }
  for (const ok of ["The two plans cost $49 and $99.", "Price: $49 a month.", "Bonus: the audit template."]) {
    assertEquals(analyzeText(ok, { format: FORMATS.email_single }).owner_tells, 0, ok);
  }
});

Deno.test("the stack is per piece: one owner word in each email of a sequence is not a stack; two in one email are", () => {
  const seq = (texts: string[][]) => analyzeDraft(texts.map((ps, i) => section(`body#${i + 1}`, ps.map((p) => block("paragraph", p, null, { item: String(i + 1) })))), FORMATS.email_sequence);
  const spread = seq([["The report is genuinely short."], ["We built a robust export."], ["When it comes to pages, ship one a week."]]);
  assertEquals(spread.owner_tells, 3);
  assertEquals(spread.hard_fail_reasons.some((x) => x.startsWith("owner_stack")), false, spread.hard_fail_reasons.join("; "));
  const stacked = seq([["The report is genuinely short. We built a robust export."], ["Ship one page a week."]]);
  assert(stacked.hard_fail_reasons.some((x) => x.startsWith("owner_stack: 2")), stacked.hard_fail_reasons.join("; "));
  // a single-piece format still counts the whole draft
  const page = analyzeDraft([section("hero", [block("headline", "A robust plan")]), section("body", [block("paragraph", "It is genuinely short.")])], FORMATS.landing_page_short);
  assert(page.hard_fail_reasons.some((x) => x.startsWith("owner_stack: 2")));
});

Deno.test("the self-answered question scan is linear on text with no sentence punctuation", () => {
  const t0 = performance.now();
  analyzeText("keyword, ".repeat(5000), { format: FORMATS.email_single });
  assert(performance.now() - t0 < 500, `took ${performance.now() - t0} ms`);
});

Deno.test("a spaced hyphen between words used as a dash is the em dash tell", () => {
  assertEquals(tells(analyzeText("It works - fast.", { format: FORMATS.email_single }), "em_dash")?.count, 1);
  for (const ok of ["A well-known, built-in check.", "Open 9-5.", "- Unlock the list", "It costs 12 - 3 dollars less."]) {
    assertEquals(tells(analyzeText(ok, { format: FORMATS.email_single }), "em_dash"), undefined, ok);
  }
});

Deno.test("residuals: a sentence after a closing quote mark is still a sentence; a quoted headline with no source is scanned", () => {
  assertEquals(tells(analyzeText("She told me, \"It worked.\" The truth is, it took six weeks.", { format: FORMATS.email_single }), "hard_truth")?.count, 1);
  assertEquals(tells(analyzeText("He said, \"Not yet.\" Furthermore, it is free.", { format: FORMATS.email_single }), "formal_words")?.count, 1);
  const unsourced = analyzeDraft([section("hero", [block("headline", "“Here’s the Kicker: I Unlocked a Seamless, Robust Way to Navigate Google”")])], FORMATS.landing_page_short);
  assert((unsourced.owner_tells ?? 0) >= 3, `${unsourced.owner_tells}`);
  const sourced = analyzeDraft([section("hero", [block("headline", "“This tool was a game-changer for our agency” [[L:abcd1234-0000-0000-0000-000000000000]]")])], FORMATS.landing_page_short);
  assertEquals(sourced.owner_tells, 0, "a sourced quotation keeps its words");
  assertEquals(tells(analyzeText("Mark wrote 'it is a robust tool' in his review.", { format: FORMATS.email_single }), "ai_words"), undefined);
});

Deno.test("residuals: a machine that runs quietly and a cardiac or load stress test are literal; the tells still count", () => {
  assertEquals(analyzeText("It runs quietly all night. Even on turbo it runs quietly.", { format: FORMATS.product_description }).owner_tells, 0);
  assertEquals(analyzeText("Book a stress test with our cardiologist this week. The stress test takes 40 minutes.", { format: FORMATS.landing_page_short }).owner_tells, 0);
  assertEquals(analyzeText("We stress test your site with 10,000 users.", { format: FORMATS.landing_page_short }).owner_tells, 0);
  assertEquals(tells(analyzeText("Let's stress test this plan before you pay a writer.", { format: FORMATS.email_single }), "pressure_test")?.count, 1);
  assertEquals(tells(analyzeText("The tool quietly runs in the background.", { format: FORMATS.email_single }), "quietly")?.count, 1);
  assertEquals(tells(analyzeText("It runs quietly in the background, checking your rankings.", { format: FORMATS.email_single }), "quietly")?.count, 1);
});
