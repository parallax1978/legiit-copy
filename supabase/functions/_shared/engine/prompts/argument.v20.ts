/**
 * Argument prompt, version 20: version 19's messages. The system text carries the standard as of this version (rule
 * 40, the type of word and the passive voice; Section 7.1 tell 23).
 */
import argumentV19 from "./argument.v19.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v19.ts";

type Args = Parameters<typeof argumentV19.user>[1];

const argumentPrompt: PromptModule<Args> = { ...argumentV19, version: 20 };

export default argumentPrompt;
