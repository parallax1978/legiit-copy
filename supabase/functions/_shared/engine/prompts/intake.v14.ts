/**
 * Intake prompt, version 14: version 13's messages. The system text carries the standard as of this version (rules
 * 39, feeling first, and 40, plain words; Gates B and D; the reviewer's directions; Section 7.1 tell 22).
 */
import intakeV13 from "./intake.v13.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v13.ts";

type Args = Parameters<typeof intakeV13.user>[1];

const intakePrompt: PromptModule<Args> = { ...intakeV13, version: 14 };

export default intakePrompt;
