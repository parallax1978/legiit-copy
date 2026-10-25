/**
 * Revise prompt, version 2: the user message is version 1's; the system text carries the standard's rules as of this
 * version (rule 1: the promise is the reader's outcome, never the product's category or steps; rule 8: a claim with
 * no carrier is cut, not confessed; rule 12: an admission is a minor flaw, never the absence of proof; section 7:
 * the proof confession is a Tier 0 tell).
 */
import { revisePrompt as reviseV1, type ReviseArgs } from "./revise.v1.ts";
import type { PromptModule } from "./types.ts";

export type { ReviseArgs };

export const revisePrompt: PromptModule<ReviseArgs> = { ...reviseV1, version: 2 };
