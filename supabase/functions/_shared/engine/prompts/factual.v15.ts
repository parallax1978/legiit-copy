/**
 * Factual review prompt, version 15: version 14's messages. The system text carries the owner's list as of this
 * version (Section 7.1 tell 23), so a suggested rewrite never brings in a long word or a report word.
 */
import { factualPrompt as factualPrev, type FactualArgs } from "./factual.v14.ts";
import type { PromptModule } from "./types.ts";

export type { FactualArgs };

export const factualPrompt: PromptModule<FactualArgs> = { ...factualPrev, version: 15 };
