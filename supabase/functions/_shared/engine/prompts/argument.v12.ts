/**
 * Argument prompt, version 12: version 11's messages; the system text carries the standard as of this version (precision is about the numbers and the size of a claim and never asks for a detail that weakens the proof, rule 10; the proof's subject described by what it is and sells, section 4 item 8; a reviewer's direction never asks for such a detail, and the revision after the last review applies its notes, section 6; a credential never a sentence of its own, one sentence of internals in a short piece, the slogan couplet and the reframe written as an aphorism, and tell 4's counts scoped as the detector scopes them, section 7.1; a ledger row keeps its precision words and a line the offer block says to repeat keeps its wording, and a verbatim adds no detail it lacks, rule 11; the short-piece guarantee keeps its condition and remedy, rule 16 and section 8.1; the checklist's fix for "you're not alone" follows rule 11, section 7).
 */
import argumentV11 from "./argument.v11.ts";
import type { PromptModule } from "./types.ts";

export * from "./argument.v11.ts";

type Args = Parameters<typeof argumentV11.user>[1];

const argumentPrompt: PromptModule<Args> = { ...argumentV11, version: 12 };

export default argumentPrompt;
