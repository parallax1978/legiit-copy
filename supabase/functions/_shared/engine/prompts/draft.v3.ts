/**
 * Draft prompt, version 3: version 2's messages; the system text carries the standard's rules as of this version
 * (rule 1: crossheads state what the reader gets, the feature is the reason; rule 8: an owner's kept quality
 * judgment is stated in the first person at full strength, never as a measured result).
 */
import { draftPrompt as draftV2, type DraftArgs } from "./draft.v2.ts";
import type { PromptModule } from "./types.ts";

export type { DraftArgs };

export const draftPrompt: PromptModule<DraftArgs> = { ...draftV2, version: 3 };
