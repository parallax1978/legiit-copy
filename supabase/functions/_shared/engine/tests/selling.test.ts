import { assert, assertEquals } from "@std/assert";
import { ARGUMENT_SELECTION, CLAIMS_AND_FACTUAL_REVIEW, COPY_CHIEF_RUBRIC, PROOF_PLACEMENT, RULES } from "../prompts/standard.ts";
import argumentPrompt from "../prompts/argument.v18.ts";
import { draftPrompt } from "../prompts/draft.v16.ts";
import { revisePrompt } from "../prompts/revise.v16.ts";
import { editorialPrompt } from "../prompts/editorial.v17.ts";
import { factualPrompt } from "../prompts/factual.v14.ts";
import offerPrompt from "../prompts/offer.v16.ts";
import researchPrompt from "../prompts/research.v11.ts";

// The owner's rule: the copy sells the result (rankings, customers, sales, money) whether or not results are on file;
// the only hard stop is invented proof. These pin the rules that say so where every step reads them.

Deno.test("standard: the piece sells the result; only a number, rate, time or someone's result needs data", () => {
  assert(RULES.includes("8. Sell the result."));
  assert(RULES.includes("An offer with no customer results on file is sold on everything in that list but the results, at the same strength"));
  assert(RULES.includes("never invents one"));
  assert(!RULES.includes("promise the deliverable the ledger covers"), "the deliverable is never the promise");
  assert(RULES.includes("the result they buy the product for (the rankings, the customers, the sales, the money"));
  assert(RULES.includes("never what it could do or what he would do"), "rule 20: no conditional voice");
  assert(RULES.includes("it never sizes a promise down"), "rule 10: precision is about numbers");
  assert(ARGUMENT_SELECTION.includes("never the product's deliverable or output, whether or not results are on file"));
  assert(ARGUMENT_SELECTION.includes("rests on what the reader's tool already shows"));
  assert(PROOF_PLACEMENT.includes("No customer results on file"));
  assert(PROOF_PLACEMENT.includes("proves nothing"));
});

Deno.test("standard: the reviewers never treat an outcome promise, reasoning or the reader's pain as an unsupported claim", () => {
  assert(COPY_CHIEF_RUBRIC.includes("if the piece never says what the reader ends up with"));
  assert(COPY_CHIEF_RUBRIC.includes("Naming the result the product produces is never outrunning the first week"));
  assert(!COPY_CHIEF_RUBRIC.includes("if the promise outruns the first-week experience or refund window"));
  assert(COPY_CHIEF_RUBRIC.includes("a direction never sizes a promise down or adds a hedge"));
  assert(CLAIMS_AND_FACTUAL_REVIEW.includes("| Outcome promise ("));
  assert(CLAIMS_AND_FACTUAL_REVIEW.includes("| Reason-why and market logic ("));
  assert(CLAIMS_AND_FACTUAL_REVIEW.includes("| The reader's situation and its cost ("));
  // grade F still sells the result for anything but a health product
  assert(CLAIMS_AND_FACTUAL_REVIEW.includes("| F | No outside evidence of results | Any product but a health product: the result it produces, promised at full strength"));
  assert(CLAIMS_AND_FACTUAL_REVIEW.includes("are not strength flags"));
  assert(CLAIMS_AND_FACTUAL_REVIEW.includes("it never sizes an outcome promise down"));
});

Deno.test("prompts: every step that writes, reviews or plans copy carries the selling rules", () => {
  assertEquals([argumentPrompt.version, draftPrompt.version, revisePrompt.version, editorialPrompt.version, factualPrompt.version, offerPrompt.version, researchPrompt.version], [18, 16, 16, 17, 14, 16, 11]);
  for (const [name, system] of [["argument", argumentPrompt.system], ["draft", draftPrompt.system], ["revise", revisePrompt.system], ["editorial", editorialPrompt.system], ["offer", offerPrompt.system]] as const) {
    assert(system.includes("8. Sell the result."), `${name} lacks rule 8`);
  }
  assert(argumentPrompt.system.includes("never the product's deliverable, output or a feature, whether or not results are on file"));
  assert(argumentPrompt.system.includes("A promise of the result needs no result row"));
  assert(argumentPrompt.system.includes("a mechanism built from a column, a score or a filter the reader's tool already has scores at most 1"));
  assert(draftPrompt.system.includes("5. Sell the result (rule 8)."));
  assert(!draftPrompt.system.includes("An unsupported claim is not hedged into existence; it is cut."));
  assert(!draftPrompt.system.includes("A claim the ledger cannot carry is sized down to what it can carry, or cut."));
  assert(draftPrompt.system.includes("The promise of the result, reason-why logic the market accepts, the reader's situation and how the product works as the brief describes it need no row and never take the mark."));
  assert(!draftPrompt.system.includes("The one damaging admission is true, minor"), "an admission is never presumed");
  assert(revisePrompt.system.includes("never sizes a promise down"));
  assert(editorialPrompt.system.includes("fail Gate A and point the do at what this product does with it that the reader's tool does not"));
  assert(editorialPrompt.system.includes("A note on a promise strengthens its carrier from what is on file"));
  assert(factualPrompt.system.includes("- Not flags (§8.1, §8.3 test 2): the promise of the result the product produces"));
  assert(factualPrompt.system.includes("you may not size an outcome promise down"));
  assert(offerPrompt.system.includes("The note is about timing only"));
  assert(!offerPrompt.system.includes("either size the promise down or add a component"));
  assert(researchPrompt.system.includes("what its users already get from it"));
});

