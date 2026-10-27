/**
 * Intake prompt, version 2: version 1's messages; the system text carries the standard as of this version (rule 1: the
 * promise is the reader's outcome; rule 8: a claim with no carrier is cut, not confessed; rule 12: an admission is a
 * minor flaw; rule 16: a piece that does not take payment states the offer in one line; the factual review's
 * resize-or-cut rewrite). The material renderers stay in version 1, which the other prompts import.
 */
import intakeV1 from "./intake.v1.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v1.ts";

type IntakeArgs = Parameters<typeof intakeV1.user>[1];

const intakePrompt: PromptModule<IntakeArgs> = { ...intakeV1, version: 2 };

export default intakePrompt;
