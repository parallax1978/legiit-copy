/**
 * Draft prompt, version 22: version 21's messages, and when the proof shows two decisions, a yes and a no, the
 * line says what decided each, and one fact never argues both ways. The post of 1 November used a Wikipedia page
 * on page one as the reason one page could win and, two lines later, as the reason another could not; the facts
 * differed (the searcher wants to buy and nobody there helps him choose; the searcher is not buying yet) and the
 * writer kept the part they shared.
 */
import { draftPrompt as draftPrev, NEVER, OUTPUT, WRITER as WRITER_V21, writerTells, type DraftArgs } from "./draft.v21.ts";
import { amend, type PromptModule } from "./types.ts";

export type { DraftArgs };
export { NEVER, OUTPUT, writerTells };

export const ONE_FACT_ONE_WAY = `When the proof shows a yes and a no side by side, the reader sees in one read what decided each, and the same fact never argues both ways. A Wikipedia page on page one cannot be the reason one page can win and, two lines later, the reason another cannot; if it sits in both facts, the line says what differs: the yes because the searcher wants to buy and nobody on page one helps him choose, the no because the searcher is not buying yet, whoever is on page one. Each decision is told by the fact that decided it, in the words of the fact line, and the part the two share is said once or left out.`;

export const WRITER = amend(WRITER_V21, [
  [
    `When the facts hold one decision with its reason (the search, what it said, the pages it read, why), that one decision is the proof, never the counts.`,
    `When the facts hold one decision with its reason (the search, what it said, the pages it read, why), that one decision is the proof, never the counts. ${ONE_FACT_ONE_WAY}`,
  ],
]);

const SYSTEM = amend(draftPrev.system, [[WRITER_V21, WRITER]]);

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 22, system: SYSTEM };
