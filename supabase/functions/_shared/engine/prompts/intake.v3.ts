/**
 * Intake prompt, version 3: version 2's messages; the system text carries the standard as of this version (the
 * owner's tells and words, docs/04 §7.1, with rules 22, 23, 27 and 28).
 */
import intakeV2 from "./intake.v2.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v2.ts";

type Args = Parameters<typeof intakeV2.user>[1];

const intakePrompt: PromptModule<Args> = { ...intakeV2, version: 3 };

export default intakePrompt;
