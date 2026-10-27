/**
 * Offer construction prompt, version 4: version 3's messages and settings; the system text carries the standard as of
 * this version (rule 16: a piece that does not take payment states the offer in one line; the continuity row binds the
 * page that takes the billing details).
 */
import offerV3 from "./offer.v3.ts";
import type { PromptModule } from "./types.ts";

type OfferArgs = Parameters<typeof offerV3.user>[1];

const offerPrompt: PromptModule<OfferArgs> = { ...offerV3, version: 4 };

export default offerPrompt;
