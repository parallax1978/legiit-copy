/**
 * Cold read prompt, version 2: version 1's messages. The pick reads each opening as a post or a letter from a named
 * person, for what it says: an opening that tells the reader what he did and what it cost him reads as an ad written
 * about him, the way the masters' readers took it (Carlton: "If you imply that you are reading his mind, he will
 * distrust you.").
 */
import { coldReadPrompt as coldReadPrev, type ColdReadArgs } from "./cold_read.v1.ts";
import { amend, type PromptModule } from "./types.ts";

export type { ColdReadArgs };

const SYSTEM = amend(coldReadPrev.system, [
  [
    `Pick the one that makes you read its second line, keeps you to its last line and leaves you wanting the paragraph after it.`,
    `Pick the one that makes you read its second line, keeps you to its last line and leaves you wanting the paragraph after it, for what it says. Read each opening as a post or a letter from a named person reaching you on an ordinary day: one that tells you what you did and then what it cost you reads as an ad written about you, and you would scroll past it; one that tells you something true you did not know, or asks you about your own work in a way you want to answer, keeps you reading.`,
  ],
]);

export const coldReadPrompt: PromptModule<ColdReadArgs> = { ...coldReadPrev, version: 2, system: SYSTEM };
