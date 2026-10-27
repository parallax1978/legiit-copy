/**
 * Research prompt, version 6: version 5's messages; the system text carries the standard as of this version (precision is about the numbers and the size of a claim and never asks for a detail that weakens the proof, rule 10; the proof's subject described by what it is and sells, section 4 item 8; a reviewer's direction never asks for such a detail, and the revision after the last review applies its notes, section 6; a credential never a sentence of its own, one sentence of internals in a short piece, the slogan couplet and the reframe written as an aphorism, section 7.1).
 */
import researchV5 from "./research.v5.ts";
import type { PromptModule } from "./types.ts";

export * from "./research.v5.ts";

type Args = Parameters<typeof researchV5.user>[1];

const researchPrompt: PromptModule<Args> = { ...researchV5, version: 6 };

export default researchPrompt;
