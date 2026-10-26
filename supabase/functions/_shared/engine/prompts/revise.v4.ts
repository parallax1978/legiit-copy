/**
 * Revise prompt, version 4: version 3's messages; the system text carries the standard as of this version (rule 16
 * and section 8.1: a piece that does not take payment states the offer in one line; the trial and cancel terms bind
 * the page that takes the billing details, and a post, ad, email or message is never flagged for them).
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v3.ts";
import type { PromptModule } from "./types.ts";

export type { ReviseArgs };

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 4 };
