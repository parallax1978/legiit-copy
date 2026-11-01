/**
 * Editorial prompt, version 22: version 21's messages. The system text carries the standard as of this version
 * (Gate B: a product named before the reader has the discovery fails; Section 9's social post builds the case first).
 */
import { editorialPrompt as prev } from "./editorial.v21.ts";
import type { PromptModule } from "./types.ts";

export * from "./editorial.v21.ts";

type Args = Parameters<typeof prev.user>[1];

export const editorialPrompt: PromptModule<Args> = { ...prev, version: 22 };
