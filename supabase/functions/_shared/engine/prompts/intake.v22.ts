/**
 * Intake prompt, version 22: version 21's messages. The system text carries the standard as of this version (rule 40: every sentence tells him something he did not know; no truism, no setup sentence; a thing is named inside the sentence that does work with it).
 */
import prev from "./intake.v21.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v21.ts";

type Args = Parameters<typeof prev.user>[1];

const prompt: PromptModule<Args> = { ...prev, version: 22 };
export default prompt;
