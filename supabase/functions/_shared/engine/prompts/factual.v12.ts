/**
 * Factual review prompt, version 12: version 11's messages. The system text carries the owner's list as of this
 * version (Section 7.1 tells 14 to 17), so a suggested rewrite never brings in a rejected opening shape.
 */
import { factualPrompt as factualPrev, type FactualArgs } from "./factual.v11.ts";
import type { PromptModule } from "./types.ts";

export type { FactualArgs };

export const factualPrompt: PromptModule<FactualArgs> = { ...factualPrev, version: 12 };
