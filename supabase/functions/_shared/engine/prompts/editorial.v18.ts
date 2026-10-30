/**
 * Editorial prompt, version 18: version 17's messages. The system text carries the standard as of this version (rule
 * 40 graded as the Hemingway app grades it: Grade 6 or below for a short piece, Grade 8 for a page).
 */
import { editorialPrompt as editorialPrev, type EditorialArgs } from "./editorial.v17.ts";
import type { PromptModule } from "./types.ts";

export type { EditorialArgs };

export const editorialPrompt: PromptModule<EditorialArgs> = { ...editorialPrev, version: 18 };
