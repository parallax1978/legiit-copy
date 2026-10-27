/**
 * Revise prompt, version 6: version 5's messages; the system text carries the owner's list as of this version
 * (docs/04 §7.1: label and count windups, "in my view", filler in other words, lines built to be quoted).
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v5.ts";
import type { PromptModule } from "./types.ts";

export type { ReviseArgs };

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 6 };