// ---------------------------------------------------------------- the guards behind the rules (round 5)

import { admissionsAdded, admissionsIn } from "../draft/admissions.ts";
import { applyEdits, guardEdit, promiseStems, statesPromise, type EditUnit } from "../draft/tell_edit.ts";
import { reconcileRevision } from "../draft/review.ts";
import type { Block, Section } from "../schemas/draft.ts";
import type { RevisionOutput } from "../schemas/review.ts";

Deno.test("admissions: an edit may cut one, never write one or reword one", () => {
  // the round-5 path: the ledger row's "planned" came back, then the tell edit reworded it
  assertEquals(admissionsIn("Look at the plan for Pull Shot Coffee, a planned espresso bean subscription."), ["a planned espresso bean subscription"]);
  assertEquals(admissionsAdded("Pull Shot Coffee, built for an espresso bean subscription.", "Pull Shot Coffee, a planned espresso bean subscription."), ["a planned espresso bean subscription"]);
  assertEquals(admissionsAdded("a planned espresso bean subscription", "an espresso bean subscription that hasn't launched yet"), ["hasn't launched"]);
  assertEquals(admissionsAdded("Pull Shot Coffee, a planned espresso bean subscription.", "Pull Shot Coffee, an espresso bean subscription."), []);
  for (const t of ["the product Pull Shot plans to sell", "with no website yet", "it has not launched yet", "no customers yet", "a pre-launch brand"]) assert(admissionsIn(t).length, t);
  // the reader's pain and ordinary plans are not admissions
  for (const t of ["a page that brings traffic but no customers", "the pages you planned last quarter", "plan your next page", "No site needed for a keyword check."]) assertEquals(admissionsIn(t), [], t);
  assert(guardEdit("Look at the plan for Pull Shot Coffee, a planned espresso bean subscription.", "Look at the plan for Pull Shot Coffee, an espresso bean subscription that hasn't launched yet.")?.includes("weakening admission"));
  assertEquals(guardEdit("Look at the plan for Pull Shot Coffee, a planned espresso bean subscription.", "Look at the plan for Pull Shot Coffee, an espresso bean subscription."), null);
});

const unit = (ref: string, text: string, owner: EditUnit["owner"] = "section", ownerId = "main"): EditUnit => ({ ref, owner, ownerId, blockIndex: Number(ref.split("-").at(-1)) - 1, item: null, type: "paragraph", text });

