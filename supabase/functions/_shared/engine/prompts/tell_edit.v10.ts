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
