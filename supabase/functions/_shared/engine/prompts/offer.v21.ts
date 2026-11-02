/**
 * Offer prompt, version 21: version 20's messages. The system text carries the standard as of this version (rule 8 tightened: the promise with the product's name or right after it, never before; the announced turn is a tell).
 */
import prev from "./offer.v20.ts";
import type { PromptModule } from "./types.ts";

export * from "./offer.v20.ts";

type Args = Parameters<typeof prev.user>[1];

const prompt: PromptModule<Args> = { ...prev, version: 21 };
export default prompt;
