/**
 * Draft prompt, version 12: version 11's messages; the system text carries the standard as of this version (a
 * quotation of a documented person or source keeps its words, rule 11; test 8 compares the guarantee sentence on a
 * page that takes payment and its condition and remedy in a piece that does not, section 8.3).
 */
import { draftPrompt as draftPrev, type DraftArgs } from "./draft.v11.ts";
import type { PromptModule } from "./types.ts";

export type { DraftArgs };

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 12 };
