/**
 * Argument prompt, version 14: version 13's messages. The promise is the reader's result in the purpose's terms (the
 * rankings, the customers, the money), never the product's deliverable, whether or not results are on file; any
 * carrier in docs/04 rule 8 covers it (the seller's own features and process, a demonstration offer, the guarantee),
 * and only a number or rate in it needs a result row; C8 is judged against what the reader's current tool already
 * shows them. The system text carries the standard as of this version (sell the result, rule 8; precision never
 * sizes a promise down, rule 10; the short-piece guarantee only when the offer leads with it, rule 16; indicative
 * with no conditional voice, rule 20; section 2's promise, C8 and C9; section 4's no-results proof; Gates A and C
 * and the reviewer's directions, section 6; the outcome, reasoning and situation rows and grade F, section 8).
 */
import argumentV13 from "./argument.v13.ts";
import { amend, type PromptModule } from "./types.ts";

export * from "./argument.v13.ts";

type Args = Parameters<typeof argumentV13.user>[1];

const SYSTEM = amend(argumentV13.system, [
  [
    `promise: a noun phrase that completes "a different and superior way to get [promise]";`,
    `promise: the reader's result in the purpose's terms (the rankings, the customers, the sales, the money they buy the product for), as a noun phrase that completes "a different and superior way to get [promise]", never the product's deliverable, output or a feature, whether or not results are on file;`,
  ],
  [
    `- The promise is never bigger than its proof_ledger_refs can carry. A promise with no ledger carrier is still listed, with proof_asset "none in the ledger", so the user sees why it fails the proof gate.`,
    `- The promise is carried by any proof in rule 8: cite the feature, process or mechanism rows that produce the result, the offer term that lets the reader see it for themselves (a trial, a free plan) and the guarantee. A promise of the result needs no result row; a number, a rate or a time in it does, and is written only from a row that holds it. A promise with no carrier at all is still listed, with proof_asset "none in the ledger", so the user sees why it fails the proof gate.`,
  ],
  [
    `Return 1 when the fact the refs name does not cover the promise; that candidate then fails the proof gate.`,
    `Return 1 when the fact the refs name does not cover the promise; that candidate then fails the proof gate. A mechanism or process row that produces the promised result covers it; a feature unrelated to the result does not.`,
  ],
  [
    `C8 against the competitor table (hero copy that survives the logo swap scores 0);`,
    `C8 against the competitor table and against what the reader's current tool already shows them (hero copy that survives the logo swap scores 0; a mechanism built from a column, a score or a filter the reader's tool already has scores at most 1, however the pairing is phrased);`,
  ],
]);

const argumentPrompt: PromptModule<Args> = { ...argumentV13, version: 14, system: SYSTEM };

export default argumentPrompt;
