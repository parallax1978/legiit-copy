/**
 * Intake prompt, version 19: version 18's messages. The system text carries the standard as of this version (rule 8: the promise's place is the turn, with the product's first mention, after the trouble is told whole; a promise dropped early is sent back as promise_early).
 */
import prev from "./intake.v18.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v18.ts";

type Args = Parameters<typeof prev.user>[1];

const prompt: PromptModule<Args> = { ...prev, version: 19 };
export default prompt;
