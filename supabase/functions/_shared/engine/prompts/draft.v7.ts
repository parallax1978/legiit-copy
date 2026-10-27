/**
 * Draft prompt, version 7: version 6's messages; the system text carries the owner's list as of this version
 * (docs/04 §7.1: label and count windups, "in my view", filler in other words, lines built to be quoted).
 */
import { draftPrompt as draftPrev, type DraftArgs } from "./draft.v6.ts";
import type { PromptModule } from "./types.ts";

export type { DraftArgs };

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 7 };