Deno.test("promise guard: the piece's last line that states its promise is never cut; a line that only repeats it may go", () => {
  const promise = promiseStems("rankings on keywords you can actually win, from searches that bring paying customers");
  assert(statesPromise("So the pages you pay for are the ones that rank, for searches that bring paying customers.", promise));
  assert(statesPromise("You get rankings on keywords you can win, from searches that bring paying customers [[L:abc]].", promise));
  assert(!statesPromise("Only keywords that bring customers make the cut.", promise));
  assert(!statesPromise("Ahrefs scores difficulty without reading the pages at the top.", promise));
  const units = [
    unit("main-1", "Ahrefs scores difficulty without reading the pages at the top."),
    unit("main-2", "So the pages you pay for are the ones that rank, for searches that bring paying customers."),
    unit("main-3", "Every skip tells you why."),
  ];
  // the round-5 cut: the only promise line "said again" goes, and the piece is left describing the tool
  const cut = applyEdits(units, [{ ref: "main-2", before: "So the pages you pay for are the ones that rank, for searches that bring paying customers.", after: "", tell: "point said again" }], "social", promise);
  assertEquals(cut.applied.length, 0);
  assert(cut.rejected[0].reason.includes("states its promise"));
  // with a second line that states it, the repeat may go
  const twice = [...units, unit("main-4", "You get rankings on keywords you can win, from searches that bring paying customers.")];
  const ok = applyEdits(twice, [{ ref: "main-2", before: "So the pages you pay for are the ones that rank, for searches that bring paying customers.", after: "", tell: "point said again" }], "social", promise);
  assertEquals(ok.applied.length, 1);
  // a rewrite that keeps the result is fine
  const kept = applyEdits(units, [{ ref: "main-2", before: "So the pages you pay for are the ones that rank, for searches that bring paying customers.", after: "So you pay for pages that rank on searches that bring paying customers.", tell: "tool tour" }], "social", promise);
  assertEquals(kept.applied.length, 1);
  // without a promise the guard is off, as before
  assertEquals(applyEdits(units, [{ ref: "main-2", before: "So the pages you pay for are the ones that rank, for searches that bring paying customers.", after: "", tell: "x" }], "social").applied.length, 1);
  // each opening is its own reading: cutting the promise from the opening that alone carries it is refused
  const withLeads = [unit("main-1", "Every skip tells you why."), unit("lead-a-1", "Rank for the keywords you can win, on searches that bring paying customers.", "lead", "lead-a"), unit("lead-b-1", "You paid a writer for a page that never ranked.", "lead", "lead-b")];
  const lead = applyEdits(withLeads, [{ ref: "lead-a-1", before: "Rank for the keywords you can win, on searches that bring paying customers.", after: "Rank for keywords.", tell: "x" }], "social", promise);
  assertEquals(lead.applied.length, 0);
});

Deno.test("promise guard: the head is the result noun; a feature line never stands in for the promise; a chained cut never lands mid-sentence", () => {
  // the head is the last content word of the promise's first phrase, so an adjective never stands for the result
  const heads: [string, string][] = [
    ["rankings on keywords that bring paying customers", "rank"],
    ["more paying customers from search", "custom"],
    ["a fully booked calendar", "calendar"],
    ["steady energy without coffee", "energy"],
    ["10 new clients a month", "client"],
    ["first-page Google rankings", "rank"],
    ["money from every page you publish", "money"],
    ["more booked jobs from the quotes you already send", "job"],
    ["a full calendar of paying clients", "calendar"],
    ["pages that rank and pay for themselves", "page"],
    ["more customers", "custom"],
    // a relative clause with no "that" ends the head phrase too (the round-6 promise)
    ["rankings you can actually win, on keywords that bring paying customers", "rank"],
    ["customers your site already gets", "custom"],
    ["first-page rankings on searches where the pages you must beat are weak", "rank"],
    ["your site's rankings", "rank"],
  ];
  for (const [p, head] of heads) assertEquals(promiseStems(p).values().next().value, head, p);
  assert(statesPromise("Search sends you customers, week after week.", promiseStems("more paying customers from search")));
  assert(!statesPromise("The tool shows you which searches pay.", promiseStems("more paying customers from search")));
  assert(statesPromise("Your calendar stays booked.", promiseStems("a fully booked calendar")));
  assert(statesPromise("You sign new clients every month.", promiseStems("10 new clients a month")));
  assert(statesPromise("You rank on keywords that bring paying customers.", promiseStems("rankings you can actually win, on keywords that bring paying customers")));
  // a promise of one stem is stated by its one stem
  assert(statesPromise("More customers find you.", promiseStems("more customers")));

  // the round-5 clean run: the argument's promise, the tool's filter line, and the one sentence that said the result
  const promise = promiseStems("rankings on keywords that bring paying customers");
  const feature = "I founded Legiit, and I made Legiit Keywords to make that decision for your site. You get only the keywords that bring customers, and a build, improve or skip call for every group.";
  const line = "You rank on the keywords that bring paying customers, because every page you pay for is one you can win, on a keyword buyers type. It's the best way I know to choose what to publish.";
  assert(!statesPromise(feature, promise), "the filter is not the result");
  assert(!statesPromise("You get the keywords that bring paying customers.", promise), "all the qualifiers without the head are still the filter");
  assert(statesPromise("You get the keywords that bring paying customers.", promise, { loose: true }), "but a loose carrier is protected");
  assert(!statesPromise("You rank for the keywords your buyers search.", promise), "two stems are not enough");
  assert(statesPromise(line, promise));
  assert(statesPromise("Your pages rank on keywords that bring customers.", promise));
  const units = [unit("main-5", feature), unit("main-7", line), unit("main-8", "Enter your site and your first decision shows up in about 20 minutes.")];
  const text7 = (r: ReturnType<typeof applyEdits>) => r.units.find((u) => u.ref === "main-7")?.text;
  const pair = [
    { ref: "main-7", before: line, after: "Every page you pay for is one you can win, on a keyword buyers type.", tell: "restated promise, slogan closer" },
    { ref: "main-7", before: "Every page you pay for is one you can win, on a keyword buyers type.", after: "", tell: "slogan restating the promise" },
  ];
  const r = applyEdits(units, pair, "social", promise);
  assertEquals(r.applied.length, 0);
  assert(r.rejected[0].reason.includes("states its promise"));
  // the second edit was written against the first one's text: its capitalised start never lands inside the original sentence
  assertEquals(r.rejected[1].reason, "the span was not found in that text");
  assertEquals(text7(r), line);
  // the same holds in a later call (the retry), which knows nothing of the first call's refusals
  assertEquals(text7(applyEdits(units, [pair[1]], "social", promise)), line);
  // cut the clause, then cut what is left: the first is refused, the second lands nowhere
  const clause = applyEdits(units, [{ ref: "main-7", before: "You rank on the keywords that bring paying customers, because ", after: "", tell: "x" }, pair[1]], "social", promise);
  assertEquals(clause.applied.length, 0);
  assertEquals(text7(clause), line);
  // a cut written in lower case that ends a sentence it starts inside is refused for the half sentence it leaves
  const half = applyEdits(units, [{ ref: "main-7", before: "every page you pay for is one you can win, on a keyword buyers type.", after: "", tell: "x" }], "social", promise);
  assert(half.rejected[0]?.reason.includes("half a sentence"), JSON.stringify(half.rejected));
  // a whole sentence still goes, curly apostrophe or not; so does a clause without its sentence's end
  for (const t of ["It's", "It’s"]) {
    const curly = applyEdits([unit("main-5", feature), unit("main-7", line.replace("It's", t))], [{ ref: "main-7", before: "It's the best way I know to choose what to publish.", after: "", tell: "x" }], "social", promise);
    assertEquals(curly.applied.length, 1, t);
  }
  assertEquals(applyEdits(units, [{ ref: "main-7", before: ", on a keyword buyers type", after: "", tell: "x" }], "social", promise).applied.length, 1);
  // rewording the only line that states the promise into the filter is a lost promise, too
  const reworded = applyEdits(units, [{ ref: "main-7", before: "You rank on the keywords that bring paying customers", after: "You get the keywords that bring paying customers", tell: "x" }], "social", promise);
  assertEquals(reworded.applied.length, 0);
  // a feature line that loosely carries the promise may go when a line states it
  assertEquals(applyEdits(units, [{ ref: "main-5", before: "You get only the keywords that bring customers, and a build, improve or skip call for every group.", after: "", tell: "tool tour" }], "social", promise).applied.length, 1);
  // a chained edit after an applied one still works
  const chain = applyEdits(units, [
    { ref: "main-8", before: "Enter your site and your first decision shows up in about 20 minutes.", after: "Enter your site; your first decision shows up in about 20 minutes.", tell: "x" },
    { ref: "main-8", before: "Enter your site; your first decision", after: "Enter your site, and your first decision", tell: "y" },
  ], "social", promise);
  assertEquals(chain.applied.length, 2);
});

