import { assert, assertEquals } from "@std/assert";
import type { Block, Section } from "../schemas/draft.ts";
import { MechanicalReport } from "../schemas/review.ts";
import { FORMATS } from "../formats/index.ts";
import { analyzeDraft, analyzeText, evaluateGates, fleschKincaidGrade, NON_TELLS, sentenceLengthCV, syllables, TELL_THRESHOLDS, TELLS } from "../tells.ts";

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

// ---------------------------------------------------------------------------------------------------------------
// Known-bad AI drafts from the research corpus
// ---------------------------------------------------------------------------------------------------------------

Deno.test("an AI-style email from the corpus hard-fails on Tier 0 and scores above the flag threshold", async () => {
  const r = analyzeText(await corpus("opus_email_05.txt"), { format: FORMATS.email_single });
  MechanicalReport.parse(r);
  assert(r.hard_fail);
  assert(r.tell_score_per_300 > TELL_THRESHOLDS.flag, `score ${r.tell_score_per_300}`);
  const tier0 = r.flags.filter((f) => f.tier === 0).map((f) => f.tell);
  for (const t of ["bold_label_colon", "bracket_placeholder", "assistant_residue", "emoji_bullet"]) assert(tier0.includes(t), `expected tier 0 ${t}, got ${tier0.join(",")}`);
  assert(tells(r, "thats_why_we_built"), "That's why we built");
  assert(r.hard_fail_reasons.some((x) => x.startsWith("tier0:")));
});

Deno.test("an AI-style VSL opener from the corpus trips the VSL opener promise and the residue block", async () => {
  const r = analyzeText(await corpus("haiku_vsl_opener_00.txt"), { format: FORMATS.vsl_long });
  assert(r.hard_fail);
  assert(tells(r, "vsl_opener_promise"));
  assert(tells(r, "cancel_anytime_triad"));
  assert(tells(r, "bracket_placeholder"));
  assert(tells(r, "assistant_residue"));
});

Deno.test("every draft in the AI corpus scores at or above the review flag", async () => {
  let count = 0;
  for await (const e of Deno.readDir(CORPUS)) {
    if (!e.name.endsWith(".txt")) continue;
    const r = analyzeText(await corpus(e.name), { format: FORMATS.email_single });
    assert(r.tell_score_per_300 >= TELL_THRESHOLDS.flag, `${e.name}: ${r.tell_score_per_300}`);
    count++;
  }
  assert(count >= 100, `corpus has ${count} docs`);
});

// ---------------------------------------------------------------------------------------------------------------
// Human-style copy and the non-tells
// ---------------------------------------------------------------------------------------------------------------

const HUMAN = `Dear Friend,

If you've ever lain awake at 3 a.m. wondering how you're going to make payroll on Friday... this letter is for you.

Here's what happened to me in the spring of 1987. I was BROKE. Flat broke. I had $128.42 in my checking account and a stack of bills on the kitchen table that was taller than my coffee cup.

Then a man named Jim Straw sent me a letter — four pages, typed on a manual typewriter — that changed everything. I still have it.

Here's what he told me, and I want you to read this twice:

"The money is in the list. The LIST."

I didn't believe him. So I tested it. I mailed 2,000 letters to a list of people who had bought a $39 course on coin collecting in the previous 90 days. The letter was ugly. It had two typos! But it pulled 4.1%, which at $79 a sale came to $6,478 on a $1,100 mailing.

That was the first time I ever made money in my sleep. It was not the last.

Look. I am not going to tell you this is easy. It isn't. You will mail letters that die. I have mailed letters that lost $20,000 in a week. But the ones that work... they work for YEARS!

So here is what I want you to do. Get out a pen. Write down the name of the one market you know better than anyone you've ever met. Then call me at the number below.

Sincerely,

Gary

P.S. The coin-collecting letter is reprinted on page 14 of the enclosed booklet, with my notes in the margin. Read it before you call.`;

