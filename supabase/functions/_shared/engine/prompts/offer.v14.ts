/**
 * Offer prompt, version 14: version 13's messages. The system text carries the standard as of this version (rules 1,
 * 4 and 38; rule 8: no namedrop; rules 18 and 26: a time only when it is a reason to act; Section 7.1 tells 18 to 21).
 */
import offerV13 from "./offer.v13.ts";
import type { PromptModule } from "./types.ts";

export * from "./offer.v13.ts";

type Args = Parameters<typeof offerV13.user>[1];

const offerPrompt: PromptModule<Args> = { ...offerV13, version: 14 };

export default offerPrompt;
