import { assert, assertEquals } from "@std/assert";
import { ARGUMENT_SELECTION, CLAIMS_AND_FACTUAL_REVIEW, COPY_CHIEF_RUBRIC, PROOF_PLACEMENT, RULES } from "../prompts/standard.ts";
import argumentPrompt from "../prompts/argument.v14.ts";
import { draftPrompt } from "../prompts/draft.v13.ts";
import { revisePrompt } from "../prompts/revise.v12.ts";
import { editorialPrompt } from "../prompts/editorial.v13.ts";
import { factualPrompt } from "../prompts/factual.v11.ts";
import offerPrompt from "../prompts/offer.v12.ts";
import researchPrompt from "../prompts/research.v8.ts";

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
  assertEquals([argumentPrompt.version, draftPrompt.version, revisePrompt.version, editorialPrompt.version, factualPrompt.version, offerPrompt.version, researchPrompt.version], [14, 13, 12, 13, 11, 12, 8]);
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
  assert(editorialPrompt.system.includes("fail Gate A and point the do at what the reader's tool does not do"));
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

Deno.test("promise guard: a feature line that shares the promise's qualifiers does not stand in for it, and a cut chained on a refused one goes too", () => {
  // the round-5 clean run: the argument's promise, the tool's filter line, and the one sentence that said the result
  const promise = promiseStems("rankings on keywords that bring paying customers");
  const feature = "I founded Legiit, and I made Legiit Keywords to make that decision for your site. You get only the keywords that bring customers, and a build, improve or skip call for every group.";
  const line = "You rank on the keywords that bring paying customers, because every page you pay for is one you can win, on a keyword buyers type. It's the best way I know to choose what to publish.";
  assert(!statesPromise(feature, promise), "the filter is not the result");
  assert(!statesPromise("You rank for the keywords your buyers search.", promise), "two stems are not enough");
  assert(statesPromise(line, promise));
  // with the head, half the stems still state it; without the head, a sentence needs one more
  assert(statesPromise("Your pages rank on keywords that bring customers.", promise));
  assert(statesPromise("You get the keywords that bring paying customers.", promise));
  const units = [unit("main-5", feature), unit("main-7", line), unit("main-8", "Enter your site and your first decision shows up in about 20 minutes.")];
  const first = "You rank on the keywords that bring paying customers, because every page you pay for is one you can win, on a keyword buyers type. It's the best way I know to choose what to publish.";
  const r = applyEdits(units, [
    { ref: "main-7", before: first, after: "Every page you pay for is one you can win, on a keyword buyers type.", tell: "restated promise, slogan closer" },
    { ref: "main-7", before: "Every page you pay for is one you can win, on a keyword buyers type.", after: "", tell: "slogan restating the promise" },
  ], "social", promise);
  assertEquals(r.applied.length, 0);
  assert(r.rejected[0].reason.includes("states its promise"));
  // the second edit's words match the middle of the original sentence (the locator ignores case): it never lands there
  assertEquals(r.rejected[1].reason, "it edits the text of an earlier edit that was refused");
  assertEquals(r.units.find((u) => u.ref === "main-7")?.text, line);
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
