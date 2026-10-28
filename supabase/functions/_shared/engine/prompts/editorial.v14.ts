/**
 * Editorial prompt, version 14: version 13's messages. In a piece whose opening line is the whole lead, the copy chief
 * reads line one first and names its opening move; a line one in one of the rejected shapes fails Gate B, its
 * direction is built on a fact the piece already holds, and it is never in DO NOT TOUCH; an example in the standard is
 * never copied into a direction. The system text carries the standard as of this version (Section 3's hooks and the
 * masters' opening moves; Gate B and DO NOT TOUCH; rules 2, 7 and 11; Section 7.1 tells 14 to 17).
 */
import { editorialPrompt as editorialPrev, type EditorialArgs } from "./editorial.v13.ts";
import { amend, type PromptModule } from "./types.ts";

export type { EditorialArgs };

const SYSTEM = amend(editorialPrev.system, [
  [
    `- what_works: two or three quoted lines kept on purpose; say why in a phrase.`,
    `- In a piece whose opening line is the whole lead (Section 3, Hooks), read line one before anything else and name its opening move to yourself. A line one in the shape of Section 7.1 tells 14 to 17, a reframe, an aphorism, a line that leads with a count of the product's own output, or a line that uses none of the moves fails Gate B; its do names the move that fits the facts on file and gives one line one built on a fact the piece already holds, never a number, name or result the ledger lacks. Such a line is never in DO NOT TOUCH. The examples in this standard teach a move; a direction never copies one.
- what_works: two or three quoted lines kept on purpose; say why in a phrase.`,
  ],
]);

export const editorialPrompt: PromptModule<EditorialArgs> = { ...editorialPrev, version: 14, system: SYSTEM };
