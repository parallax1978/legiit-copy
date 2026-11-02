/**
 * Cold read prompt, version 7: version 6's messages, and a sentence that told the reader nothing he did not already
 * know ("Every keyword a client wants to rank for already has ten pages on page one"), there to set up the next
 * sentence, is reported with the sentences read twice, with the point it was reaching for said with the thing in it.
 */
import { coldReadPrompt as coldReadPrev, type ColdReadArgs } from "./cold_read.v6.ts";
import { amend, type PromptModule } from "./types.ts";

export type { ColdReadArgs };
export { rereadShape } from "./cold_read.v4.ts";

const SYSTEM = amend(coldReadPrev.system, [
  [
    `or a sentence you could take two ways ("The page goes up": put online, or up the rankings?); when you had to pick a meaning or supply a missing step, you read it twice, even if you guessed right)`,
    `a sentence you could take two ways ("The page goes up": put online, or up the rankings?), or a sentence that told you nothing you did not already know and stood there only to set up the next one ("Every keyword a client wants to rank for already has ten pages on page one": every search does, so you read it twice looking for the point); when you had to pick a meaning, supply a missing step or hunt for the point, you read it twice, even if you guessed right)`,
  ],
  [
    `"You put the page up, it never ranks, and nobody sees it, because nobody read the ten pages on page one it had to beat")}`,
    `"You put the page up, it never ranks, and nobody sees it, because nobody read the ten pages on page one it had to beat"; for a sentence that told you nothing, the point it was reaching for with the thing named in it: "Your page has to beat the ten pages already on page one for that search, and you never opened them")}`,
  ],
]);

export const coldReadPrompt: PromptModule<ColdReadArgs> = { ...coldReadPrev, version: 7, system: SYSTEM };
