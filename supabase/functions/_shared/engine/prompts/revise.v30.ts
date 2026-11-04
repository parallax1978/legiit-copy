/**
 * Revise prompt, version 30: version 29's messages, the piece's job in the user's words in the user message, and one
 * rule: what the user asked the piece to stress is kept through every note (docs/04 Section 6). A note that would cut
 * it is applied as a rewording in place.
 */
import { revisePrompt as revisePrev, type ReviseArgs as PrevArgs } from "./revise.v29.ts";
import { pieceJob } from "./editorial.v28.ts";
import type { PromptModule } from "./types.ts";

export type ReviseArgs = PrevArgs & { purpose: string | null; instructions: string | null };

export const PIECE_JOB_RULE = `What the user asked the piece to do (THE PIECE'S JOB below) is kept through every note: a thing the user asked the piece to stress (a sale, a deadline, a price, a name, a bonus) stays where it is and at full strength, and a note that would cut it, soften it or move it down is applied as a rewording in place. A claim the ledger does not support is the user's decision, not yours.`;

const SYSTEM = `${revisePrev.system}\n\n${PIECE_JOB_RULE}`;

export const revisePrompt: PromptModule<ReviseArgs> = {
  ...revisePrev,
  version: 30,
  system: SYSTEM,
  user: (ctx, args) => {
    const base = revisePrev.user(ctx, args);
    const job = pieceJob(args);
    return job ? `${base}\n\n${job}` : base;
  },
};