const b = (id: string, text: string): Block => ({ id, type: "paragraph", text, items: null, meta: null });
const s = (section_id: string, blocks: Block[]): Section => ({ section_id, title: null, blocks });

Deno.test("revision: a fix that writes a weakening admission into a line is reverted; a new block carrying one is dropped", () => {
  const before = [s("main", [b("main-6", "Look at the plan for Pull Shot Coffee, built for an espresso bean subscription."), b("main-7", "Put your own site in.")])];
  const revision: RevisionOutput = {
    sections: [s("main", [b("main-6", "Look at the plan for Pull Shot Coffee, a planned espresso bean subscription."), b("main-6a", "Pull Shot has no website yet."), b("main-7", "Put your own site in and see your first decision in about 20 minutes.")])],
    changes: [
      { block_id: "main-6", before: "", after: "", reason: "mechanical T2 built for", source: "mechanical" },
      { block_id: "main-7", before: "", after: "", reason: "cta", source: "editorial" },
    ],
    untouched_confirmed: [],
  };
  const r = reconcileRevision(before, revision, [], []);
  assertEquals(r.sections[0].blocks.map((x) => x.id), ["main-6", "main-7"]);
  assertEquals(r.sections[0].blocks[0].text, "Look at the plan for Pull Shot Coffee, built for an espresso bean subscription.");
  assert(r.sections[0].blocks[1].text.includes("about 20 minutes"), "the clean change stays");
  assertEquals(r.admissions.sort(), ["main-6", "main-6a"]);
});

// ---------------------------------------------------------------- the one hard stop holds both ways (round 5)

