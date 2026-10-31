/**
 * Draft prompt, version 20: version 19's messages, and the sentences in the order a person speaks them. The owner's
 * first usable post had three sentences with the right feeling and the words in an order nobody says ("Which page
 * you wrote this year brought a client one paying customer?", "You decide alone which pages beat page one"), each
 * compressed to clear a check. The writer now reads every sentence aloud in its head: a question asked the way you
 * would ask it across a table, the verb where speech puts it, every pronoun on the last noun that fits.
 */
import { draftPrompt as draftPrev, NEVER, OUTPUT, WRITER as WRITER_V19, writerTells, type DraftArgs } from "./draft.v19.ts";
import { amend, type PromptModule } from "./types.ts";

export type { DraftArgs };
export { NEVER, OUTPUT, writerTells };

export const SPOKEN_ORDER = `Every sentence in the order a person speaks it: who, does, what; the verb where speech puts it, never held back behind a piled-up clause. A question is asked the way you would ask it across a table ("Which of the pages you wrote this year brought a client even one paying customer?", never "Which page you wrote this year brought a client one paying customer?"). "You have to decide that yourself" is how a person says it; "You decide alone" is not. Every "it", "they", "those" and "that" sits on the last noun that fits, and when it could sit on two, the noun is said again. Read each sentence aloud in your head once before you keep it; if you would say it differently out loud, write it the way you would say it.`;

export const WRITER = amend(WRITER_V19, [
  [
    `Sell at full strength: a fact you are given is said plainly,`,
    `${SPOKEN_ORDER}

Sell at full strength: a fact you are given is said plainly,`,
  ],
]);

const SYSTEM = amend(draftPrev.system, [[WRITER_V19, WRITER]]);

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 20, system: SYSTEM };
