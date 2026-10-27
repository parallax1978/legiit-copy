/**
 * Argument prompt, version 12: version 11's messages; the system text carries the standard as of this version (precision is about the numbers and the size of a claim and never asks for a detail that weakens the proof, rule 10; the proof's subject described by what it is and sells, section 4 item 8; a reviewer's direction never asks for such a detail, section 6).
 */
import argumentV11 from "./argument.v11.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v11.ts";

type Args = Parameters<typeof argumentV11.user>[1];

const argumentPrompt: PromptModule<Args> = { ...argumentV11, version: 12 };

export default argumentPrompt;
