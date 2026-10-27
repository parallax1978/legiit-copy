/**
 * Argument prompt, version 9: version 8's messages; the system text carries the standard as of this version (legal boilerplate on the owner's list, docs/04 §7.1; no detail volunteered that weakens the proof, rule 12; the factual review's flags are the user's decisions, §8.3).
 */
import argumentV8 from "./argument.v8.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v8.ts";

type Args = Parameters<typeof argumentV8.user>[1];

const argumentPrompt: PromptModule<Args> = { ...argumentV8, version: 9 };

export default argumentPrompt;
