/**
 * Editorial prompt, version 8: version 7's messages; the system text carries the standard as of this version (legal boilerplate on the owner's list, docs/04 §7.1; no detail volunteered that weakens the proof, rule 12; the factual review's flags are the user's decisions, §8.3).
 */
import { editorialPrompt as editorialPrev, type EditorialArgs } from "./editorial.v7.ts";
import type { PromptModule } from "./types.ts";

export type { EditorialArgs };

export const editorialPrompt: PromptModule<EditorialArgs> = { ...editorialPrev, version: 8 };
