/**
 * Editorial prompt, version 11: version 10's messages; the system text carries the standard as of this version (precision is about the numbers and the size of a claim and never asks for a detail that weakens the proof, rule 10; the proof's subject described by what it is and sells, section 4 item 8; a reviewer's direction never asks for such a detail, and the revision after the last review applies its notes, section 6; a credential never a sentence of its own, one sentence of internals in a short piece, the slogan couplet and the reframe written as an aphorism, section 7.1).
 */
import { editorialPrompt as editorialPrev, type EditorialArgs } from "./editorial.v10.ts";
import type { PromptModule } from "./types.ts";

export type { EditorialArgs };

export const editorialPrompt: PromptModule<EditorialArgs> = { ...editorialPrev, version: 11 };
