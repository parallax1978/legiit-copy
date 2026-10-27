/**
 * Draft prompt, version 10: version 9's messages; the system text carries the standard as of this version (a ledger row is the fact, not the wording, and a verbatim gives the substance, never its survey wording, rule 11; the offer once where the format puts it and the guarantee as one short promise, rule 16; the proof in the promise's own terms, section 4 item 8; "short piece" named once in rule 1 and used throughout; the colon reveal, the "What ... is" opener and the "was never" reveal, section 7.1; say it once with the repeats the formats ask for kept; Gate C and D and the reviewer's directions follow, section 6).
 */
import { draftPrompt as draftPrev, type DraftArgs } from "./draft.v9.ts";
import type { PromptModule } from "./types.ts";

export type { DraftArgs };

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 10 };
