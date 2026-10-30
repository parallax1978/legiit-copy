/**
 * Argument prompt, version 19: version 18's messages. The system text carries the standard as of this version (rule
 * 40 graded as the Hemingway app grades it: Grade 6 or below for a short piece, Grade 8 for a page).
 */
import argumentV18 from "./argument.v18.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v18.ts";

type Args = Parameters<typeof argumentV18.user>[1];

const argumentPrompt: PromptModule<Args> = { ...argumentV18, version: 19 };

export default argumentPrompt;
