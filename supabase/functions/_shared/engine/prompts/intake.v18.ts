/**
 * Intake prompt, version 18: version 17's messages. The system text carries the standard as of this version (rule
 * 40: a thing is named the first time it appears, never leaned on as if the reader already knew it).
 */
import prev from "./intake.v17.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v17.ts";

type Args = Parameters<typeof prev.user>[1];

const prompt: PromptModule<Args> = { ...prev, version: 18 };

export default prompt;
