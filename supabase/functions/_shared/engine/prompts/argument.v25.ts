/**
 * Argument prompt, version 25: version 24's messages. The system text carries the standard as of this version (rule 40: each sentence follows from the one before, what happens before why, one way only with its doer).
 */
import prev from "./argument.v24.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v24.ts";

type Args = Parameters<typeof prev.user>[1];

const prompt: PromptModule<Args> = { ...prev, version: 25 };
export default prompt;
