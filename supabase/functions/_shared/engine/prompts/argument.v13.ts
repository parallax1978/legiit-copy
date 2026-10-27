/**
 * Argument prompt, version 13: version 12's messages; the system text carries the standard as of this version (a
 * quotation of a documented person or source keeps its words, rule 11; test 8 compares the guarantee sentence on a
 * page that takes payment and its condition and remedy in a piece that does not, section 8.3).
 */
import argumentV12 from "./argument.v12.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v12.ts";

type Args = Parameters<typeof argumentV12.user>[1];

const argumentPrompt: PromptModule<Args> = { ...argumentV12, version: 13 };

export default argumentPrompt;
