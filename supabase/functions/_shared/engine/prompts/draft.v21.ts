/**
 * Draft prompt, version 21: version 20's messages, and a thing is named the first time it appears. The post of
 * 31 October opened on "the easiest keyword on your last list" and "the list you pay for every month" and the owner
 * asked "what list?"; the rules against tool jargon had pushed the writer into vagueness instead. The first time, the
 * thing is named in plain words ("the keyword list Ahrefs gives you"); a test the reader runs opens on what he opens.
 */
import { draftPrompt as draftPrev, NEVER, OUTPUT, WRITER as WRITER_V20, writerTells, type DraftArgs } from "./draft.v20.ts";
import { amend, type PromptModule } from "./types.ts";

export type { DraftArgs };
export { NEVER, OUTPUT, writerTells };

export const NAME_IT_FIRST = `Nothing is leaned on before it is named. The first time a thing appears it is said in plain words, with its name when it has one: "the keyword list Ahrefs or Semrush gives you", "the ten pages already on page one for that search", "the number your tool puts next to each keyword"; only after that may it be "the list", "those ten pages", "that number". "Pick the easiest keyword on your last list" leaves him asking "what list?", and he leaves on the question; "Open Ahrefs. Take the easiest keyword on the list it gives you and Google it." does not. A test he runs opens on the thing he opens and what he looks at. Plain words are never vague words: avoiding a tool's term by saying "the list" or "the number" with nothing before it is worse than the term.`;

export const WRITER = amend(WRITER_V20, [
  [
    `Read each sentence aloud in your head once before you keep it; if you would say it differently out loud, write it the way you would say it.`,
    `Read each sentence aloud in your head once before you keep it; if you would say it differently out loud, write it the way you would say it.

${NAME_IT_FIRST}`,
  ],
]);

const SYSTEM = amend(draftPrev.system, [[WRITER_V20, WRITER]]);

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 21, system: SYSTEM };
