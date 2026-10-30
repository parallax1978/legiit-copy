/**
 * Revise prompt, version 17: version 16's messages. The system text carries the standard as of this version (rule 40
 * graded as the Hemingway app grades it: Grade 6 or below for a short piece, Grade 8 for a page).
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v16.ts";
import type { PromptModule } from "./types.ts";

export type { ReviseArgs };

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 17 };
