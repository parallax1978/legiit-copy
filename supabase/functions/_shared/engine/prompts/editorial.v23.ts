/**
 * Editorial prompt, version 23: version 22's messages. The system text carries the standard as of this version
 * (Section 7's pattern tells: the even rhythm, repeated paragraph openers, the reader's imagined day, the assurance
 * word before a proof noun, the list that ends on a bare "and why"; Section 13's shape is why they exist).
 */
import { editorialPrompt as prev } from "./editorial.v22.ts";
import type { PromptModule } from "./types.ts";

export * from "./editorial.v22.ts";

type Args = Parameters<typeof prev.user>[1];

export const editorialPrompt: PromptModule<Args> = { ...prev, version: 23 };
