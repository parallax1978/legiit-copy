/**
 * Draft prompt, version 13: version 12's messages. Ledger discipline 2 and 5 sell the result: the promise of what the
 * reader ends up with (the rankings, the customers, the money) is stated at full strength with its carrier, and only a
 * number, a rate, a name, a quote or a result someone got needs a ledger row. The system text carries the standard as of this version (sell the result, rule 8; precision never sizes a promise down, rule 10; a line true only with a weakening detail is rewritten, rule 12; the short-piece guarantee only when the offer leads with it, rule 16; indicative with no conditional voice, rule 20; section 2's promise, C8 and C9; section 4's no-results proof and the obvious demonstration; the first-week check, section 5; Gates A and C and the reviewer's directions, section 6; the outcome, reasoning and situation rows, grade F and the factual procedure, section 8).
 */
import { draftPrompt as draftPrev, type DraftArgs } from "./draft.v12.ts";
import { amend, type PromptModule } from "./types.ts";

export type { DraftArgs };

const SYSTEM = amend(draftPrev.system, [
  [
    `A claim the ledger cannot carry is sized down to what it can carry, or cut.`,
    `A number, a rate, a name or a result someone got that the ledger cannot carry is cut; the promise of the result stays, carried by its mechanism or demonstration (rule 8).`,
  ],
  [
    `5. The claim is never bigger than the ledger grade. A supported claim is stated in the indicative with no hedge ("may", "can help", "designed to", "aims to" are defects on a supported claim). An unsupported claim is not hedged into existence; it is cut.`,
    `5. Sell the result (rule 8). The promise of what the reader ends up with (the rankings, the customers, the sales, the money) is stated in the indicative at full strength and carried, within two sentences, by the mechanism, a demonstration, reason-why logic, process specifics or the founder's call. "May", "can help", "could", "might", "some", "designed to" and "aims to" are defects on it. What needs a ledger row is a number, a rate, a time, a name, a quote or a result someone got; without the row it is not written, and never hedged into existence.`,
  ],
]);

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 13, system: SYSTEM };
