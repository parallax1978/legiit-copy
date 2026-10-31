/**
 * Research prompt, version 12: version 11's messages. The system text carries the standard as of this version (rule
 * 40: a thing is named the first time it appears, never leaned on as if the reader already knew it).
 */
import prev from "./research.v11.ts";
import type { PromptModule } from "./types.ts";

export * from "./research.v11.ts";

type Args = Parameters<typeof prev.user>[1];

const prompt: PromptModule<Args> = { ...prev, version: 12 };

export default prompt;
