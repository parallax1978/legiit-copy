/**
 * Argument selection prompt, version 4: version 3's messages; the system text carries the standard's rules as of
 * this version (rule 1: crossheads state what the reader gets; rule 8: an owner's kept quality judgment is stated
 * in the first person at full strength, never as a measured result).
 */
import argumentV3 from "./argument.v3.ts";
import type { ArgumentArgs } from "./argument.v2.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v2.ts";

const argumentPrompt: PromptModule<ArgumentArgs> = { ...argumentV3, version: 4 };

export default argumentPrompt;
