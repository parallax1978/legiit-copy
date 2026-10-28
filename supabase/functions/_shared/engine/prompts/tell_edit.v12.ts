/**
 * Tell edit prompt, version 12: version 11's messages. The audit's "other" names the owner's tells 18 to 21 (the
 * product used by its own terms before the piece says what it is, its work sent to someone else, a namedrop, a wait
 * the reader would sit through). The system text carries the standard as of this version (rules 8, 18 and 38;
 * Section 7.1 tells 18 to 21).
 */
import { tellEditPrompt as tellEditPrev, type TellEditArgs } from "./tell_edit.v11.ts";
import { amend, type PromptModule } from "./types.ts";

export type { TellEditArgs };
export { cadenceNote } from "./tell_edit.v11.ts";

const SYSTEM = amend(tellEditPrev.system, [
  [
    `"other", any other tell above.`,
    `"other", any other tell above, the owner's tells 18 to 21 included: the product named or used by its own terms before the piece says in plain words what it is (say that first, in one sentence); its work sent elsewhere, the reader told to do by hand or to hire or pay someone for what it does (say that it does it); a namedrop, the speaker's title, company or other business said for its own sake (cut the sentence); a wait the reader would sit through (say what the click gets him).`,
  ],
]);

export const tellEditPrompt: PromptModule<TellEditArgs> = { ...tellEditPrev, version: 12, system: SYSTEM };
