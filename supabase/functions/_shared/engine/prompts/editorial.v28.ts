/**
 * Editorial prompt, version 28: version 27's messages, and the piece's job in the user's words in the user message
 * (docs/04 Section 6: binding; a note sharpens it, never removes it). A Black Friday page lost its "not the normal
 * price" crosshead to a secondary note because the chief never saw what the user had asked for.
 */
import { editorialPrompt as prev } from "./editorial.v27.ts";
import type { PromptModule } from "./types.ts";

export * from "./editorial.v27.ts";

type PrevArgs = Parameters<typeof prev.user>[1];
export type EditorialArgs = PrevArgs & {
  /** what the user said the piece has to do, verbatim */
  purpose: string | null;
  /** the user's further instructions, verbatim */
  instructions: string | null;
};

/** The block appended to the material: what the user asked, as the review's binding brief. */
export function pieceJob(args: { purpose: string | null; instructions: string | null }): string {
  const lines = [args.purpose?.trim() ? `Purpose: ${args.purpose.trim()}` : "", args.instructions?.trim() ? `Instructions: ${args.instructions.trim()}` : ""].filter(Boolean);
  if (!lines.length) return "";
  return `THE PIECE'S JOB, IN THE USER'S WORDS (binding: a note may sharpen how and where it is said, never cut it, soften it or move it under the fold; a claim the ledger does not support is flagged, not removed):\n${lines.join("\n")}`;
}

export const editorialPrompt: PromptModule<EditorialArgs> = {
  ...prev,
  version: 28,
  user: (ctx, args) => {
    const base = prev.user(ctx, args);
    const job = pieceJob(args);
    return job ? `${base}\n\n${job}` : base;
  },
};
