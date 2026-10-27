/**
 * Factual review prompt, version 11: version 10's messages. A rewrite fixes only what its rule names and never sizes an
 * outcome promise down, adds a hedge or a weakening detail, or cuts a promise; the promise of the result with no number
 * on it, reason-why logic, the reader's situation, what the product does and the founder's call are not flags, and a
 * delivery timing note in the offer block is not a rule; an evidence-state sentence goes only on a health claim whose rule requires one. The system text carries the standard as of this version (sell the result, rule 8; precision never sizes a promise down, rule 10; a line true only with a weakening detail is rewritten, rule 12; the short-piece guarantee only when the offer leads with it, rule 16; indicative with no conditional voice, rule 20; section 2's promise, C8 and C9; section 4's no-results proof and the obvious demonstration; the first-week check, section 5; Gates A and C and the reviewer's directions, section 6; the outcome, reasoning and situation rows, grade F and the factual procedure, section 8).
 */
import { factualPrompt as factualPrev, type FactualArgs } from "./factual.v10.ts";
import { amend, type PromptModule } from "./types.ts";

export type { FactualArgs };

const SYSTEM = amend(factualPrev.system, [
  [
    `Every flag is a decision for the user: the exact line, the rule it meets, and the rewrite that keeps the most the evidence allows.`,
    `Every flag is a decision for the user: the exact line, the rule it meets, and the rewrite that fixes only what that rule names and keeps the line selling at full strength.`,
  ],
  [
    `- issue: one sentence: what the line asserts, what the ledger holds, the gap.`,
    `- issue: one sentence: what the line asserts and how it breaks the cited rule (a number past its row's precision, an item no row holds, a term that differs from the offer block, a missing disclosure). A promise of the result, reason-why logic or the reader's situation with no row behind it is not an issue.`,
  ],
  [
    `A line that cites an existing ledger row is the user's claim, never a fabrication, however strong.`,
    `A line whose number, name, quote or result is held by the row it cites is the user's claim, never a fabrication, however strong; a number, name, quote, study or result that the cited row does not hold is a fabrication, whatever id sits beside it.`,
  ],
  [
    `You may add an evidence-state sentence from §8.2 ("We did not run our own trial."); you may not add`,
    `You add an evidence-state sentence only to a health claim whose cited rule requires one (§8.2), never to any other claim; you may not add`,
  ],
  [
    `you may not delete a specific the ledger supports; you may not soften a claim the ledger carries at its grade.`,
    `you may not delete a specific the ledger supports; you may not soften a claim the ledger carries at its grade; you may not size an outcome promise down, add "some", "could" or a weakening detail ("planned", "new", "not yet"), or cut a promise. A rewrite fixes only what its rule names: when a line overstates its subject, drop the overstated words.`,
  ],
  [
    `- severity: fatal only for fabrication;`,
    `- Not flags (§8.1, §8.3 test 2): the promise of the result the product produces (the rankings, the customers, the sales, the money) with no number on it; reason-why logic the market accepts; the reader's situation and its cost; what the product does as the brief and ledger describe it; the founder's call when the speaker is on file. Never flag them for lacking a result. A feature, step, output or founder statement the brief and ledger do not hold is a fabrication (test 10). A delivery timing note in the offer block says what arrives when; it is not a rule, and a line that names the result the product produces never breaks it.\n- severity: fatal only for fabrication;`,
  ],
]);

export const factualPrompt: PromptModule<FactualArgs> = { ...factualPrev, version: 11, system: SYSTEM };
