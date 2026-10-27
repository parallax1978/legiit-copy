/**
 * Intake prompt, version 10: version 9's messages; the system text carries the standard as of this version (sell the result, rule 8; precision never sizes a promise down, rule 10; a line true only with a weakening detail is rewritten, rule 12; the short-piece guarantee only when the offer leads with it, rule 16; indicative with no conditional voice, rule 20; section 2's promise, C8 and C9; section 4's no-results proof and the obvious demonstration; the first-week check, section 5; Gates A and C and the reviewer's directions, section 6; the outcome, reasoning and situation rows, grade F and the factual procedure, section 8).
 */
import intakeV9 from "./intake.v9.ts";
import type { PromptModule } from "./types.ts";

export * from "./intake.v9.ts";

type Args = Parameters<typeof intakeV9.user>[1];

const intakePrompt: PromptModule<Args> = { ...intakeV9, version: 10 };

export default intakePrompt;
