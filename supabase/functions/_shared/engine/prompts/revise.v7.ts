/**
 * Revise prompt, version 7: version 6's messages; the factual pass acts only on the engine's own errors (a
 * fabrication is cut, a line that misquotes the ledger or the offer block is fixed), because every other factual
 * flag is the user's decision (docs/04 §8.3). The system text carries the standard as of this version (legal
 * boilerplate on the owner's list, no detail volunteered that weakens the proof).
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v6.ts";
import { amend, type PromptModule } from "./types.ts";

export type { ReviseArgs };

const SYSTEM = amend(revisePrev.system, [
  [
    `(b) factual: apply each suggested rewrite as given, ledger tags kept; where the rewrite is null the invented item is cut;`,
    `(b) factual: the flags shown are the engine's own errors: cut each fabrication, and fix each line that misquotes the ledger or the offer block with its rewrite, ledger tags kept; every other factual flag is the user's decision and is not shown to you;`,
  ],
]);

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 7, system: SYSTEM };
