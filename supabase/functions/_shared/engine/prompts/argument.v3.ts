/**
 * Argument selection prompt, version 3: the user message is version 2's; the system text carries the standard's
 * rules as of this version (rule 1: the promise is the reader's outcome, never the product's category or steps;
 * rule 8: a claim with no carrier is cut, not confessed; section 2: a promise that restates the mechanism scores
 * C5 and C11 at most 1).
 */
import argumentV2 from "./argument.v2.ts";
import type { ArgumentArgs } from "./argument.v2.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v2.ts";

const argumentPrompt: PromptModule<ArgumentArgs> = { ...argumentV2, version: 3 };

export default argumentPrompt;
