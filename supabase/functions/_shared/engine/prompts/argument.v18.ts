/**
 * Argument prompt, version 18: version 17's messages. The system text carries the standard as of this version (rules
 * 39, feeling first, and 40, plain words; Gates B and D; the reviewer's directions; Section 7.1 tell 22).
 */
import argumentV17 from "./argument.v17.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v17.ts";

type Args = Parameters<typeof argumentV17.user>[1];

const argumentPrompt: PromptModule<Args> = { ...argumentV17, version: 18 };

export default argumentPrompt;
