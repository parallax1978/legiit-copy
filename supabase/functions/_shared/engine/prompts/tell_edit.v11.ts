/**
 * Tell edit prompt, version 11: version 10's messages, with the reader's pain said as his situation and never told
 * back to him as his own history or closed on a verdict; an opening in one of the four rejected shapes rewritten with
 * one of the masters' moves; a talking tool rewritten with a person as the subject; the aphorism example from another
 * trade; and the cadence rule and note leave the opening's first two lines alone and never split a clause about what
 * something cost into a sentence of its own. The system text carries the owner's list as of this version (Section 7.1
 * tells 14 to 17).
 */
import { tellEditPrompt as tellEditPrev, type TellEditArgs } from "./tell_edit.v10.ts";
import { amend, type PromptModule } from "./types.ts";

export type { TellEditArgs };

const SYSTEM = amend(tellEditPrev.system, [
  [
    `- The reader's pain in a survey's wording or hedged ("the pages you build have often brought poor results for the price") is said as one concrete thing that happened to the reader, plainly, at full strength, keeping its substance: "The page you paid a writer for never earned back what it cost." Keep every number, name and tag; add no fact and no actor the copy did not name.`,
    `- The reader's pain in a survey's wording or hedged ("the books have often been a mess for the price") is said plainly, at full strength, keeping its substance, as the reader's situation, never told back to him as his own history and never closed on a verdict (the pattern, from another trade, never these words: not "You paid a bookkeeper to fix the books every April, and nothing changed." but, in the opening, a question he answers about his own work, "Could you say today what your books showed in March?", a fact true of his whole trade, "Books that get fixed in April have twelve months of mistakes in them.", or the speaker's own fact, "I close every client's books by the fifth of each month."; after the opening, one concrete thing said plainly). Keep every number, name and tag; add no fact and no actor the copy did not name.
- An opening that tells the reader his own history or habit ("You paid...", "You've paid...", "Your X told you..."), makes a tool, score or list the one that speaks, ends line one on a verdict ("It never...", ", and it never..."), or carries a tagline promise with nothing behind it (Section 7.1, tells 14 to 17) is rewritten, keeping its facts and tags, as one of the moves in Section 3: a question the reader answers about his own work, an If, a fact true of everyone in his trade, a test he runs now, or the speaker's own fact in the first person, with a person as the subject; the promise is said once, with its carrier beside it. An opening is rephrased, never cut whole (the pattern, from another trade, never these words: "You paid for a new water heater and it died inside a year." becomes "I replaced the same water heater on Elm Street twice this March.").`,
  ],
  [
    `- A tool, score or number that thinks, sees, hides or lies is said plainly. "The score has never seen your site." becomes "The score does not look at your site."`,
    `- A tool, score, list or number that thinks, sees, says, rates, hides, hands, leaves or lies is rewritten with a person as the subject, or as a plain fact about the thing: a person reads, picks, pays, checks and decides (the pattern, from another trade, never these words: "The dashboard said the tires were fine." becomes "I check every tire with a tread gauge at every oil change.").`,
  ],
  [
    `"A keyword list is raw material." becomes "A keyword list tells you what people type, not what they buy."`,
    `"A menu is a promise." becomes "The kitchen cooks every dish to order."`,
  ],
  [
    `- When the request says the sentences run close to one length, break one or two long sentences in two and let one run long; never add words to do it.`,
    `- When the request says the sentences run close to one length, break one or two long sentences in the main points in two and let one run long; never break the opening's first two lines, never make a clause that says what something cost or how it ended a sentence of its own, and never add words to do it.`,
  ],
]);

const CADENCE_V1 = `Break one or two long sentences in two and let one run long; never add words to do it.`;
const CADENCE = `Break one or two long sentences in the main points in two and let one run long; leave the opening's first two lines as they are, never make a clause that says what something cost or how it ended a sentence of its own, and never add words to do it.`;

/** Version 10's user message with version 11's cadence note, when the request carries one. */
export function cadenceNote(user: string): string {
  const n = user.split(CADENCE_V1).length - 1;
  if (n > 1) throw new Error(`tell_edit v11: the cadence note occurs ${n} times`);
  return n ? user.replace(CADENCE_V1, () => CADENCE) : user;
}

export const tellEditPrompt: PromptModule<TellEditArgs> = { ...tellEditPrev, version: 11, system: SYSTEM, user: (ctx, args) => cadenceNote(tellEditPrev.user(ctx, args)) };
