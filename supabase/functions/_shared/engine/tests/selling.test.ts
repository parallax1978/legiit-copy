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
