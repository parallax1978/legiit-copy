/**
 * Editorial prompt, version 19: version 18's messages. The system text carries the standard as of this version (rule
 * 40, the type of word and the passive voice; Section 7.1 tell 23).
 */
import { editorialPrompt as editorialPrev, type EditorialArgs } from "./editorial.v18.ts";
import type { PromptModule } from "./types.ts";

export type { EditorialArgs };

export const editorialPrompt: PromptModule<EditorialArgs> = { ...editorialPrev, version: 19 };
