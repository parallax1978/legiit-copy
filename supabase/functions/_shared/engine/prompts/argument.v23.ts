/**
 * Argument prompt, version 23: version 22's messages. The system text carries the standard as of this version (rule 8: the promise's place is the turn, with the product's first mention, after the trouble is told whole; a promise dropped early is sent back as promise_early).
 */
import prev from "./argument.v22.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v22.ts";

type Args = Parameters<typeof prev.user>[1];

const prompt: PromptModule<Args> = { ...prev, version: 23 };
export default prompt;
