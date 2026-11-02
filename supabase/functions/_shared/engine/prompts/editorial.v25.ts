/**
 * Editorial prompt, version 25: version 24's messages. The system text carries the standard as of this version (rule 8 tightened: the promise with the product's name or right after it, never before; the announced turn is a tell).
 */
import { editorialPrompt as prev } from "./editorial.v24.ts";
import type { PromptModule } from "./types.ts";

export * from "./editorial.v24.ts";

type Args = Parameters<typeof prev.user>[1];

export const editorialPrompt: PromptModule<Args> = { ...prev, version: 25 };
