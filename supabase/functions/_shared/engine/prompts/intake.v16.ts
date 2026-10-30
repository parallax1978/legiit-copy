/**
 * Intake prompt, version 16: version 15's messages. The system text carries the standard as of this version (rule
 * 40, the type of word and the passive voice; Section 7.1 tell 23).
 */
import intakeV15 from "./intake.v15.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v15.ts";

type Args = Parameters<typeof intakeV15.user>[1];

const intakePrompt: PromptModule<Args> = { ...intakeV15, version: 16 };

export default intakePrompt;
