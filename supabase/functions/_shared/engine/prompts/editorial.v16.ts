/**
 * Editorial prompt, version 16: version 15's messages. The sentence that introduces the product by name goes in DO NOT
 * TOUCH unless THE ONE THING is about it, a note on the product used before its introduction says to cut or rewrite
 * the early use (never to rebuild the block that holds the introduction), and a short piece's body fails Gate D on
 * a lesson in the reader's trade, a mechanism beyond two short sentences, two sentences on one frame or a pair of
 * short sentences that land a moral.
 */
import { editorialPrompt as editorialPrev, type EditorialArgs } from "./editorial.v15.ts";
import { amend, type PromptModule } from "./types.ts";

export type { EditorialArgs };

const SYSTEM = amend(editorialPrev.system, [
  [
    `- what_works: two or three quoted lines kept on purpose; say why in a phrase.`,
    `- The sentence that introduces the product by name (rule 38), when the piece has one, goes in DO NOT TOUCH unless THE ONE THING is about that sentence. A note that finds the product used, named or pointed at before its introduction (in a social post's lead-in, "it", "this tool" or its own terms) says to cut or rewrite the early use as the promise with its reason or a number, never to rebuild the block that holds the introduction and never to move the introduction into the lead-in. In a short piece, Gate D also fails a lesson in how the reader's trade works, a mechanism told in more than two short sentences, two sentences built on one frame ("Whether X sits in... Whether Y sits in...") and a pair of short sentences that land a moral; the do cuts to what the product decides or makes for him, in his words.
- what_works: two or three quoted lines kept on purpose; say why in a phrase.`,
  ],
]);

export const editorialPrompt: PromptModule<EditorialArgs> = { ...editorialPrev, version: 16, system: SYSTEM };
