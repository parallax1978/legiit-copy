/**
 * Draft prompt, version 23: version 22's messages, and the shape of a case as the masters built it: the discovery
 * before the product. The post of 1 November went to the pitch in its fifth line, before the reader had been given
 * why the usual way keeps failing him; it followed the format's own order (turn, then product), not Schwartz's
 * (the mechanism before the name), Halbert's (the story) or Hopkins's (the reason-why). The product now arrives as
 * the answer to a question the reader is already asking.
 */
import { draftPrompt as draftPrev, NEVER, OUTPUT, WRITER as WRITER_V22, writerTells, type DraftArgs } from "./draft.v22.ts";
import { amend, type PromptModule } from "./types.ts";

export type { DraftArgs };
export { NEVER, OUTPUT, writerTells };

export const SHAPE = `The shape of the case, in the order the masters built one (Collier's start, Halbert's story, Schwartz's mechanism, Hopkins's reason-why, Sugarman's slide): the moment he recognizes; what it costs him; why it keeps happening, as what you found (the discovery: the mechanism of his loss, in his words, with a scene from the speaker's own work when there is one); the product as the conclusion, in one sentence with its name; how it works, in two; one decision as proof; what he gets, with him in the scene; one ask. The product is named when he is asking "so what do I do about it", never before: a pitch before the discovery is a pitch, the discovery before the pitch is persuasion, and in a piece over 200 words the product's name waits for the middle (a machine checks it).`;

export const WRITER = amend(WRITER_V22, [
  [
    `- Ask once (every one of them): what to do, where, and what he gets.`,
    `- Ask once (every one of them): what to do, where, and what he gets.

${SHAPE}`,
  ],
]);

const SYSTEM = amend(draftPrev.system, [[WRITER_V22, WRITER]]);

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 23, system: SYSTEM };
