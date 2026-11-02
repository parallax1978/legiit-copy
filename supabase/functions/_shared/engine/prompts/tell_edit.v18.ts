/**
 * Tell edit prompt, version 18: version 17's messages with the cadence note written toward the shape of this one
 * (docs/04 Section 13). When the piece runs flat, the editor is given the counts the piece was drawn to (how many
 * sentences of four words or fewer, how many past twenty-five) instead of "break one or two long sentences in two",
 * which evened pieces out further.
 */
import { tellEditPrompt as prev } from "./tell_edit.v17.ts";
import type { PromptModule } from "./types.ts";

export * from "./tell_edit.v17.ts";

type PrevArgs = Parameters<typeof prev.user>[1];
export type TellEditArgs = PrevArgs & {
  /** the shape block of the material (draft/shape.ts), read when the cadence note is given */
  shape?: string | null;
};

const CADENCE_V11 = `Break one or two long sentences in the main points in two and let one run long; leave the opening's first two lines as they are, never make a clause that says what something cost or how it ended a sentence of its own, and never add words to do it.`;
const CADENCE_V18 = `Cut a sentence to its bone where he would say the short thing, and let one run on where the thought does, toward the counts in THE SHAPE OF THIS ONE below; leave the opening's first two lines as they are, never make a clause that says what something cost or how it ended a sentence of its own, and never add words to do it.`;

/** Version 17's user message with the cadence note of version 18 and the shape block under it, when the piece runs flat. */
export function shapeNote(user: string, shape: string | null | undefined): string {
  const n = user.split(CADENCE_V11).length - 1;
  if (n > 1) throw new Error(`tell_edit v18: the cadence note occurs ${n} times`);
  if (!n) return user;
  return user.replace(CADENCE_V11, () => `${CADENCE_V18}${shape ? `\n${shape}` : ""}`);
}

export const tellEditPrompt: PromptModule<TellEditArgs> = { ...prev, version: 18, user: (ctx, args) => shapeNote(prev.user(ctx, args), args.shape) };
