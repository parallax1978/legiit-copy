/**
 * Offer prompt, version 7: version 6's messages; the system text carries the standard as of this version (legal boilerplate on the owner's list, docs/04 §7.1; no detail volunteered that weakens the proof, rule 12; the factual review's flags are the user's decisions, §8.3).
 */
import offerV6 from "./offer.v6.ts";
import type { PromptModule } from "./types.ts";

export * from "./offer.v6.ts";

type Args = Parameters<typeof offerV6.user>[1];

const offerPrompt: PromptModule<Args> = { ...offerV6, version: 7 };

export default offerPrompt;
