/**
 * Argument selection prompt, version 5: version 4's messages; the system text carries Section 2, rule 7 as of this
 * version (among candidates on the desire the purpose names, C1-C3 do not rank one over another).
 */
import argumentV4 from "./argument.v4.ts";
import type { ArgumentArgs } from "./argument.v2.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v2.ts";

const argumentPrompt: PromptModule<ArgumentArgs> = { ...argumentV4, version: 5 };

export default argumentPrompt;
