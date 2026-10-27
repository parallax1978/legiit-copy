/**
 * Intake prompt, version 5: version 4's messages; the system text carries the standard as of this version (legal boilerplate on the owner's list, docs/04 §7.1; no detail volunteered that weakens the proof, rule 12; the factual review's flags are the user's decisions, §8.3).
 */
import intakeV4 from "./intake.v4.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v4.ts";

type Args = Parameters<typeof intakeV4.user>[1];

const intakePrompt: PromptModule<Args> = { ...intakeV4, version: 5 };

export default intakePrompt;
