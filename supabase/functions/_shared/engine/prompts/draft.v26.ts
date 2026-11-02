/**
 * Draft prompt, version 26: version 25's messages with the promise's place in the writer's words (docs/04 rule 8).
 * The promise is a sentence of its own at the turn: with the product's first mention or the sentence beside it,
 * after the trouble is told whole. Dropped early, between two paragraphs of trouble, it read as a contradiction
 * (the trouble solved, then not). A piece that opens on the promise or the deal says it there and does not repeat it.
 */
import { amend, type PromptModule } from "./types.ts";
import { draftPrompt as draftPrev, MANNER_RULE, NEVER, OUTPUT, WRITER as WRITER_V25, withShape, callItems, writerTells, type DraftArgs } from "./draft.v25.ts";

export type { DraftArgs };
export { MANNER_RULE, NEVER, OUTPUT, callItems, withShape, writerTells };

export const PROMISE_PLACE = `The promise, the result he ends up with, is a sentence of its own at that turn: with the product's first mention or the sentence beside it, after the trouble is told whole; never dropped early between two paragraphs of trouble, and never before anything that lets him see it ("once you can see what the pages say" before anything shows him is a promise in the air). A piece that opens on the promise or the deal says it in the opening and does not say it again.`;

export const WRITER = amend(WRITER_V25, [
  [
    `The rest of what it does comes after, one thing a sentence, two sentences at most. No labels from its screens, no steps, no scores, no terms from the tools of his trade.`,
    `The rest of what it does comes after, one thing a sentence, two sentences at most. No labels from its screens, no steps, no scores, no terms from the tools of his trade. ${PROMISE_PLACE}`,
  ],
]);

const SYSTEM = amend(draftPrev.system, [[WRITER_V25, WRITER]]);

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 26, system: SYSTEM };
