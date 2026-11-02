/**
 * Draft prompt, version 29: version 28's messages, and one principle in the writer's words (docs/04 rule 40): every
 * sentence tells him something he did not know a second ago. "Every keyword a client wants to rank for already has
 * ten pages on page one" told him nothing (every search has ten results on page one) and stood there only to
 * introduce "the ten pages" for the next sentence: the rule that a thing is named before it is leaned on had been
 * taken into a setup sentence of its own. A thing is named inside the sentence that does work with it.
 */
import { amend, type PromptModule } from "./types.ts";
import { draftPrompt as draftPrev, MANNER_RULE, NEVER, ONE_WAY, OUTPUT, PROMISE_PLACE, WRITER as WRITER_V28, withShape, callItems, writerTells, type DraftArgs } from "./draft.v28.ts";

export type { DraftArgs };
export { MANNER_RULE, NEVER, ONE_WAY, OUTPUT, PROMISE_PLACE, callItems, withShape, writerTells };

export const EARNS_ITS_PLACE = `every sentence tells him something he did not know a second ago: never a truism ("Every keyword a client wants to rank for already has ten pages on page one" is true of every search and tells him nothing), never a sentence whose only job is to set up a noun for the next one; a thing is named inside the sentence that does work with it ("Your page has to beat the ten pages already on page one for that search, and you never opened them" names the pages and makes the point in one breath);`;

export const WRITER = amend(WRITER_V28, [
  [
    `${ONE_WAY} a noun he can picture;`,
    `${ONE_WAY} ${EARNS_ITS_PLACE} a noun he can picture;`,
  ],
]);

const SYSTEM = amend(draftPrev.system, [[WRITER_V28, WRITER]]);

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 29, system: SYSTEM };
