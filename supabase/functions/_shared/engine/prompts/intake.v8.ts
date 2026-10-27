/**
 * Intake prompt, version 8: version 7's messages; the system text carries the standard as of this version (precision is about the numbers and the size of a claim and never asks for a detail that weakens the proof, rule 10; the proof's subject described by what it is and sells, section 4 item 8; a reviewer's direction never asks for such a detail, section 6).
 */
import intakeV7 from "./intake.v7.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v7.ts";

type Args = Parameters<typeof intakeV7.user>[1];

const intakePrompt: PromptModule<Args> = { ...intakeV7, version: 8 };

export default intakePrompt;
