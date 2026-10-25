/**
 * Editorial prompt, version 2: the user message is version 1's; the system text carries the standard's rules as of this
 * version (rule 1: the promise is the reader's outcome, never the product's category or steps; rule 8: a claim with
 * no carrier is cut, not confessed; rule 12: an admission is a minor flaw, never the absence of proof; section 7:
 * the proof confession is a Tier 0 tell).
 */
import { editorialPrompt as editorialV1, type EditorialArgs } from "./editorial.v1.ts";
import type { PromptModule } from "./types.ts";

export type { EditorialArgs };

export const editorialPrompt: PromptModule<EditorialArgs> = { ...editorialV1, version: 2 };
