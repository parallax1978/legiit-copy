/**
 * Draft prompt, version 5: version 4's messages; the system text carries Section 3 as of this version (hooks: where the
 * opening line is the whole lead, three hooks on three reader hypotheses; the hook names the reader's need or the
 * belief displaced, in the reader's words; a number about the product's own output is proof, never the hook).
 */
import { draftPrompt as draftPrev, type DraftArgs } from "./draft.v4.ts";
import type { PromptModule } from "./types.ts";

export type { DraftArgs };

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 5 };
