/**
 * Factual review prompt, version 4: version 3's messages; the system text carries the standard as of this version
 * (§8.3: the rewritten line follows the owner's list in §7.1, no em dash, emoji or hashtag). The step also strips
 * those from every suggested rewrite in code.
 */
import { factualPrompt as factualPrev, type FactualArgs } from "./factual.v3.ts";
import type { PromptModule } from "./types.ts";

export type { FactualArgs };

export const factualPrompt: PromptModule<FactualArgs> = { ...factualPrev, version: 4 };
