/**
 * Cold read prompt, version 5: version 4's messages, and a sentence that leans on a thing the reader cannot place
 * ("the list", "that number", "those ten pages", with nothing before it saying which) is reported with the sentences
 * read twice, with how he would say it naming the thing.
 */
import { coldReadPrompt as coldReadPrev, type ColdReadArgs } from "./cold_read.v4.ts";
import { amend, type PromptModule } from "./types.ts";

export type { ColdReadArgs };
export { rereadShape } from "./cold_read.v4.ts";

const SYSTEM = amend(coldReadPrev.system, [
  [
    `a pronoun you could not place, a sentence clipped so short the sense went with it), never because of a term you did not know:`,
    `a pronoun you could not place, a sentence clipped so short the sense went with it, or a thing spoken of as if you already knew it ("the list", "your last list", "that number", "those ten pages") when nothing before it said which list, number or pages), never because of a term you did not know:`,
  ],
]);

export const coldReadPrompt: PromptModule<ColdReadArgs> = { ...coldReadPrev, version: 5, system: SYSTEM };
