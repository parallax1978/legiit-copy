/**
 * Editorial prompt, version 26: version 25's messages. The system text carries the standard as of this version (rule 40: each sentence follows from the one before, what happens before why, one way only with its doer).
 */
import { editorialPrompt as prev } from "./editorial.v25.ts";
import type { PromptModule } from "./types.ts";

export * from "./editorial.v25.ts";

type Args = Parameters<typeof prev.user>[1];

export const editorialPrompt: PromptModule<Args> = { ...prev, version: 26 };
