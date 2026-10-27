/**
 * Draft prompt, version 11: version 10's messages; the system text carries the standard as of this version (precision is about the numbers and the size of a claim and never asks for a detail that weakens the proof, rule 10; the proof's subject described by what it is and sells, section 4 item 8; a reviewer's direction never asks for such a detail, section 6).
 */
import { draftPrompt as draftPrev, type DraftArgs } from "./draft.v10.ts";
import type { PromptModule } from "./types.ts";

export type { DraftArgs };

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 11 };
