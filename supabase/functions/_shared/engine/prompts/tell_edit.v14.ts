/**
 * Tell edit prompt, version 14: version 13's messages. The audit reads for jargon (a metric's name, a term from the
 * reader's tool, a label from the product's own screens, an abbreviation a cold reader would stop at) and gives it
 * plain words once or cuts it (rule 40); an edit never raises the reading grade. The system text carries the
 * standard as of this version (rules 39 and 40; Section 7.1 tell 22).
 */
import { tellEditPrompt as tellEditPrev, type TellEditArgs } from "./tell_edit.v13.ts";
import { amend, type PromptModule } from "./types.ts";

export type { TellEditArgs };
export { cadenceNote } from "./tell_edit.v11.ts";

const SYSTEM = amend(tellEditPrev.system, [
  [
    `"frame_pair", two sentences built on one frame ("Whether X sits in... Whether Y sits in..."): keep one, rebuilt as one plain sentence;`,
    `"frame_pair", two sentences built on one frame ("Whether X sits in... Whether Y sits in..."): keep one, rebuilt as one plain sentence; "jargon", a word a cold reader outside the trade would stop at (a metric's name such as "difficulty number" or "search volume", a term from the reader's tool, a label from the product's own screens, an abbreviation): say what it is to him in plain words once, or cut it (rule 40);`,
  ],
  [
    `a wait the reader would sit through (say what the click gets him).`,
    `a wait the reader would sit through (say what the click gets him). Every edit keeps the reading grade where it is or lowers it (rule 40): a replacement uses words a ten-year-old knows and never a longer word for a shorter one.`,
  ],
]);

export const tellEditPrompt: PromptModule<TellEditArgs> = { ...tellEditPrev, version: 14, system: SYSTEM };
