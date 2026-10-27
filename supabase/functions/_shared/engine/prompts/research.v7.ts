/**
 * Research prompt, version 7: version 6's messages; the system text carries the standard as of this version (a
 * quotation of a documented person or source keeps its words, rule 11; test 8 compares the guarantee sentence on a
 * page that takes payment and its condition and remedy in a piece that does not, section 8.3).
 */
import researchV6 from "./research.v6.ts";
import type { PromptModule } from "./types.ts";

export * from "./research.v6.ts";

type Args = Parameters<typeof researchV6.user>[1];

const researchPrompt: PromptModule<Args> = { ...researchV6, version: 7 };

export default researchPrompt;
