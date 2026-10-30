/**
 * Offer prompt, version 17: version 16's messages. The system text carries the standard as of this version (rule
 * 40 graded as the Hemingway app grades it: Grade 6 or below for a short piece, Grade 8 for a page).
 */
import offerV16 from "./offer.v16.ts";
import type { PromptModule } from "./types.ts";

export * from "./offer.v16.ts";

type Args = Parameters<typeof offerV16.user>[1];

const offerPrompt: PromptModule<Args> = { ...offerV16, version: 17 };

export default offerPrompt;