import { dropNoteProblems, noteProblems, pendingFactualFlags, postProcessFactual } from "../draft/review.ts";
import { rowFacts } from "../draft/prompt_text.ts";
import { analyzeText } from "../tells.ts";
import { FORMATS } from "../formats/index.ts";
import type { EditorialVerdict, FactualOutput } from "../schemas/review.ts";

const ROW = "3f1c2a9e-0000-4000-8000-000000000001";
const fl = (over: Partial<FactualOutput["flags"][number]>): FactualOutput["flags"][number] => ({ quote: "", rule: "§8.3 test 10", issue: "x", suggested_rewrite: null, severity: "medium", claim_type: "benefit", claim_id: null, test: 10, fabrication: false, ...over });
const out = (flags: FactualOutput["flags"]): FactualOutput => ({ flags, consistency_check: { ok: true, mismatches: [] }, needs_source: [] });
const ledger = [{ id: ROW, user_decision: null, claim_text: "Every keyword carries Google's cost per click and an intent.", precision: null }];

Deno.test("fabrication: the copy's own argument is never an invention; an item invented beside a real tag still is", () => {
  // reason-why and the reader's situation, labeled fabrications by the reviewer: not inventions, so nothing is cut;
  // with no rewrite the flag goes, and with one it is the user's call at high, never fatal
  const reason = postProcessFactual(out([fl({ quote: "A business that keeps bidding on a search is getting customers from it.", fabrication: true, severity: "fatal", test: 2 })]), ledger);
  assertEquals(reason.output.flags.length, 0);
  assert(reason.dropped.some((d) => d.why.includes("no rewrite")));
  const pain = postProcessFactual(out([fl({ quote: "You paid a writer for a page that never earned back what it cost.", fabrication: true, severity: "fatal", test: 2, suggested_rewrite: "You paid a writer for a page that never earned back what it cost, in your own data." })]), ledger);
  assertEquals([pain.output.flags[0].fabrication, pain.output.flags[0].severity], [false, "high"]);
  // an invented figure next to an unrelated tag stays a fabrication
  const figure = postProcessFactual(out([fl({ quote: `Join 4,000 agencies who see the CPC on every keyword [[L:${ROW}]].`, fabrication: true })]), ledger);
  assertEquals(figure.output.flags[0].fabrication, true);
  // a result attributed to someone, with no figure or name, stays a fabrication too
  const attributed = postProcessFactual(out([fl({ quote: `Our customers rank on page one with the CPC on every keyword [[L:${ROW}]].`, fabrication: true })]), ledger);
  assertEquals(attributed.output.flags[0].fabrication, true);
  const bare = postProcessFactual(out([fl({ quote: "Agencies using it double their traffic.", fabrication: true, test: 2 })]), ledger);
  assertEquals(bare.output.flags[0].fabrication, true);
  // a test 10 catch is never cleared by its type
  const feature = postProcessFactual(out([fl({ quote: "It writes the page for you overnight.", fabrication: true, test: 10, claim_type: "feature" })]), ledger);
  assertEquals(feature.output.flags[0].fabrication, true);
  // the row's own figures and names are the user's claim
  const own = postProcessFactual(out([fl({ quote: `Google's cost per click on every keyword [[L:${ROW}]].`, fabrication: true })]), ledger);
  assertEquals(own.output.flags.length ? own.output.flags[0].fabrication : false, false);
});

Deno.test("fact check: a rewrite that weakens a promise is dropped; only misquote-shaped lines are fixed without the user", () => {
  const weak = postProcessFactual(out([fl({ quote: "A keyword with a price on it is one where searchers buy.", suggested_rewrite: "A keyword with a price on it is one where some searchers do.", test: 2 })]), ledger);
  assertEquals(weak.output.flags.length, 0);
  assert(weak.violations[0].includes("sizes the promise down"));
  const planned = postProcessFactual(out([fl({ quote: "Pull Shot Coffee sells an espresso bean subscription.", suggested_rewrite: "Pull Shot Coffee, a planned espresso bean subscription.", test: 1 })]), ledger);
  assertEquals(planned.output.flags.length, 0, "a weakening admission is never a fix");
  // test 1 on a promise with no figure, quote, name or term waits for the user; a misquoted price is fixed
  const pending = pendingFactualFlags(out([fl({ quote: "You rank for the keywords that bring paying customers.", test: 1 }), fl({ quote: "Pro is $49 a month.", test: 8 })]), []);
  assertEquals(pending.map((f) => f.quote), ["Pro is $49 a month."]);
});

