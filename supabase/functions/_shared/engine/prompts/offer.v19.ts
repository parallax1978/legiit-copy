/**
 * Offer prompt, version 19: version 18's messages. The system text carries the standard as of this version (rule
 * 40: a thing is named the first time it appears, never leaned on as if the reader already knew it).
 */
import prev from "./offer.v18.ts";
import type { PromptModule } from "./types.ts";

export * from "./offer.v18.ts";

type Args = Parameters<typeof prev.user>[1];

const prompt: PromptModule<Args> = { ...prev, version: 19 };

export default prompt;
