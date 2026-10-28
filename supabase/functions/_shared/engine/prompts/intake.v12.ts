/**
 * Intake prompt, version 12: version 11's messages. The system text carries the standard as of this version (rules 1,
 * 4 and 38; rule 8: no namedrop; rules 18 and 26: a time only when it is a reason to act; Section 7.1 tells 18 to 21).
 */
import intakeV11 from "./intake.v11.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v11.ts";

type Args = Parameters<typeof intakeV11.user>[1];

const intakePrompt: PromptModule<Args> = { ...intakeV11, version: 12 };

export default intakePrompt;
