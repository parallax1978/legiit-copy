/**
 * Tell edit prompt, version 5: version 4's messages, with what the judges still found in a fresh post: a point said
 * twice (the checker now lists each five-word run said again, on the text that says it second), a common word coined
 * as a name for the product's output ("the read"), and a teaser in the middle of the piece that withholds nothing
 * ("I built a different way to pick them."). The system text carries the standard as of this version (steps never
 * listed or counted in a short piece, rule 1; unsourced verbatims never quoted, rule 11; docs/04 §7.1 structure).
 */
import { tellEditPrompt as tellEditPrev, type TellEditArgs } from "./tell_edit.v4.ts";
import { amend, type PromptModule } from "./types.ts";

export type { TellEditArgs };

const SYSTEM = amend(tellEditPrev.system, [
  [
    `- A phrase the piece uses three or more times keeps its first use; the later ones are cut or said another way.`,
    `- A phrase or a point the piece says twice keeps its first use; the later one is cut or said another way. The checker lists each run of five words it found said again, on the text that says it second ("repeated_phrase"); a sentence that makes the same point again in new words goes the same way.\n` +
      `- A common word made into a name for the product or its output ("the read," "the play," "the unlock") is replaced with the plain noun the reader would say ("the report"), unless it is the offer's own name.\n` +
      `- A teaser anywhere in the piece, not only at the end, that withholds nothing specific ("I built a different way to pick them.") is cut, or names the specific thing.`,
  ],
]);

export const tellEditPrompt: PromptModule<TellEditArgs> = { ...tellEditPrev, version: 5, system: SYSTEM };

export default tellEditPrompt;
