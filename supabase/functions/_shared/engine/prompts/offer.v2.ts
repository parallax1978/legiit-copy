/**
 * Offer construction prompt, version 2: version 1's messages, run at effort high with the full 12K output budget
 * (version 1 ran at xhigh with 8K, and the thinking alone used the budget: three truncated attempts, no offer).
 */
import offerV1 from "./offer.v1.ts";
import type { PromptModule } from "./types.ts";

type OfferArgs = Parameters<typeof offerV1.user>[1];

const offerPrompt: PromptModule<OfferArgs> = { ...offerV1, version: 2, effort: "high", maxTokens: 12000 };

export default offerPrompt;
