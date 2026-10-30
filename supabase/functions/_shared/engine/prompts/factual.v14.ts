/**
 * Factual review prompt, version 14: version 13's messages. The system text carries the standard as of this version
 * (8.1's where a fact comes from; 8.3's fabrication guard: what the product does, checks or uses is a fabrication when
 * the ledger holds it only from an example of the product's output).
 */
import { factualPrompt as factualPrev, type FactualArgs } from "./factual.v13.ts";
import type { PromptModule } from "./types.ts";

export type { FactualArgs };

export const factualPrompt: PromptModule<FactualArgs> = { ...factualPrev, version: 14 };
