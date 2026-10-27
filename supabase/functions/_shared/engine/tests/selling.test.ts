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
  assert(revisePrompt.system.includes("never sizes a promise down"));
  assert(editorialPrompt.system.includes("fail Gate A and point the do at what the reader's tool does not do"));
  assert(editorialPrompt.system.includes("A note on a promise strengthens its carrier and never sizes the promise down"));
  assert(factualPrompt.system.includes("- Not flags (§8.1, §8.3 test 2): the promise of the result the product produces"));
  assert(factualPrompt.system.includes("you may not size an outcome promise down"));
  assert(offerPrompt.system.includes("The note is about timing only"));
  assert(!offerPrompt.system.includes("either size the promise down or add a component"));
  assert(researchPrompt.system.includes("what its users already get from it"));
});
