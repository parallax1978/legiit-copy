/**
 * Editorial prompt, version 17: version 16's messages. Before the gates on a short piece, the copy chief reads it once
 * as the reader and writes down what he feels at line one and at the turn; nothing fails Gate B with a direction that
 * names the moment from the research the opening should carry; a word a cold reader would stop at fails Gate B with
 * the plain words. The system text carries the standard as of this version (rules 39 and 40; Gates B and D; the
 * reviewer's directions; Section 7.1 tell 22).
 */
import { editorialPrompt as editorialPrev, type EditorialArgs } from "./editorial.v16.ts";
import { amend, type PromptModule } from "./types.ts";

export type { EditorialArgs };

const SYSTEM = amend(editorialPrev.system, [
  [
    `- what_works: two or three quoted lines kept on purpose; say why in a phrase.`,
    `- On a short piece, before the gates, read it once as the reader on his phone and write down for yourself what he feels at line one and at the turn (a pang, a hope, a laugh of recognition, dread) and the words he would stop at. Nothing felt fails Gate B (rule 39): the direction names the moment from the research (the resident emotion, the forces, a verbatim) the opening should carry, said as the thing itself. A word a cold reader outside the trade would stop at (a metric's name, a term from his tool, the product's own labels) fails Gate B (rule 40): the direction gives the plain words. The mechanical report's reading grade above the format's ceiling fails Gate D (rule 40).
- what_works: two or three quoted lines kept on purpose; say why in a phrase.`,
  ],
]);

export const editorialPrompt: PromptModule<EditorialArgs> = { ...editorialPrev, version: 17, system: SYSTEM };
