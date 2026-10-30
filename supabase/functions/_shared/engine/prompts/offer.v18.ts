/**
 * Offer prompt, version 18: version 17's messages. The system text carries the standard as of this version (rule
 * 40, the type of word and the passive voice; Section 7.1 tell 23).
 */
import offerV17 from "./offer.v17.ts";
import type { PromptModule } from "./types.ts";

export * from "./offer.v17.ts";

type Args = Parameters<typeof offerV17.user>[1];

const offerPrompt: PromptModule<Args> = { ...offerV17, version: 18 };

export default offerPrompt;
