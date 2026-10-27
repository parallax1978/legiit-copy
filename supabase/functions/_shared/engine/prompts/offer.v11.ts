/**
 * Offer prompt, version 11: version 10's messages; the system text carries the standard as of this version (a
 * quotation of a documented person or source keeps its words, rule 11; test 8 compares the guarantee sentence on a
 * page that takes payment and its condition and remedy in a piece that does not, section 8.3).
 */
import offerV10 from "./offer.v10.ts";
import type { PromptModule } from "./types.ts";

export * from "./offer.v10.ts";

type Args = Parameters<typeof offerV10.user>[1];

const offerPrompt: PromptModule<Args> = { ...offerV10, version: 11 };

export default offerPrompt;
