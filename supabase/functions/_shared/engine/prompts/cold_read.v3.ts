/**
 * Cold read prompt, version 3: version 2's messages. The reader also reports what he felt at line one and at the
 * turn (or "nothing") and the words he stopped at as someone outside the trade, and picks the lead he felt something
 * at; a line he had to decode pushes him away.
 */
import { coldReadPrompt as coldReadPrev, type ColdReadArgs } from "./cold_read.v2.ts";
import { amend, type PromptModule } from "./types.ts";

export type { ColdReadArgs };

const SYSTEM = amend(coldReadPrev.system, [
  [
    `- promise_one_sentence: the promise the piece makes you, in one plain sentence, your words.`,
    `- promise_one_sentence: the promise the piece makes you, in one plain sentence, your words.
- felt: what you felt at the first line and at the point where the product came in (a pang, a hope, a laugh of recognition, dread, boredom), in one sentence; "nothing" when you felt nothing.
- stumbled: every word or phrase you had to stop and decode as someone who does not work in this trade (a number's name, a tool's term, a label, an abbreviation), quoted exactly; empty when there was none.`,
  ],
  [
    `one that tells you something true you did not know, or asks you about your own work in a way you want to answer, keeps you reading.`,
    `one that tells you something true you did not know, or asks you about your own work in a way you want to answer, keeps you reading. Pick the one you felt something at; a line you had to decode (a term from a tool, a number's name) pushes you away.`,
  ],
]);

export const coldReadPrompt: PromptModule<ColdReadArgs> = { ...coldReadPrev, version: 3, system: SYSTEM };
