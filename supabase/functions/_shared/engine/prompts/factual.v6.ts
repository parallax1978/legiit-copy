/**
 * Factual review prompt, version 6: version 5's messages; the system text carries the standard as of this version (legal boilerplate on the owner's list, docs/04 §7.1; no detail volunteered that weakens the proof, rule 12; the factual review's flags are the user's decisions, §8.3). A rewrite that adds legal boilerplate is a
 * violation the step sends back for one retry and then drops (draft/review.ts).
 */
import { factualPrompt as factualPrev, type FactualArgs } from "./factual.v5.ts";
import type { PromptModule } from "./types.ts";

export type { FactualArgs };

export const factualPrompt: PromptModule<FactualArgs> = { ...factualPrev, version: 6 };
