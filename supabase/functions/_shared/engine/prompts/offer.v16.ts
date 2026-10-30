/**
 * Offer prompt, version 16: version 15's messages. The system text carries the standard as of this version (rules
 * 39, feeling first, and 40, plain words; Gates B and D; the reviewer's directions; Section 7.1 tell 22).
 */
import offerV15 from "./offer.v15.ts";
import type { PromptModule } from "./types.ts";

export * from "./offer.v15.ts";

type Args = Parameters<typeof offerV15.user>[1];

const offerPrompt: PromptModule<Args> = { ...offerV15, version: 16 };

export default offerPrompt;
