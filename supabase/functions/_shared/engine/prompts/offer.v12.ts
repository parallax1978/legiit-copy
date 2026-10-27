/**
 * Offer prompt, version 12: version 11's messages. The promise/delivery gap note is about timing: what arrives when,
 * never an instruction to leave out or size down the result the product produces (the copy sells it, rule 8).
 * The system text carries the standard as of this version (sell the result, rule 8; precision never sizes a promise down, rule 10; a line true only with a weakening detail is rewritten, rule 12; the short-piece guarantee only when the offer leads with it, rule 16; indicative with no conditional voice, rule 20; section 2's promise, C8 and C9; section 4's no-results proof and the obvious demonstration; the first-week check, section 5; Gates A and C and the reviewer's directions, section 6; the outcome, reasoning and situation rows, grade F and the factual procedure, section 8).
 */
import offerV11 from "./offer.v11.ts";
import { amend, type PromptModule } from "./types.ts";

export * from "./offer.v11.ts";

type Args = Parameters<typeof offerV11.user>[1];

const SYSTEM = amend(offerV11.system, [
  [
    `the guarantee (guarantee, with guarantee_terms: text, days, conditions, approver null),`,
    `the guarantee (guarantee, with guarantee_terms: text, days, conditions, approver null; its claim_text is the promise in one sentence, and the payment and refund terms are a separate row, claim_type other, role offer_term, that only the page taking payment states),`,
  ],
  [
    `habit-dominant markets need the current solution made untenable first.`,
    `habit-dominant markets need the current solution made untenable first. The reasons are about the deal; they never say what the copy may promise, which is the reader's result (the rankings, the customers, the sales, the money), never the deliverable (rule 8).`,
  ],
  [
    `the first visible win when it is stated as a promise (benefit, graded by the evidence the ledger holds),`,
    `the first visible win (feature, role offer_term, no grade, when it is what the product delivers or shows the buyer and when it arrives, such as the first report; benefit, graded by the evidence the ledger holds, only when it states a result the buyer gets from the market, such as a ranking),`,
  ],
  [
    `Every word the buyer will read (the guarantee sentence, bonus and premium names, flag rewrites) follows that list: none of its tells or words, no em dash, emoji or hashtag.`,
    `Every word the buyer will read (the guarantee sentence, bonus and premium names, flag rewrites) follows that list: none of its tells or words, no em dash, emoji or hashtag. A premium's name says what the buyer gets from it in the buyer's terms (the result it brings closer or the worry it ends), never the bare noun for the deliverable ("Report", "Checklist", "Bonus 2") and never a number the ledger does not hold.`,
  ],
  [
    `Where the promise outruns the first week, say so in promise_delivery_gap_note and either size the promise down or add a component that closes the gap.`,
    `Where the buyer would expect something sooner than it arrives, say what arrives when in promise_delivery_gap_note, or add a component that closes the gap. The note is about timing only: it never tells the copy to leave out or size down the result the product produces (the rankings, the customers, the sales, the money), which the copy sells (rule 8).`,
  ],
]);

const offerPrompt: PromptModule<Args> = { ...offerV11, version: 12, system: SYSTEM };

export default offerPrompt;
