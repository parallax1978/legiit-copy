/**
 * Draft prompt, version 18: version 17's messages, with the type of word in the writer's brief (rule 40, the owner's
 * tell 23): the short word for the thing, a noun he can picture, a verb someone does, never a report word, never the
 * passive; the long words and their short ones listed. The system text carries the standard as of this version.
 */
import { draftPrompt as draftPrev, type DraftArgs } from "./draft.v17.ts";
import { amend, type PromptModule } from "./types.ts";
import { plainWordsText, reportWordsText } from "../plain_words.ts";

export type { DraftArgs };
export { credentialJob } from "./draft.v15.ts";
export { leadsJob } from "./draft.v14.ts";
export { plainJob, WRITERS_BRIEF } from "./draft.v16.ts";

const SYSTEM = amend(draftPrev.system, [
  [
    `The rules below are the desk's checklist, checked after you write. Write the post first; then make sure it passes.`,
    `The type of word matters as much as the grade: the short word for the thing (buy, not purchase; show, not demonstrate; read, not interpret; calls, not enquiries), a noun he can picture (the page, the client, the phone that rings), a verb someone does, the feeling named as the thing itself. Never a word from a report or a slide, and never the passive voice: a page "gets picked" by nobody, so say who picked it. Long words and the short ones to use instead: ${plainWordsText()}. Report words that never belong: ${reportWordsText()}.

The rules below are the desk's checklist, checked after you write. Write the post first; then make sure it passes.`,
  ],
]);

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 18, system: SYSTEM };
