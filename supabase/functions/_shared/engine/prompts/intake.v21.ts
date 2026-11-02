/**
 * Intake prompt, version 21: version 20's messages. The system text carries the standard as of this version (rule 40: each sentence follows from the one before, what happens before why, one way only with its doer).
 */
import prev from "./intake.v20.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v20.ts";

type Args = Parameters<typeof prev.user>[1];

const prompt: PromptModule<Args> = { ...prev, version: 21 };
export default prompt;
