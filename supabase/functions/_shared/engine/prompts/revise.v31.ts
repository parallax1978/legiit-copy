/**
 * Revise prompt, version 31: version 30's messages and one rule (docs/04 Section 5): a term of the lead offer is
 * moved, never lost. The desk now restores a block whose term would otherwise vanish from the piece.
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v30.ts";
import type { PromptModule } from "./types.ts";

export type { ReviseArgs };

export const OFFER_TERMS_RULE = `A term of the lead offer (the price, a bonus, the credits, the deadline, the guarantee) is moved, never lost: when a note cuts it from a line, say it in the block the note names, or in the offer block, before you change the quoted line. The desk restores a block whose term would otherwise vanish from the piece, and your fix with it.`;

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 31, system: `${revisePrev.system}\n\n${OFFER_TERMS_RULE}` };
