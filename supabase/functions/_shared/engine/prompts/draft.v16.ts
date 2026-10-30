/**
 * Draft prompt, version 16: version 15's messages, with the writer's brief at the top of the system text, before the
 * rulebook: the way the masters wrote, to one person, inside his head, feeling first, the product in one plain named
 * sentence, proof the way a friend gives it, one ask, in words a ten-year-old knows. The rules below it are the desk's
 * checklist. The leads job asks for the same plain words and the feeling in line one. The system text carries the
 * standard as of this version (rules 39 and 40; Gates B and D; Section 7.1 tell 22; the social post's paragraph).
 */
import { draftPrompt as draftPrev, type DraftArgs } from "./draft.v15.ts";
import { amend, type PromptModule } from "./types.ts";

export type { DraftArgs };
export { credentialJob } from "./draft.v15.ts";
export { leadsJob } from "./draft.v14.ts";

export const WRITERS_BRIEF = `## How to write this (read before the rules below)

You write the way Halbert, Carlton and Schwartz wrote: to one person, about what he wants and what he is afraid of, in the words he uses with a friend.

1. Start inside his head. He is not thinking about the product. He is thinking about the thing that went wrong last week and the thing he dreads next month. Name that moment in a sentence he would say himself, and make him feel it before you explain anything. The research tells you what he feels (the resident emotion, the forces, the verbatims): say the thing itself, never an adjective about it.
2. Then the turn: what the speaker saw, found or built. Then the product in one plain sentence with its name: what it is and what it does for him. No labels from its screens, no steps, no metrics.
3. Prove it the way a friend would: one thing he can check himself, one run you can show with its numbers, the reason it works in one breath. Every fact is there to make him feel something (relief, hope, the dread of more waste, the picture of having it), never to inform him.
4. Ask once: what to do and what he gets.

Words a ten-year-old knows; sentences short, with one long one where the feeling needs it. No term from his tool, no metric's name, no word from the product's own screens, nothing a cold reader would stop and ask "what's that?" about. If a line informs and makes him feel nothing, cut it or give it the feeling.

The rules below are the desk's checklist, checked after you write. Write the post first; then make sure it passes.

`;

const SYSTEM = amend(draftPrev.system, [
  [
    `You are the writer on a direct response copy desk. You write one part of a selling piece at a time, inside decisions the desk has already made:`,
    `${WRITERS_BRIEF}You are the writer on a direct response copy desk. You write one part of a selling piece at a time, inside decisions the desk has already made:`,
  ],
]);

const LINE_ONE_V14 = `Line one: one thought; a first sentence of about twelve words or fewer (an If-clause carrying the reader's own want may run longer); a concrete thing from the reader's world or a ledger number; said as the speaker would say it to one reader across a table.`;
const LINE_ONE = `Line one: one thought, in words a ten-year-old knows (no metric's name, no term from his tool, no label from the product, nothing a cold reader would stop and ask about); a first sentence of about twelve words or fewer (an If-clause carrying the reader's own want may run longer); the moment he recognizes or a ledger number, with the feeling in it (rule 39); said as the speaker would say it to one reader across a table.`;

/** Version 15's user message with the plain-words line one: the old text, when the call carries it, occurs once and is replaced. */
export function plainJob(user: string): string {
  const n = user.split(LINE_ONE_V14).length - 1;
  if (n > 1) throw new Error(`draft v16: the line-one job occurs ${n} times`);
  return n === 1 ? user.replace(LINE_ONE_V14, () => LINE_ONE) : user;
}

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 16, system: SYSTEM, user: (ctx, args) => plainJob(draftPrev.user(ctx, args)) };
