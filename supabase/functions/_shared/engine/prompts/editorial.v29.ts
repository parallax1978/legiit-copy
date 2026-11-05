/**
 * Editorial prompt, version 29: version 28's messages, and one rule for a note that moves a thing (docs/04 Section 5:
 * every asset states the lead offer). A Black Friday page lost its 100,000-credit bonus for good when a Gate B note
 * said "cut the credits from the opening, keep the bonus lower" and quoted only the line it left.
 */
import { editorialPrompt as prev } from "./editorial.v28.ts";
import type { PromptModule } from "./types.ts";

export * from "./editorial.v28.ts";

type Args = Parameters<typeof prev.user>[1];

export const MOVE_NOT_CUT = `A note that moves a thing (cut it from this line, say it lower) quotes both lines: the line it leaves and the line it joins, so the reviser has somewhere to put it. A term of the lead offer (the price, a bonus, the credits, the deadline, the guarantee) is never cut from the piece: every asset states the lead offer, so a note that takes a term out of the opening names the line below the product's introduction where it goes.`;

export const editorialPrompt: PromptModule<Args> = { ...prev, version: 29, system: `${prev.system}\n\n${MOVE_NOT_CUT}` };
