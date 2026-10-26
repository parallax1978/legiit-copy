/**
 * Argument selection prompt, version 6: version 5's messages; the system text carries rule 16 as of this version
 * (a piece that does not take payment states the offer in one line).
 */
import argumentV5 from "./argument.v5.ts";
import type { ArgumentArgs } from "./argument.v2.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v2.ts";

const argumentPrompt: PromptModule<ArgumentArgs> = { ...argumentV5, version: 6 };

export default argumentPrompt;
