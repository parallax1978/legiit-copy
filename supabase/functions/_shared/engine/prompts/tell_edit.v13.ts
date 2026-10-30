/**
 * Tell edit prompt, version 13: version 12's messages. The audit reads a short piece for a lesson in the reader's
 * trade and a mechanism told in more than two sentences ("lecture"), two sentences built on one frame ("frame_pair")
 * and a pair of short sentences that land a moral (a quote card); a first-person call is the speaker's conviction,
 * never a hedge and never rewritten as an instruction to the reader; the product pointed at in the lead-in before
 * the main points name it is rewritten without the product, never by naming it there. The system text carries the
 * standard as of this version (Section 8.1, where a fact comes from; the social post's Section 9 paragraph).
 */
import { tellEditPrompt as tellEditPrev, type TellEditArgs } from "./tell_edit.v12.ts";
import { amend, type PromptModule } from "./types.ts";

export type { TellEditArgs };
export { cadenceNote } from "./tell_edit.v11.ts";

const SYSTEM = amend(tellEditPrev.system, [
  [
    `"quote_card", a line built to be quoted (a maxim, a slogan, an aphorism, a "was never" reveal, a one-line paragraph that lands a general truth instead of a specific thing);`,
    `"quote_card", a line built to be quoted (a maxim, a slogan, an aphorism, a "was never" reveal, a one-line paragraph that lands a general truth instead of a specific thing, a pair of short sentences that land a moral or a verdict on the reader's way: "The writer did the job he was given. The research stopped one step early.");`,
  ],
  [
    `"tool_tour", in a short piece, a line that walks through what the product does instead of what the reader gets; "other", any other tell above, the owner's tells 18 to 21 included:`,
    `"tool_tour", in a short piece, a line that walks through what the product does instead of what the reader gets; "lecture", in a short piece, a lesson in how the reader's trade works or a mechanism told in more than two sentences (the reader is a professional: keep what the product decides or makes for him, cut the lesson); "frame_pair", two sentences built on one frame ("Whether X sits in... Whether Y sits in..."): keep one, rebuilt as one plain sentence; "other", any other tell above, the owner's tells 18 to 21 included:`,
  ],
  [
    `a wait the reader would sit through (say what the click gets him).`,
    `a wait the reader would sit through (say what the click gets him). A first-person call ("I think the research is done when...", "I'd rather", "I built it to") is the speaker's conviction (rule 8), never a hedge: it stays in the first person and is never rewritten as an instruction to the reader ("Before you build a page, check...") or as a general truth. In a social post the lead-in never names, uses or points at the product ("it", "this tool", its own terms) before the main points introduce it: such a line is rewritten as the promise with its reason or a number, never by naming the product there, and the main points' introduction sentence is never cut.`,
  ],
]);

export const tellEditPrompt: PromptModule<TellEditArgs> = { ...tellEditPrev, version: 13, system: SYSTEM };
