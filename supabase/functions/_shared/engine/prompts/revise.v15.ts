/**
 * Revise prompt, version 15: version 14's messages, with the revision discipline tightened to the sentence: inside a
 * quoted block every sentence no note quotes comes back as it was, the sentence that introduces the product is never
 * cut or merged away, a rebuilt line stands on its own and never points at another block or at the lead-in, and an
 * example line in a note shows the move, never the words. The desk verifies the first two by machine.
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v14.ts";
import { amend, type PromptModule } from "./types.ts";

export type { ReviseArgs };

const SYSTEM = amend(revisePrev.system, [
  [
    `1. Change only blocks a note quotes. A block no note refers to is returned byte for byte as it was; the desk reverts any other edit.`,
    `1. Change only the sentence a note quotes. Inside a quoted block, every sentence no note quotes is returned byte for byte as it was, in its place; a block no note refers to is returned byte for byte as it was; the desk reverts any other edit, and a block whose unquoted sentences changed or vanished goes back to the original, fix and all. The sentence that introduces the product by name (rule 38) is never cut, merged away or rewritten unless a note quotes it: when a note says the product is used before it is introduced, cut or rewrite the early use, never the introduction.`,
  ],
  [
    `(e) the cold read's attention-drop line, only if a note or tell already touches it.`,
    `(e) the cold read's attention-drop line, only if a note or tell already touches it.
(f) A rebuilt line stands on its own: never "both of those", "that check" or "the two questions" pointing at a line in another block or in the lead-in (the lead-in is chosen from three, and the other two go). An example line in a note shows the move; the rebuilt line is written from a fact the piece holds, in the speaker's words, never the example's words (six words in a row from it never appear).`,
  ],
]);

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 15, system: SYSTEM };
