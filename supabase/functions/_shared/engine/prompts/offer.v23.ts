/**
 * Offer prompt, version 23: version 22's messages. The system text carries the standard as of this version (rule 40: every sentence tells him something he did not know; no truism, no setup sentence; a thing is named inside the sentence that does work with it).
 */
import prev from "./offer.v22.ts";
import type { PromptModule } from "./types.ts";

export * from "./offer.v22.ts";

type Args = Parameters<typeof prev.user>[1];

const prompt: PromptModule<Args> = { ...prev, version: 23 };
export default prompt;
