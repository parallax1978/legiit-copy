/**
 * Editorial prompt, version 21: version 20's messages. The system text carries the standard as of this version
 * (Gate C: two proofs that turn on the same fact pointing opposite ways, with no line saying what decided each, fail).
 */
import { editorialPrompt as prev } from "./editorial.v20.ts";
import type { PromptModule } from "./types.ts";

export * from "./editorial.v20.ts";

type Args = Parameters<typeof prev.user>[1];

export const editorialPrompt: PromptModule<Args> = { ...prev, version: 21 };
