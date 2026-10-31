/**
 * Tell edit prompt, version 17: version 16's messages. The system text carries the standard as of this version (rule
 * 40: a thing is named the first time it appears, never leaned on as if the reader already knew it).
 */
import { tellEditPrompt as prev } from "./tell_edit.v16.ts";
import type { PromptModule } from "./types.ts";

export * from "./tell_edit.v16.ts";

type Args = Parameters<typeof prev.user>[1];

export const tellEditPrompt: PromptModule<Args> = { ...prev, version: 17 };
