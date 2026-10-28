/**
 * Factual review prompt, version 13: version 12's messages. The system text carries the owner's list as of this
 * version (Section 7.1 tells 18 to 21), so a suggested rewrite never brings in a namedrop, a wait or the product's work
 * sent to someone else.
 */
import { factualPrompt as factualPrev, type FactualArgs } from "./factual.v12.ts";
import type { PromptModule } from "./types.ts";

export type { FactualArgs };

export const factualPrompt: PromptModule<FactualArgs> = { ...factualPrev, version: 13 };
