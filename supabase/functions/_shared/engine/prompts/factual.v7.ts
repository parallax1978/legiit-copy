/**
 * Factual review prompt, version 7: version 6's messages; the system text carries the standard as of this version (in a post, an ad, an email or a message the product's steps are never listed or counted, rule 1, and a step count is a windup, §7.1 tell 4; a verbatim with no ledger row is never quoted or attributed, rule 11; the trial's limits stay on the payment page, rule 16; each point said once, no coined name for the product's output and no empty teaser anywhere, §7.1 structure; Gate D and the reviewer's directions follow, §6).
 */
import { factualPrompt as factualPrev, type FactualArgs } from "./factual.v6.ts";
import type { PromptModule } from "./types.ts";

export type { FactualArgs };

export const factualPrompt: PromptModule<FactualArgs> = { ...factualPrev, version: 7 };