Deno.test("copy chief: a note that asks for proof or hedges its example is retried, then dropped", () => {
  const v = { verdict: "REVISE", reject_gate: null, prediction: "beat", prediction_reason: "r", argument_readback: { sells: "", to: "", promise: "", because: "", matches_memo: true }, skim_readback: "", what_works: [], do_not_touch: [], testable_disputes: [], calibration: { argument: 0, proof: 0, pacing: 0, offer: 0, specificity: 0, reader_focus: 0, rhythm: 0 }, sentence_job_audit: { untagged: [], no_claim_no_proof: [] },
    one_thing: { quote: "A price on a keyword means people buy.", fails: "Rule 8", do: "Size it: \"A keyword with a price on it is one where some searchers do.\"" },
    secondary_notes: [{ quote: "You get rankings.", fails: "Gate C", do: "Ask the user to add customer results before this line." }, { quote: "Run it.", fails: "CTA", do: "Say what arrives: \"Run it and see your first decision in 20 minutes.\"" }] } as unknown as EditorialVerdict;
  assertEquals(noteProblems(v).length, 2);
  const kept = dropNoteProblems(v);
  assertEquals(kept.secondary_notes.map((n) => n.quote), ["Run it."]);
  assert(kept.one_thing!.do.includes("keep the promise at full strength"));
});

Deno.test("detector: a hedge on the promise and a weakening admission are the owner's tells; plain modal uses are not", () => {
  const hits = (t: string) => analyzeText(t, { format: FORMATS.organic_social }).flags.map((f) => f.tell);
  assert(hits("Keywords that could bring you customers.").includes("promise_hedge"));
  assert(hits("Only keywords that could bring customers make the cut.").includes("promise_hedge"));
  assert(hits("I'd start with the ones advertisers bid on.").includes("promise_hedge"));
  assert(hits("A keyword with a price on it is one where some searchers do.").includes("promise_hedge"));
  assert(hits("Pull Shot Coffee, a planned espresso bean subscription.").includes("weakening_admission"));
  assert(hits("We have no customers yet.").includes("proof_confession"));
  for (const t of ["You could be paying for pages nobody reads.", "before you knew which pages could win", "Abramovich's plan to sell Chelsea"]) assertEquals(hits(t).filter((x) => ["promise_hedge", "weakening_admission"].includes(x)), [], t);
});

Deno.test("the writer sees a ledger row's fact without the engine's memo", () => {
  assertEquals(rowFacts("Premium: The posted price list, with credits that roll over, answering \"'Credit billing feels sneaky' (V3, V13)\""), "The posted price list, with credits that roll over");
  assertEquals(rowFacts("Premium: the evidence behind every call. It answers 'The data cannot be trusted' (V1) and 'Recommendations are wrong' (V10). No dollar value: no ledger basis."), "the evidence behind every call.");
  assertEquals(rowFacts("Every keyword carries Google's cost per click and an intent."), "Every keyword carries Google's cost per click and an intent.");
});

// ---------------------------------------------------------------- round 6: the whole promise, said; what a tool does, as its row says

import { promiseGap } from "../steps/mechanical.ts";

Deno.test("mechanical: a piece that never says its promise, or says half of a promise of two results, fails a gate naming the closest line", () => {
  const promise = "rankings on keywords that bring paying customers";
  const social = FORMATS.organic_social;
  // the round-5 clean run's shipped post: the rehook says the rankings, and no sentence says the customers they bring
  const shipped = [
    s("lead_in", [b("lead-b-1", "You paid a writer for a page because the difficulty score said it was easy, and it never cracked page one."), b("lead-b-3", "You rank for the keywords your buyers search, and the pages you can't win never reach a writer.")]),
    s("main", [b("main-2", "Another page ranks, pulls traffic, and sells nothing, because the people typing that phrase wanted a free answer and left.")]),
    s("cta", [{ ...b("cta-1", "Grab the link in the first comment to find the pages your site can rank with and sell from."), type: "cta" }]),
  ];
  const gap = promiseGap(shipped, social, promise);
  assert(gap?.includes(`"${promise}"`), gap ?? "no gap");
  assert(gap?.includes(`the closest line is "You rank for the keywords your buyers search, and the pages you can't win never reach a writer."`), gap ?? "");
  // the interim post said it inside a longer sentence: no gap; a ledger tag never hides it
  assertEquals(promiseGap([s("main", [b("main-1", "You find the pages your site can rank for that bring paying customers by reading the pages on top.")])], social, promise), null);
  assertEquals(promiseGap([s("main", [b("main-1", `You rank on keywords that bring paying customers [[L:${ROW}]].`)])], social, promise), null);
  // no promise, an ad set or an SMS: nothing to check
  assertEquals(promiseGap(shipped, social, null), null);
  assertEquals(promiseGap(shipped, FORMATS.google_rsa, promise), null);
  assertEquals(promiseGap(shipped, FORMATS.sms, promise), null);
});

