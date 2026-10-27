/**
 * Offer prompt, version 6: version 5's messages, with the owner's list itself (docs/04 §7.1) in the system text. The
 * guarantee sentence, the names of bonuses and premiums and every flag rewrite reach the buyer word for word (the
 * writer repeats the guarantee verbatim), so they follow the list where they are written.
 */
import offerV5 from "./offer.v5.ts";
import type { PromptModule } from "./types.ts";
import { OWNER_TELLS } from "./standard.ts";

export * from "./offer.v5.ts";

type Args = Parameters<typeof offerV5.user>[1];

const SYSTEM = `${offerV5.system}\n\n${OWNER_TELLS}\n\nEvery word the buyer will read (the guarantee sentence, bonus and premium names, flag rewrites) follows that list: none of its tells or words, no em dash, emoji or hashtag.`;

const offerPrompt: PromptModule<Args> = { ...offerV5, version: 6, system: SYSTEM };

export default offerPrompt;
