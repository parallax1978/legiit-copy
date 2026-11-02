/**
 * Draft prompt, version 25: version 24's messages with the shape of this one (docs/04 Section 13). A piece's rhythm
 * (how its sentence lengths spread, how many run short or long, questions, one-line paragraphs, contractions, where
 * the product arrives, how it ends) is drawn at random for the piece from the ranges human copy lives in, fixed by
 * the generation's id, and read by the writer as counts. The writer's words no longer ask for "short sentences, with
 * one long one": a fixed rhythm was a pattern of its own, and the pieces came out evener than human copy or plain AI.
 */
import { CACHE_BREAK, amend, type PromptModule } from "./types.ts";
import { draftPrompt as draftPrev, MANNER_RULE, NEVER, OUTPUT, WRITER as WRITER_V24, writerTells, type DraftArgs } from "./draft.v24.ts";
import { shapeText } from "../draft/shape.ts";

export type { DraftArgs };
export { MANNER_RULE, NEVER, OUTPUT, writerTells };

export const WRITER = amend(WRITER_V24, [
  [
    `short sentences, with one long one where the feeling needs it, and short never means clipped:`,
    `sentence lengths as THE SHAPE OF THIS ONE in the material gives them (a run of short ones, a sentence of two or three words where he would say one, one that goes long where the thought does, in the counts the shape draws), and short never means clipped:`,
  ],
]);

const SYSTEM = amend(draftPrev.system, [[WRITER_V24, WRITER]]);

/** The items this call drafts (a sections call of a multi-item piece names them; a whole or leads call is item 0). */
export function callItems(args: DraftArgs): number[] {
  const seen = new Set<number>();
  for (const u of args.call.units) seen.add(u.item?.index ?? 0);
  return [...seen].sort((a, b) => a - b);
}

/** The shape block goes last in the stable material, before the cache break, so every call of the piece reads it from the cache. */
export function withShape(user: string, shape: string): string {
  const i = user.indexOf(CACHE_BREAK);
  if (i < 0) return `${user}\n\n${shape}`;
  return `${user.slice(0, i)}${shape}\n\n${user.slice(i)}`;
}

export const draftPrompt: PromptModule<DraftArgs> = {
  ...draftPrev,
  version: 25,
  system: SYSTEM,
  user: (ctx, args) => withShape(draftPrev.user(ctx, args), shapeText(ctx.generation.id, ctx.format, callItems(args))),
};
