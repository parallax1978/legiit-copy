/**
 * Editorial prompt, version 7: version 6's messages; the system text carries the owner's list as of this version
 * (docs/04 §7.1: label and count windups, "in my view", filler in other words, lines built to be quoted). The
 * mechanical report it reads is now computed on the draft under review (steps/editorial.ts).
 */
import { editorialPrompt as editorialPrev, type EditorialArgs } from "./editorial.v6.ts";
import type { PromptModule } from "./types.ts";

export type { EditorialArgs };

export const editorialPrompt: PromptModule<EditorialArgs> = { ...editorialPrev, version: 7 };
