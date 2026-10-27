/**
 * Factual review prompt, version 5: version 4's messages, with the owner's list itself (docs/04 §7.1) in the system
 * text. Version 4 told the reviewer its rewritten lines follow §7.1 without showing it; a rewrite that still brings
 * in one of its tells or words is a violation the step sends back for one retry (draft/review.ts).
 */
import { factualPrompt as factualPrev, type FactualArgs } from "./factual.v4.ts";
import type { PromptModule } from "./types.ts";
import { OWNER_TELLS } from "./standard.ts";

export type { FactualArgs };

const SYSTEM = `${factualPrev.system}\n\n${OWNER_TELLS}\n\nEvery suggested_rewrite is new copy and follows that list: none of its tells or words, no em dash, emoji or hashtag. A rewrite never brings in one the line did not have.`;

export const factualPrompt: PromptModule<FactualArgs> = { ...factualPrev, version: 5, system: SYSTEM };
