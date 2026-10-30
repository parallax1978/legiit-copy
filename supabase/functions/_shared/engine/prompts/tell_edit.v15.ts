/**
 * Tell edit prompt, version 15: version 14's messages, with the type of word (rule 40, the owner's tell 23): the
 * long words and their short ones, and the report words, in the system text, swapped on sight with the sense kept;
 * the passive voice given its actor. The system text carries the standard as of this version.
 */
import { tellEditPrompt as tellEditPrev, type TellEditArgs } from "./tell_edit.v14.ts";
import { amend, type PromptModule } from "./types.ts";
import { plainWordsText, reportWordsText } from "../plain_words.ts";

export type { TellEditArgs };
export { cadenceNote } from "./tell_edit.v11.ts";

const SYSTEM = amend(tellEditPrev.system, [
  [
    `Every edit keeps the reading grade where it is or lowers it (rule 40): a replacement uses words a ten-year-old knows and never a longer word for a shorter one.`,
    `Every edit keeps the reading grade where it is or lowers it (rule 40): a replacement uses words a ten-year-old knows and never a longer word for a shorter one. The type of word matters as much as the grade (the owner's tell 23): a word in the table below is swapped for its short one on sight, the sense kept; a report word is replaced by the concrete thing it stands for (the calls, the page, the money) or cut; a sentence in the passive voice ("the page gets picked", "the brief was given to a writer") gets its actor back (who picked it, who gave it).

Long words and the short ones (rule 40): ${plainWordsText()}.

Report words that never belong in a sentence to one reader: ${reportWordsText()}.`,
  ],
]);

export const tellEditPrompt: PromptModule<TellEditArgs> = { ...tellEditPrev, version: 15, system: SYSTEM };
