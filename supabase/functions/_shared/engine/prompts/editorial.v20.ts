/**
 * Editorial prompt, version 20: version 19's messages. The system text carries the standard as of this version (rule
 * 40: a thing is named the first time it appears, never leaned on as if the reader already knew it).
 */
import { editorialPrompt as prev } from "./editorial.v19.ts";
import type { PromptModule } from "./types.ts";

export * from "./editorial.v19.ts";

type Args = Parameters<typeof prev.user>[1];

export const editorialPrompt: PromptModule<Args> = { ...prev, version: 20 };