Deno.test("human-style copy with caps, fragments, ellipses, exclamation marks, Dear Friend and P.S. is not penalised", () => {
  // the sample really does carry the non-tells
  assert((HUMAN.match(/!/g) ?? []).length >= 2);
  assert((HUMAN.match(/\.\.\./g) ?? []).length >= 2);
  assert(/\b[A-Z]{4,}\b/.test(HUMAN));
  assert(/Dear Friend/.test(HUMAN) && /P\.S\./.test(HUMAN) && /Here's what/.test(HUMAN));

  const r = analyzeText(HUMAN, { format: FORMATS.email_single });
  MechanicalReport.parse(r);
  assertEquals(r.hard_fail, false, r.hard_fail_reasons.join("; "));
  assert(r.tell_score_per_300 < TELL_THRESHOLDS.flag, `score ${r.tell_score_per_300}: ${r.flags.map((f) => f.tell).join(",")}`);
  assertEquals(r.flags.filter((f) => f.tier === 0).length, 0);
  assertEquals(r.flags.filter((f) => f.tier === 1).length, 0, r.flags.map((f) => f.tell).join(","));
  assertEquals(r.format_gate_failures, []);
  // no rule in the table targets a §7 non-tell
  const names = TELLS.map((t) => t.name);
  for (const nt of ["exclaim", "ellipsis", "caps_word", "fragment_rows", "heres_what", "dear_friend", "ps", "em_dash"]) assert(!names.includes(nt), nt);
  assert(NON_TELLS.some((x) => x.name === "em_dashes"));
});

Deno.test("loud punctuation alone produces no flags at all", () => {
  const loud = "WAIT! Don't go yet!!! Here's why... the price DOUBLES at midnight. No kidding. Really. Call NOW! Or don't... your choice!";
  const r = analyzeText(loud, { format: FORMATS.email_single });
  assertEquals(r.flags, []);
  assertEquals(r.tell_score_per_300, 0);
});

// ---------------------------------------------------------------------------------------------------------------
// Density thresholds behave per 1,000 words
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

const RULE_OF_THREE = "The kit ships with a scale, a timer, and a notebook.";

Deno.test("rule of three is flagged only above 3 per 1,000 words", () => {
  const base = filler(1000); // 1,000-1,100 words: the allowance is exactly three
  const three = analyzeText(`${base}\n\n${RULE_OF_THREE}\n\n${base.slice(0, 0)}${RULE_OF_THREE}\n\n${RULE_OF_THREE}`, { format: FORMATS.sales_letter });
  assert(three.word_count >= 1000 && three.word_count < 1333, `words ${three.word_count}`);
  assertEquals(tells(three, "rule_of_three"), undefined, "three per 1,000 is the human rate");
  const four = analyzeText(`${base}\n\n${RULE_OF_THREE}\n\n${RULE_OF_THREE}\n\n${RULE_OF_THREE}\n\n${RULE_OF_THREE}`, { format: FORMATS.sales_letter });
  const f = tells(four, "rule_of_three");
  assert(f, "four per 1,000 is flagged");
  assertEquals(f.count, 1);
  assertEquals(f.tier, 2);
  assertEquals(f.weight, 2);
});

Deno.test("intensifiers are flagged only above 2 per 1,000 words", () => {
  const base = filler(1000);
  const two = analyzeText(`${base}\n\nIt is actually here. It is exactly here.`, { format: FORMATS.sales_letter });
  assertEquals(tells(two, "intensifier"), undefined);
  const three = analyzeText(`${base}\n\nIt is actually here. It is exactly here. It works every single time.`, { format: FORMATS.sales_letter });
  assertEquals(tells(three, "intensifier")?.count, 1);
});

Deno.test("trailing participles are flagged above 0.6 per 1,000 words", () => {
  const base = filler(1000);
  const r = analyzeText(`${base}\n\nThe plan runs itself, giving you the evening back.`, { format: FORMATS.sales_letter });
  assertEquals(tells(r, "trailing_participle")?.count, 1);
  const stop = analyzeText(`${base}\n\nWe met at the store, morning after morning.`, { format: FORMATS.sales_letter });
  assertEquals(tells(stop, "trailing_participle"), undefined, "stop-list -ing nouns are not participles");
});

Deno.test("short copy uses the density floor so one hit is not a density", () => {
  const r = analyzeText("The kit ships with a scale, a timer, and a notebook. Order by Friday.", { format: FORMATS.sms });
  assertEquals(tells(r, "rule_of_three"), undefined);
});

Deno.test("Tier 3 never scores alone, but counts once a Tier 1 or 2 tell is present", () => {
  const base = filler(600);
  const alone = analyzeText(`${base}\n\nIt was a game-changer for the shop.`, { format: FORMATS.sales_letter });
  assertEquals(tells(alone, "phrase_4o_era")?.count, 1);
  assertEquals(alone.tell_score_per_300, 0);
  const withTier1 = analyzeText(`${base}\n\nIt was a game-changer for the shop. That's why we built the kit.`, { format: FORMATS.sales_letter });
  assert(withTier1.tell_score_per_300 > 0);
  // weights: 4 (tier 1) + 1 (tier 3) over the word count, per 300 words
  assertEquals(withTier1.tell_score_per_300, Math.round((5 * 300 / Math.max(withTier1.word_count, 300)) * 100) / 100);
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

Deno.test("bold-label-colon bullets are Tier 0; plain bold lead-ins are Tier 1 with the opt-in allowance", () => {
  const colon = analyzeDraft([section("body", [block("bullets", "", ["**Speed:** get reports in minutes", "**Accuracy:** every number checked"])])], FORMATS.email_single);
  assertEquals(tells(colon, "bold_label_colon")?.tier, 0);
  assert(colon.hard_fail);

  const leadins = ["**Seven dinners planned.** One relaxed weekend cook.", "**A list sorted by aisle.** Shop once.", "**Prep notes.** Cut weeknight time."];
  const email = analyzeDraft([section("body", [block("bullets", "", leadins)])], FORMATS.email_single);
  assertEquals(tells(email, "bold_leadin_bullet")?.count, 3);
  const optin = analyzeDraft([section("bullets", [block("bullets", "", leadins)])], FORMATS.optin);
  assertEquals(tells(optin, "bold_leadin_bullet"), undefined, "opt-in allows five plain bold lead-ins");
});

Deno.test("emoji bullets are Tier 0 in email and allowed up to three in a Meta ad", () => {
  const items = ["✅ Syncs your sales", "✅ Sorts your expenses", "✅ Shows real profit"];
  const email = analyzeDraft([section("body", [block("bullets", "", items)])], FORMATS.email_single);
  assertEquals(tells(email, "emoji_bullet")?.tier, 0);
  const metaOk = analyzeDraft([section("primary_text#1", [block("paragraph", "Books done by Friday."), block("bullets", "", items)])], FORMATS.meta_ad);
  assertEquals(tells(metaOk, "emoji_bullet"), undefined);
  assertEquals(tells(metaOk, "emoji_bullets_over_allowance"), undefined);
  const metaOver = analyzeDraft([section("primary_text#1", [block("bullets", "", [...items, "🚀 Ready for tax time"])])], FORMATS.meta_ad);
  assertEquals(tells(metaOver, "emoji_bullets_over_allowance")?.count, 1);
  assert(metaOver.format_gate_failures.some((g) => g.startsWith("meta_ad.emoji_bullets<=3")));
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

Deno.test("anaphora triads and No/No/Just are structural Tier 2 tells", () => {
  const r = analyzeDraft([section("body", [block("paragraph", "They skip it. They forget it. They regret it. No fluff. No theory. Just results.")])], FORMATS.email_single);
  assertEquals(tells(r, "anaphora_triad")?.count, 1);
  assertEquals(tells(r, "no_no_just")?.count, 1);
});

Deno.test("hedges are counted in body copy but not inside testimonials", () => {
  const r = analyzeDraft([section("body", [block("testimonial", "It usually takes me a week, and it may take you longer.")])], FORMATS.email_single);
  assertEquals(tells(r, "hedge"), undefined);
  const body = analyzeDraft([section("body", [block("paragraph", "It usually takes a week. It may take longer. It often does.")])], FORMATS.email_single);
  assertEquals(tells(body, "hedge")?.count, 3);
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

Deno.test("cadence flag fires on flat sentence length over 300+ words and not on varied copy", () => {
  const flat = Array.from({ length: 40 }, (_, i) => `The driver left the crate at the ${i % 2 ? "front" : "back"} door on Monday.`).join(" ");
  const r = analyzeText(flat, { format: FORMATS.email_single });
  assert(r.word_count >= 300);
  assert(r.cadence_cv !== null && r.cadence_cv < 0.7);
  assertEquals(r.cadence_flag, true);
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
