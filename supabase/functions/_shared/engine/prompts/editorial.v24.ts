/**
 * Editorial prompt, version 24: version 23's messages. The system text carries the standard as of this version (rule 8: the promise's place is the turn, with the product's first mention, after the trouble is told whole; a promise dropped early is sent back as promise_early).
 */
import { editorialPrompt as prev } from "./editorial.v23.ts";
import type { PromptModule } from "./types.ts";

export * from "./editorial.v23.ts";

type Args = Parameters<typeof prev.user>[1];

export const editorialPrompt: PromptModule<Args> = { ...prev, version: 24 };
