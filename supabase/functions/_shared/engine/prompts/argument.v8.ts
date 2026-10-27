/**
 * Argument prompt, version 8: version 7's messages; the system text carries the standard as of this version (the
 * owner's tells and words, docs/04 §7.1, with rules 22, 23, 27 and 28).
 */
import argumentV7 from "./argument.v7.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v7.ts";

type Args = Parameters<typeof argumentV7.user>[1];

const argumentPrompt: PromptModule<Args> = { ...argumentV7, version: 8 };

export default argumentPrompt;
