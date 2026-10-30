/**
 * Offer prompt, version 15: version 14's messages. The system text carries the standard as of this version (8.1's
 * where a fact comes from: a premium or a first visible win is built from what the seller says the product does,
 * never from an example of its output).
 */
import offerV14 from "./offer.v14.ts";
import type { PromptModule } from "./types.ts";

export * from "./offer.v14.ts";

type Args = Parameters<typeof offerV14.user>[1];

const offerPrompt: PromptModule<Args> = { ...offerV14, version: 15 };

export default offerPrompt;
