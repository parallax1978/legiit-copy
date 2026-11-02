/**
 * Intake prompt, version 20: version 19's messages. The system text carries the standard as of this version (rule 8 tightened: the promise with the product's name or right after it, never before; the announced turn is a tell).
 */
import prev from "./intake.v19.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v19.ts";

type Args = Parameters<typeof prev.user>[1];

const prompt: PromptModule<Args> = { ...prev, version: 20 };
export default prompt;
