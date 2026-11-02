/**
 * Draft prompt, version 27: version 26's messages with the promise's place tightened (docs/04 rule 8). Version 26
 * allowed the promise in the sentence before the product's name, and the piece then read "This time you show him
 * pages that rank..." before anything made it so: a promise before the product has to speak of a time that has not
 * come. The promise is now said in the sentence that names the product, or the one right after it; a paragraph that
 * announces the change ("This time", "From now on", "But now") before the product is named is a tell.
 */
import { amend, type PromptModule } from "./types.ts";
import { draftPrompt as draftPrev, MANNER_RULE, NEVER, OUTPUT, PROMISE_PLACE as PROMISE_PLACE_V26, WRITER as WRITER_V26, withShape, callItems, writerTells, type DraftArgs } from "./draft.v26.ts";

export type { DraftArgs };
export { MANNER_RULE, NEVER, OUTPUT, callItems, withShape, writerTells };

export const PROMISE_PLACE = `The promise, the result he ends up with, is a sentence of its own with the product: in the sentence that names it, or the one right after, after the trouble is told whole; never before the product is named, because a promise before it has to speak of a time that has not come ("this time you show him", "once you can see what the pages say"), and the turn is the product's name, never a word that says things are about to change ("This time", "From now on", "But now"). A piece that opens on the promise or the deal says it in the opening and does not say it again.`;

export const WRITER = amend(WRITER_V26, [[PROMISE_PLACE_V26, PROMISE_PLACE]]);

const SYSTEM = amend(draftPrev.system, [[WRITER_V26, WRITER]]);

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 27, system: SYSTEM };
