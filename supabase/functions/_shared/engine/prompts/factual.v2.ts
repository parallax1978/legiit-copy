/**
 * Factual review prompt, version 2: the user message is version 1's; the system text carries the standard's rules
 * as of this version (rule 8: a claim with no carrier is cut, not confessed; rule 12: an admission is a minor flaw,
 * never the absence of proof). A suggested rewrite never announces missing proof, tests or results.
 */
import { factualPrompt as factualV1, type FactualArgs } from "./factual.v1.ts";
import type { PromptModule } from "./types.ts";

export type { FactualArgs };

export const factualPrompt: PromptModule<FactualArgs> = { ...factualV1, version: 2 };
