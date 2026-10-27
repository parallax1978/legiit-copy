/**
 * Editorial prompt, version 5: version 4's messages; the system text carries Section 3 as of this version (hooks: where the
 * opening line is the whole lead, three hooks on three reader hypotheses; the hook names the reader's need or the
 * belief displaced, in the reader's words; a number about the product's own output is proof, never the hook).
 */
import { editorialPrompt as editorialPrev, type EditorialArgs } from "./editorial.v4.ts";
import type { PromptModule } from "./types.ts";

export type { EditorialArgs };

export const editorialPrompt: PromptModule<EditorialArgs> = { ...editorialPrev, version: 5 };
