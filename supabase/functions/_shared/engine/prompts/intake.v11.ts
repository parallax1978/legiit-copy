/**
 * Intake prompt, version 11: version 10's messages. The system text carries the standard as of this version (Section 3's
 * hooks and the masters' opening moves; rules 2, 7 and 11 say the reader's state plainly as his situation, never in a
 * hook as an account of what he did; Section 6's Gate B and DO NOT TOUCH; Section 7.1 tells 14 to 17).
 */
import intakeV10 from "./intake.v10.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v10.ts";

type Args = Parameters<typeof intakeV10.user>[1];

const intakePrompt: PromptModule<Args> = { ...intakeV10, version: 11 };

export default intakePrompt;
