/**
 * Intake prompt, version 9: version 8's messages; the system text carries the standard as of this version (a
 * quotation of a documented person or source keeps its words, rule 11; test 8 compares the guarantee sentence on a
 * page that takes payment and its condition and remedy in a piece that does not, section 8.3).
 */
import intakeV8 from "./intake.v8.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v8.ts";

type Args = Parameters<typeof intakeV8.user>[1];

const intakePrompt: PromptModule<Args> = { ...intakeV8, version: 9 };

export default intakePrompt;
