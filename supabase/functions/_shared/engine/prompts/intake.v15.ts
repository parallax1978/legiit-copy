/**
 * Intake prompt, version 15: version 14's messages. The system text carries the standard as of this version (rule
 * 40 graded as the Hemingway app grades it: Grade 6 or below for a short piece, Grade 8 for a page).
 */
import intakeV14 from "./intake.v14.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v14.ts";

type Args = Parameters<typeof intakeV14.user>[1];

const intakePrompt: PromptModule<Args> = { ...intakeV14, version: 15 };

export default intakePrompt;
