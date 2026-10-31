/**
 * Cold read prompt, version 4: version 3's messages. The reader also reports the sentences he had to read twice for
 * the order of their words or the way they were built (not a term he did not know), each with how he would say it
 * out loud; the revision rewrites those as spoken. The owner's first usable post had three such sentences: right
 * feeling, words in an order nobody says.
 */
import { coldReadPrompt as coldReadPrev, type ColdReadArgs } from "./cold_read.v3.ts";
import { amend, type PromptModule } from "./types.ts";

export type { ColdReadArgs };

const SYSTEM = amend(coldReadPrev.system, [
  [
    `- stumbled: every word or phrase you had to stop and decode as someone who does not work in this trade (a number's name, a tool's term, a label, an abbreviation), quoted exactly; empty when there was none.`,
    `- stumbled: every word or phrase you had to stop and decode as someone who does not work in this trade (a number's name, a tool's term, a label, an abbreviation), quoted exactly; empty when there was none.
- reread: up to five sentences you had to read twice to get the meaning because of the order of the words or the way the sentence is built (a question whose verb comes late, a clause piled in front, a pronoun you could not place, a sentence clipped so short the sense went with it), never because of a term you did not know: each as {"line": the sentence quoted exactly, "say_it": how you would say the same thing out loud, in one plain sentence, in the order a person speaks (who, does, what)}; empty when every sentence read once.`,
  ],
]);

/** Version 3's user message with reread in the return shape: the old shape occurs once and is replaced. */
export function rereadShape(user: string): string {
  const old = `"promise_one_sentence":"",`;
  const n = user.split(old).length - 1;
  if (n > 1) throw new Error(`cold read v4: the return shape occurs ${n} times`);
  return n === 1 ? user.replace(old, () => `"promise_one_sentence":"","felt":"","stumbled":[],"reread":[{"line":"","say_it":""}],`) : user;
}

export const coldReadPrompt: PromptModule<ColdReadArgs> = { ...coldReadPrev, version: 4, system: SYSTEM, user: (ctx, args) => rereadShape(coldReadPrev.user(ctx, args)) };
