/**
 * Draft prompt, version 28: version 27's messages, and the writer's words on the sentence that does not follow
 * (docs/04 rule 40). "The page goes up. Nobody read the ten pages it had to beat." made no sense: after the action the
 * reader waits for what happened and gets a cause instead, with the outcome (it never ranks, nobody sees it) left
 * out, so "Or worse, the page ranks" compared against nothing. On top of that "goes up" could mean put online or up
 * the rankings, and "nobody" hid that the one who never read them is the reader. Each sentence follows from the one
 * before; a two-way failure is told whole, what happens and then why; a sentence is said one way, with its doer.
 */
import { amend, type PromptModule } from "./types.ts";
import { draftPrompt as draftPrev, MANNER_RULE, NEVER, OUTPUT, PROMISE_PLACE, WRITER as WRITER_V27, withShape, callItems, writerTells, type DraftArgs } from "./draft.v27.ts";

export type { DraftArgs };
export { MANNER_RULE, NEVER, OUTPUT, PROMISE_PLACE, callItems, withShape, writerTells };

export const ONE_WAY = `each sentence follows from the one before it: after an action ("the page goes up") the reader waits for what happened, and gets it, never a cause in its place ("Nobody read the ten pages it had to beat" says why and skips what happened: the page never ranks, nobody sees it); where the old way fails two ways, both are said whole, what happens first and then why, and each can be taken one way only with its doer in it ("You make the page, and either nobody reads it because it never ranks, or plenty read it and nobody buys, because the people typing that search were never shopping"); never "the page goes up" when it could mean put online or up the rankings, never "nobody" for the reader himself (he is the one who never opened the ten pages already on page one);`

export const WRITER = amend(WRITER_V27, [
  [
    `never a riddle compressed to hit the grade ("The list picks the page" is a riddle; "You pick your pages off that list" is a sentence); a noun he can picture;`,
    `never a riddle compressed to hit the grade ("The list picks the page" is a riddle; "You pick your pages off that list" is a sentence); ${ONE_WAY} a noun he can picture;`,
  ],
]);

const SYSTEM = amend(draftPrev.system, [[WRITER_V27, WRITER]]);

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 28, system: SYSTEM };
