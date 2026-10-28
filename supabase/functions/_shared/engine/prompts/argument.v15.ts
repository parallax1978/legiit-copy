/**
 * Argument prompt, version 15: version 14's messages. The system text carries the standard as of this version (Section 3's
 * hooks and the masters' opening moves; rules 2, 7 and 11 say the reader's state plainly as his situation, never in a
 * hook as an account of what he did; Section 6's Gate B and DO NOT TOUCH; Section 7.1 tells 14 to 17).
 */
import argumentV14 from "./argument.v14.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v14.ts";

type Args = Parameters<typeof argumentV14.user>[1];

const argumentPrompt: PromptModule<Args> = { ...argumentV14, version: 15 };

export default argumentPrompt;
