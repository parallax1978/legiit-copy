/**
 * Tell edit prompt, version 10: version 9's messages. A promise and the line that proves it are two points, so the
 * piece's first statement of the result it promises is never the line a repeat cuts; the reader's pain is said as
 * one concrete thing at full strength, never sized down. The system text carries the owner's list as of this version
 * (a hedge on a promise or its reason-why is an empty hedge; a confession or weakening admission is cut and the
 * promise kept; a promise and its proof are two points; the edit cuts those as tells, not facts, docs/04 section 7.1).
 */
import { tellEditPrompt as tellEditPrev, type TellEditArgs } from "./tell_edit.v9.ts";
import { amend, type PromptModule } from "./types.ts";

export type { TellEditArgs };

const PROMISE_KEPT = `A promise and the line that proves it are two points, never a repeat: the piece's first statement of the result it promises is never the line cut (a proof line that names the result again keeps its proof and drops the restated result).`;

const SYSTEM = amend(tellEditPrev.system, [
  [
    `"keep" is true only when the line carries a fact the piece needs and a plainer sentence would lose it;`,
    `"keep" is true when the line carries a fact the piece needs, the promise of the result or the reason-why that carries it, and a plainer sentence would lose it; a reason-why line listed as a general truth is said plainly as the cause, never cut or sized down;`,
  ],
  [
    `A sentence that carries a number, a name, a date, a quote or a link is never cut; rewrite it instead.`,
    `A sentence that carries a number, a name, a date, a quote, a link, the promise of the result (the rankings, the customers, the sales, the money) or the reason it is true is never cut; rewrite it instead.`,
  ],
  [
    `- A closer that says the hook again is cut, and its hedge with it. In a piece that opens on paying a bookkeeper to fix the books every April, "Keep paying for April fixes and you could be paying for problems the report might have caught." is cut: the call to action follows the proof.`,
    `- A closer that says the hook again in the same words is cut. A closer that says what the reader keeps paying if nothing changes is the cost of the status quo: it stays, and its hedge goes. "Keep paying for April fixes and you could be paying for problems the report might have caught." becomes "Every April you wait, you pay the bookkeeper again for problems the report catches."`,
  ],
  [
    `- A sentence that says the hook's point again in new words, with no new fact ("The books get fixed because the deadline came, not because anyone read them."), is cut.`,
    `- A sentence that says the hook's point again in new words and adds no cause, cost or fact is cut. A sentence that gives the reason the problem keeps happening ("The books get fixed because the deadline came, not because anyone read them.") is the reason-why: it stays, said plainly.`,
  ],
  [
    `is said once, plainly: what the product does that the other does not.`,
    `is said once, plainly: what the reader gets from this product that the other does not give them, with the feature as its reason.`,
  ],
  [
    `a phrase or a point said twice keeps one line, the one whose sentence carries a ledger tag (the proof), else the first use; the other is cut, or rewritten so it adds something the kept line did not.`,
    `a phrase or a point said twice keeps one line, the one whose sentence carries a ledger tag (the proof), else the first use; the other is cut, or rewritten so it adds something the kept line did not. ${PROMISE_KEPT}`,
  ],
  [
    `each other line is cut, or rewritten so it adds something the kept line did not, and is listed in the audit as "said_again".`,
    `each other line is cut, or rewritten so it adds something the kept line did not, and is listed in the audit as "said_again". ${PROMISE_KEPT}`,
  ],
  [
    `is said as the thing that happened, plainly, keeping its substance and how often it happened: "Some of the pages you built never earned back what they cost."`,
    `is said as one concrete thing that happened to the reader, plainly, at full strength, keeping its substance: "The page you paid a writer for never earned back what it cost."`,
  ],
]);

export const tellEditPrompt: PromptModule<TellEditArgs> = { ...tellEditPrev, version: 10, system: SYSTEM };
