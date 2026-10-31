/**
 * Factual prompt, version 16: version 15's messages. The system text carries the standard as of this version (rule
 * 40: a thing is named the first time it appears, never leaned on as if the reader already knew it).
 */
import { factualPrompt as prev } from "./factual.v15.ts";
import type { PromptModule } from "./types.ts";

export * from "./factual.v15.ts";

type Args = Parameters<typeof prev.user>[1];

export const factualPrompt: PromptModule<Args> = { ...prev, version: 16 };
