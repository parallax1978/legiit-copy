/**
 * Cold read prompt, version 6: version 5's messages, and a sentence that does not follow from the one before it (an
 * action, then a reason with the result left out), one a reader could take two ways ("The page goes up": put online,
 * or up the rankings?) or one whose doer is missing ("Nobody read the ten pages": no visitor, or you?) is reported
 * with the sentences read twice, with how he would say it one way, what happened before why, naming who does what.
 * The owner read one such pair and said it made no sense; the model reading cold had supplied the missing step.
 */
import { coldReadPrompt as coldReadPrev, type ColdReadArgs } from "./cold_read.v5.ts";
import { amend, type PromptModule } from "./types.ts";

export type { ColdReadArgs };
export { rereadShape } from "./cold_read.v4.ts";

const SYSTEM = amend(coldReadPrev.system, [
  [
    `when nothing before it said which list, number or pages), never because of a term you did not know:`,
    `when nothing before it said which list, number or pages), a sentence that does not follow from the one before it (after "The page goes up" you waited for what happened to the page and got "Nobody read the ten pages it had to beat", a reason with the result left out), a sentence you could take two ways ("The page goes up": put online, or up the rankings?), or a sentence whose doer is missing or hidden behind "nobody", "no one" or "it" ("Nobody read the ten pages": no visitor, or the writer himself?); when you had to pick a meaning or supply a missing step, you read it twice, even if you guessed right), never because of a term you did not know:`,
  ],
  [
    `"say_it": how you would say the same thing out loud, in one plain sentence, in the order a person speaks (who, does, what)}`,
    `"say_it": how you would say the same thing out loud, in one plain sentence that can be taken one way only and says what happened before why, in the order a person speaks (who, does, what; "You put the page up, it never ranks, and nobody sees it, because you never opened the ten pages already on page one that it has to beat")}`,
  ],
]);

export const coldReadPrompt: PromptModule<ColdReadArgs> = { ...coldReadPrev, version: 6, system: SYSTEM };
