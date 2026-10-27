/**
 * Revise prompt, version 12: version 11's messages. A factual fix corrects only the number, name or term it names and
 * never brings in a hedge or a weakening detail; no fix sizes a promise down. The system text carries the standard as of this version (sell the result, rule 8; precision never sizes a promise down, rule 10; a line true only with a weakening detail is rewritten, rule 12; the short-piece guarantee only when the offer leads with it, rule 16; indicative with no conditional voice, rule 20; section 2's promise, C8 and C9; section 4's no-results proof and the obvious demonstration; the first-week check, section 5; Gates A and C and the reviewer's directions, section 6; the outcome, reasoning and situation rows, grade F and the factual procedure, section 8).
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v11.ts";
import { amend, type PromptModule } from "./types.ts";

export type { ReviseArgs };

const SYSTEM = amend(revisePrev.system, [
  [
    `never adds a fact the ledger lacks, never adds a ledger id the ledger does not show,`,
    `never adds a number, name, quote, study, credential or result the ledger lacks (reason-why logic the market accepts, the reader's situation and how the product works as the brief describes it are not ledger facts and may carry a promise), never adds a ledger id the ledger does not show,`,
  ],
  [
    `fix each line that misquotes the ledger or the offer block with its rewrite, ledger tags kept;`,
    `fix each line that misquotes the ledger or the offer block, and each line that says more about what the product or a named tool does than its row holds, with its rewrite, ledger tags kept (a fix corrects the number, name, term or description it names to what the row says; where a rewrite also brings in a hedge or a weakening detail such as "planned" or "not yet", fix only the misquoted item and keep the rest of the line at full strength);`,
  ],
  [
    `A fix never adds a hedge ("may", "can help", "results vary"),`,
    `A fix never adds a hedge ("may", "can help", "could", "some", "results vary") or a weakening detail, never sizes a promise down,`,
  ],
]);

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 12, system: SYSTEM };
