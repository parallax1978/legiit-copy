/**
 * Argument prompt, version 24: version 23's messages. The system text carries the standard as of this version (rule 8 tightened: the promise with the product's name or right after it, never before; the announced turn is a tell).
 */
import prev from "./argument.v23.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v23.ts";

type Args = Parameters<typeof prev.user>[1];

const prompt: PromptModule<Args> = { ...prev, version: 24 };
export default prompt;