Deno.test("fact check: a line that says more about what the product or a named tool does than its row is fixed like a misquoted figure", () => {
  const ahrefs = fl({ quote: `Ahrefs and Semrush don't tell you whether your links can beat those sites. They leave both calls to you [[L:${ROW}]].`, test: 10, claim_type: "comparative", suggested_rewrite: `Ahrefs and Semrush hand you the list and leave it to you to decide whether your links can beat those sites [[L:${ROW}]].` });
  const filter = fl({ quote: `You get only the keywords advertisers pay Google to show up for [[L:${ROW}]].`, test: 10, claim_type: "feature", suggested_rewrite: `You see what advertisers pay Google per click on every keyword [[L:${ROW}]].` });
  const claimed = fl({ quote: "It makes the build call for you.", test: 1, claim_type: "feature", claim_id: "9a9a9a9a-0000-4000-8000-000000000002" });
  const promise = fl({ quote: "You rank for the keywords that bring paying customers.", test: 1, claim_type: "benefit" });
  const compliance = fl({ quote: "Cancel anytime.", test: 9, claim_type: "continuity_trial" });
  const kept = fl({ quote: `It makes the call for you [[L:${ROW}]].`, test: 1, claim_type: "feature", claim_id: ROW });
  // reason-why logic and the speaker's call cite no row: never a described fix
  const reason = fl({ quote: "That works because advertisers stop paying for clicks that never buy.", test: 1, claim_type: "mechanism" });
  const call = fl({ quote: "This picks better pages than any volume sort I've used.", test: 1, claim_type: "comparative" });
  const pending = pendingFactualFlags(out([ahrefs, filter, claimed, promise, compliance, kept, reason, call]), []);
  assertEquals(pending.map((f) => f.quote), [ahrefs.quote, filter.quote, claimed.quote, kept.quote]);
  // a kept claim is never touched
  assertEquals(pendingFactualFlags(out([kept]), [{ id: ROW, user_decision: "keep" }]).length, 0);
  // a line that carries the promise is the user's call, never the revision's
  const stems = promiseStems("rankings on keywords that bring paying customers");
  const carrier = fl({ quote: `You keep only the searches that bring customers [[L:${ROW}]], checked against the pages already ranking.`, test: 10, claim_type: "mechanism", suggested_rewrite: "x" });
  assertEquals(pendingFactualFlags(out([carrier, ahrefs]), [], stems).map((f) => f.quote), [ahrefs.quote]);
});

Deno.test("standard: a common column stays as the reason-why, a named tool is described as its row says, and a promise of two results says both", () => {
  assert(RULES.includes("never drops that reason because the column is common"));
  assert(RULES.includes("never what it fails to measure"));
  assert(RULES.includes("a promise of two results says both in that sentence"));
  assert(COPY_CHIEF_RUBRIC.includes("never by cutting the reason-why it carries"));
  assert(COPY_CHIEF_RUBRIC.includes("a direction never cuts the piece's only carrier for part of the promise"));
  assert(CLAIMS_AND_FACTUAL_REVIEW.includes("an invented filter, a wrong detail about the reader's tool"));
  assert(editorialPrompt.system.includes("no note cuts the only line that carries part of the promise"));
  assert(!editorialPrompt.system.includes("is no reason: fail Gate A and point the do at what the reader's tool does not do."));
  const social = FORMATS.organic_social.sections.find((x) => x.id === "main")!;
  assert(social.must_not.some((m) => m.includes("a second call to action")));
});

