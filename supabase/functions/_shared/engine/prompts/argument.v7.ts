/**
 * Argument selection prompt, version 7: version 6's messages; the system text carries Section 3 as of this version
 * (hooks: where the opening line is the whole lead, three hooks are written and one is picked).
 */
import argumentV6 from "./argument.v6.ts";
import type { ArgumentArgs } from "./argument.v2.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v2.ts";

const argumentPrompt: PromptModule<ArgumentArgs> = { ...argumentV6, version: 7 };

export default argumentPrompt;
