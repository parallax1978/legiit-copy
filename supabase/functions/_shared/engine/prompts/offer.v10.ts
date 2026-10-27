/**
 * Offer prompt, version 10: version 9's messages; the system text carries the standard as of this version (precision is about the numbers and the size of a claim and never asks for a detail that weakens the proof, rule 10; the proof's subject described by what it is and sells, section 4 item 8; a reviewer's direction never asks for such a detail, and the revision after the last review applies its notes, section 6; a credential never a sentence of its own, one sentence of internals in a short piece, the slogan couplet and the reframe written as an aphorism, section 7.1).
 */
import offerV9 from "./offer.v9.ts";
import type { PromptModule } from "./types.ts";

export * from "./offer.v9.ts";

type Args = Parameters<typeof offerV9.user>[1];

const offerPrompt: PromptModule<Args> = { ...offerV9, version: 10 };

export default offerPrompt;
