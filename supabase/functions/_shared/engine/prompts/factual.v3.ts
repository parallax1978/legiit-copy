/**
 * Factual prompt, version 3: version 2's messages; the system text carries the standard as of this version (rule 16
 * and section 8.1: a piece that does not take payment states the offer in one line; the trial and cancel terms bind
 * the page that takes the billing details, and a post, ad, email or message is never flagged for them).
 */
import { factualPrompt as factualPrev, type FactualArgs } from "./factual.v2.ts";
import type { PromptModule } from "./types.ts";

export type { FactualArgs };

export const factualPrompt: PromptModule<FactualArgs> = { ...factualPrev, version: 3 };
