/**
 * Editorial prompt, version 15: version 14's messages. Every review reads for the owner's tells 18 to 21 (the product
 * used by its own terms before it is introduced, its work sent to someone else, a namedrop, a wait the reader would
 * sit through): each one found is THE ONE THING or a secondary note, whatever gate fails first. The system text carries
 * the standard as of this version (rules 1, 4, 8, 18, 26 and 38; Section 2's mechanism; Gates C and D and the
 * reviewer's directions; Section 7.1 tells 18 to 21).
 */
import { editorialPrompt as editorialPrev, type EditorialArgs } from "./editorial.v14.ts";
import { amend, type PromptModule } from "./types.ts";

export type { EditorialArgs };

const SYSTEM = amend(editorialPrev.system, [
  [
    `- what_works: two or three quoted lines kept on purpose; say why in a phrase.`,
    `- Read every draft for Section 7.1 tells 18 to 21: the product named or used by its own terms before the piece says in plain words what it is and what it does for the reader; its work sent elsewhere (the reader told to do by hand, or to hire or pay someone for, what the brief's deliverables say it does); a namedrop; a wait the reader would sit through. Each one found is THE ONE THING or a secondary note, whatever gate fails first, and its do says what the product does for the reader, in his words, or cuts the line.
- what_works: two or three quoted lines kept on purpose; say why in a phrase.`,
  ],
]);

export const editorialPrompt: PromptModule<EditorialArgs> = { ...editorialPrev, version: 15, system: SYSTEM };
