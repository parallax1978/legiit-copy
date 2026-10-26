/**
 * Offer construction prompt, version 3: version 2 at effort medium. Live, high still ran past the 12K budget on the
 * first call and medium finished in about 10K, so every run paid for a truncated call before the one that worked.
 */
import offerV2 from "./offer.v2.ts";
import type { PromptModule } from "./types.ts";

type OfferArgs = Parameters<typeof offerV2.user>[1];

const offerPrompt: PromptModule<OfferArgs> = { ...offerV2, version: 3, effort: "medium" };

export default offerPrompt;
