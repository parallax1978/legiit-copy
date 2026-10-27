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
    `the argument is chosen, the offer is designed and approved, every fact sits in a claims ledger with a grade.`,
    `the argument is chosen, the offer is designed and approved, every number, name, quote, credential, price and result someone got sits in a claims ledger with a grade. The promise of the result, the reason-why the reader accepts, what the current way costs the reader and how the product works as the brief and ledger describe it are yours to write at full strength.`,
  ],
  [
    `2. A fact the copy needs and the ledger lacks is written followed by [[NEEDS SOURCE]] and listed in needs_source.`,
    `2. A number, name, study, quote, credential, price or date the copy needs and the ledger lacks is written followed by [[NEEDS SOURCE]] and listed in needs_source. The promise of the result, reason-why logic the market accepts, the reader's situation and how the product works as the brief describes it need no row and never take the mark.`,
  ],
  [
    `Descriptions of the reader's state come from the verbatims, in the market's words. The one damaging admission is true, minor, from the brief or ledger, and followed at once by the claim it licenses.`,
    `The substance of the reader's state comes from the verbatims and the plain facts of the reader's work, said as one concrete thing that happened to the reader, at full strength, in the speaker's words (rule 11), never in a verbatim's survey wording and never sized down. At most one damaging admission, and only when the brief holds a true, minor flaw that makes the promise easier to believe (a price, a look, a limit this reader does not care about), followed at once by the claim it licenses; never that results, customers, tests, reviews or a site are missing, and never that the product or its example is new, planned or unlaunched (rule 12).`,
  ],
  [
    `- Every claim's carrier (proof, mechanism, demonstration, ledger-backed specific) sits within two sentences of it.`,
    `- Every claim's carrier (a demonstration, a ledger-backed result or specific, the mechanism, reason-why logic the reader accepts, process specifics, the exact output, the founder's call, the guarantee) sits within two sentences of it.`,
  ],
  [
    `A claim the ledger cannot carry is sized down to what it can carry, or cut.`,
    `A number, a rate, a name or a result someone got that the ledger cannot carry is cut; the promise of the result stays, carried by its mechanism or demonstration (rule 8).`,
  ],
  [
    `5. The claim is never bigger than the ledger grade. A supported claim is stated in the indicative with no hedge ("may", "can help", "designed to", "aims to" are defects on a supported claim). An unsupported claim is not hedged into existence; it is cut.`,
    `5. Sell the result (rule 8). The promise of what the reader ends up with (the rankings, the customers, the sales, the money) is stated in the indicative at full strength and carried, within two sentences, by the mechanism, a demonstration, reason-why logic, process specifics or the founder's call. "May", "can help", "could", "might", "some", "designed to" and "aims to" are defects on it. What needs a ledger row is everything discipline 1 lists (a number, a rate, a time, a name, a quote, a study, a statistic, a credential, a testimonial, a customer) and a result someone got; the mechanism and process specifics come from the brief and the ledger, and the founder\'s call only from a speaker on file. Without the row it is not written, and never hedged into existence.`,
  ],
]);

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 13, system: SYSTEM };
