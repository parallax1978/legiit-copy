/**
 * Editorial prompt, version 3: version 2's messages; the system text carries the standard's rules as of this version
 * (rule 1: crossheads state what the reader gets, the feature is the reason; rule 8: an owner's kept quality
 * judgment is stated in the first person at full strength, never as a measured result).
 */
import { editorialPrompt as editorialV2, type EditorialArgs } from "./editorial.v2.ts";
import type { PromptModule } from "./types.ts";

export type { EditorialArgs };

export const editorialPrompt: PromptModule<EditorialArgs> = { ...editorialV2, version: 3 };
