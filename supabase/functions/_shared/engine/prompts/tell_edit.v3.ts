/**
 * Tell edit prompt, version 3: version 2's messages, with the structural tells the judges still found once the words
 * were gone: a slogan that lands after the point, a closer that says the hook again (hedged with "could" or "might"),
 * a sentence that restates the hook in new words, a leftover pointing at a cut line, a phrase repeated three times,
 * and sentences of one length. A whole sentence that only restates, announces or lands may be cut with its tags;
 * one that carries a number, a name, a date, a quote or a link never is (the guard checks).
 */
import { tellEditPrompt as tellEditPrev, type TellEditArgs } from "./tell_edit.v2.ts";
import { amend, type PromptModule } from "./types.ts";

export type { TellEditArgs };

const SYSTEM = amend(tellEditPrev.system, [
  [
    `- Length. Stay close to the original word count.`,
    `- Length. Stay close to the original word count. Cutting a line that only restates, announces or lands a slogan is the exception: the piece gets shorter by that line.`,
  ],
  [
    `- Before you call a text clean, read its last line on its own. A closing line that would fit on a poster or a quote card is rewritten as the plain point.`,
    `- Before you call a text clean, read its last line on its own. A closing line that would fit on a poster or a quote card is rewritten as the plain point.\n` +
      `- A slogan lands after the point instead of making one. "You see every number yourself. No black box to trust." becomes "You see every number yourself."\n` +
      `- A closer that says the hook again is cut, and its hedge with it. In a piece that opens on paying a bookkeeper to fix the books every April, "Keep paying for April fixes and you could be paying for problems the report might have caught." is cut: the call to action follows the proof.\n` +
      `- A sentence that says the hook's point again in new words, with no new fact ("The books get fixed because the deadline came, not because anyone read them."), is cut.\n` +
      `- A line that points at something the copy no longer says ("Answering both takes the research the report skips." after the two questions are gone) is rewritten to stand on its own, or cut.\n` +
      `- A phrase the piece uses three or more times keeps its first use; the later ones are cut or said another way.\n` +
      `- Read the whole piece once more as one reader: every tell above that is still there gets its edit, even when the checker found nothing.`,
  ],
  [
    `- To delete a windup that carries nothing ("Here's the kicker:"), give "after" as an empty string.`,
    `- To delete a windup that carries nothing ("Here's the kicker:"), give "after" as an empty string.\n` +
      `- To cut a whole sentence that only restates, announces or lands a slogan, copy it whole as "before", its ledger tags included, and give "after" as an empty string. A sentence that carries a number, a name, a date, a quote or a link is never cut; rewrite it instead.\n` +
      `- When the request says the sentences run close to one length, break one or two long sentences in two and let one run long; never add words to do it.`,
  ],
]);

export const tellEditPrompt: PromptModule<TellEditArgs> = { ...tellEditPrev, version: 3, system: SYSTEM };

export default tellEditPrompt;