Deno.test("promise gate: a note, read only in sentences to the reader outside the offer, with the result noun as head", () => {
  const promise = "rankings on keywords that bring paying customers";
  const social = FORMATS.organic_social;
  const piece = (...lines: [string, string][]) => [s("main", lines.map(([id, t]) => b(id, t)))];
  // a sentence about the product, or the call to action alone, is not the promise said to the reader
  assert(promiseGap(piece(["main-1", "Legiit Keywords delivers rankings on keywords that bring paying customers."]), social, promise, ["Legiit Keywords"]));
  assert(promiseGap([s("main", [b("main-1", "Every skip tells you why.")]), s("cta", [{ ...b("cta-1", "Get rankings on keywords that bring paying customers: the link is in the first comment."), type: "cta" }])], social, promise));
  assertEquals(promiseGap(piece(["main-1", "You rank on keywords that bring paying customers."]), social, promise, ["Legiit Keywords"]), null);
  // half of a promise of two results is not the promise
  assert(promiseGap(piece(["main-1", "You rank on the keywords your buyers search."]), social, promise));
  // checkout, bump, confirmation and cold opener have no slot for it
  for (const id of ["order_form", "order_bump", "thank_you", "cold_email"] as const) assertEquals(promiseGap(piece(["main-1", "Yes, I want it."]), FORMATS[id], promise), null, id);
  // the closest line is one sentence, never a price line
  const gap = promiseGap(piece(["main-1", "You rank for the keywords your buyers search. Every skip tells you why."], ["main-2", "Pro is $59 a month for rankings on keywords."]), social, promise)!;
  assert(gap.includes(`the closest line is "You rank for the keywords your buyers search."`), gap);
  // a participle or "worth" ends the head phrase; an adverb before a participle does not
  assertEquals(promiseStems("a draft reviewed and revised before you see it").values().next().value, "draft");
  assertEquals(promiseStems("pages chosen on whether you can win").values().next().value, "page");
  assertEquals(promiseStems("the pages worth building on your site").values().next().value, "page");
  assertEquals(promiseStems("a finished first piece written on your own offer").values().next().value, "piece");
  assertEquals(promiseStems("a fully booked calendar").values().next().value, "calendar");
});

Deno.test("promise guard: a line that names the competitors' ranking pages never stands in for the promise it carries less of", () => {
  const promise = promiseStems("rankings you can actually win, on keywords that bring paying customers");
  const filter = "You keep only the searches that bring customers, checked against the backlinks of the pages already ranking.";
  const line = "You win rankings your site can hold, on keywords that bring paying customers.";
  assert(statesPromise(filter, promise), "the filter line holds the stems");
  const units = [unit("main-1", line), unit("main-2", filter)];
  const r = applyEdits(units, [{ ref: "main-1", before: line, after: "", tell: "said again" }], "social", promise);
  assertEquals(r.applied.length, 0, "the fuller promise line stays");
  assertEquals(applyEdits(units, [{ ref: "main-2", before: filter, after: "", tell: "tool tour" }], "social", promise).applied.length, 1);
});

Deno.test("revision: a fix that would leave no line saying the promise keeps the line that carried it", () => {
  const promise = promiseStems("rankings on keywords that bring paying customers");
  const before = [s("main", [b("main-1", "You rank on keywords that bring paying customers."), b("main-2", "Every skip tells you why.")])];
  const revision: RevisionOutput = {
    sections: [s("main", [b("main-1", "Every keyword shows what advertisers pay per click."), b("main-2", "Every skip tells you why, with the pages behind it.")])],
    changes: [{ block_id: "main-1", before: "", after: "", reason: "factual", source: "factual" }, { block_id: "main-2", before: "", after: "", reason: "note", source: "editorial" }],
    untouched_confirmed: [],
  };
  const r = reconcileRevision(before, revision, [], [], promise);
  assertEquals(r.sections[0].blocks.map((x) => x.text), ["You rank on keywords that bring paying customers.", "Every skip tells you why, with the pages behind it."]);
  assertEquals(r.promiseKept, ["main-1"]);
  // a revision that says the promise in another line may change this one
  const moved: RevisionOutput = { ...revision, sections: [s("main", [b("main-1", "Every keyword shows what advertisers pay per click."), b("main-2", "You rank on keywords that bring paying customers, and every skip tells you why.")])] };
  assertEquals(reconcileRevision(before, moved, [], [], promise).promiseKept, []);
  // a cut of the only promise line is restored too
  const cut: RevisionOutput = { ...revision, sections: [s("main", [b("main-2", "Every skip tells you why.")])], changes: [{ block_id: "main-1", before: "", after: "", reason: "cut", source: "editorial" }] };
  assertEquals(reconcileRevision(before, cut, [], [], promise).sections[0].blocks.map((x) => x.id), ["main-1", "main-2"]);
});

import { userAttention } from "../draft/review.ts";

Deno.test("ship: an unsaid promise is a note the user sees, never a blocker", () => {
  const mechanical = { tell_score_per_300: 0, flags: [{ tier: 1, tell: "promise_unstated", weight: 0, count: 1, examples: [], fix: "No sentence says the argument's promise." }], hard_fail: false, hard_fail_reasons: [], fk_grade: 5, cadence_cv: 0.6, cadence_flag: false, and_then_count: 0, format_gate_failures: [], word_count: 300 };
  const att = userAttention({ editorial: null, factual: null, mechanical, pendingFlags: [], needsSource: [], openQuestions: [], finalPass: true });
  assertEquals(att, ["Worth fixing (promise check): No sentence says the argument's promise."]);
});
