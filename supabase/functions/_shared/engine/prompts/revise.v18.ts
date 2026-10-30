/**
 * Revise prompt, version 18: version 17's messages. The system text carries the standard as of this version (rule 40,
 * the type of word and the passive voice; Section 7.1 tell 23).
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v17.ts";
import type { PromptModule } from "./types.ts";

export type { ReviseArgs };

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 18 };
