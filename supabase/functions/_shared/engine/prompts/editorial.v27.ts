/**
 * Editorial prompt, version 27: version 26's messages. The system text carries the standard as of this version (rule 40: every sentence tells him something he did not know; no truism, no setup sentence; a thing is named inside the sentence that does work with it).
 */
import { editorialPrompt as prev } from "./editorial.v26.ts";
import type { PromptModule } from "./types.ts";

export * from "./editorial.v26.ts";

type Args = Parameters<typeof prev.user>[1];

export const editorialPrompt: PromptModule<Args> = { ...prev, version: 27 };
