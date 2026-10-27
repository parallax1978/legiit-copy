/**
 * Offer prompt, version 5: version 4's messages; the system text carries the standard as of this version (the
 * owner's tells and words, docs/04 §7.1, with rules 22, 23, 27 and 28).
 */
import offerV4 from "./offer.v4.ts";
import type { PromptModule } from "./types.ts";

export * from "./offer.v4.ts";

type Args = Parameters<typeof offerV4.user>[1];

const offerPrompt: PromptModule<Args> = { ...offerV4, version: 5 };

export default offerPrompt;
