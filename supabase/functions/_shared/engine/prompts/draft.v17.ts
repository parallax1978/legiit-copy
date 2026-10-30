/**
 * Draft prompt, version 17: version 16's messages. The system text carries the standard as of this version (rule 40
 * graded as the Hemingway app grades it: Grade 6 or below for a short piece, Grade 8 for a page).
 */
import { draftPrompt as draftPrev, type DraftArgs } from "./draft.v16.ts";
import type { PromptModule } from "./types.ts";

export type { DraftArgs };
export { credentialJob } from "./draft.v15.ts";
export { leadsJob } from "./draft.v14.ts";
export { plainJob, WRITERS_BRIEF } from "./draft.v16.ts";

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 17 };
