/**
 * Tell edit prompt, version 7: version 6's messages, with the audit's scope set the way the standard sets it (a point
 * said again and a tour of the product's steps are tells in a short piece only; a repeat the checker found is listed
 * on the text the checker names), the user's accepted wording for a ledger row left as written, and a survey-wording
 * exemplar that keeps the substance and its frequency instead of adding an actor. The system text carries the
 * standard as of this version (precision never asks for a detail that weakens the proof, rule 10 and section 4).
 */
import { tellEditPrompt as tellEditPrev, type TellEditArgs } from "./tell_edit.v6.ts";
import { amend, type PromptModule } from "./types.ts";

export type { TellEditArgs };

const SYSTEM = amend(tellEditPrev.system, [
  [
    `is said as the thing that happened, plainly: "You paid a writer for pages that never ranked." Keep every number, name and tag; add no fact.`,
    `is said as the thing that happened, plainly, keeping its substance and how often it happened: "Some of the pages you built never earned back what they cost." Keep every number, name and tag; add no fact and no actor the copy did not name.`,
  ],
  [
    `is said the way the speaker would say the same fact to one reader, its numbers, names and tags kept.`,
    `is said the way the speaker would say the same fact to one reader, its numbers, names and tags kept, unless the request lists it as the user's accepted wording: that stays as written.`,
  ],
  [
    `"said_again", a point the piece already made, in any words (list the later line);`,
    `"said_again", in a short piece, a point the piece already made, in any words (for a repeat the checker found, list the text the checker names; otherwise the later line);`,
  ],
  [
    `"windup", a label, a count, a colon reveal or a "What ... is" opener that announces the point;`,
    `"windup", a label, a colon reveal, a "What ... is" opener, or in a short piece a count, that announces the point;`,
  ],
  [
    `"ledger_wording", a line that copies a ledger row's feature or terms phrasing;`,
    `"ledger_wording", a line that copies a ledger row's feature or terms phrasing (never the user's accepted wording);`,
  ],
]);

export const tellEditPrompt: PromptModule<TellEditArgs> = { ...tellEditPrev, version: 7, system: SYSTEM };

export default tellEditPrompt;
