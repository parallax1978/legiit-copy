import { z } from "zod";

/**
 * Where each block of a rewrite goes on the page it rewrites: the model names page lines by quoting them and new
 * blocks by id, never by copying their text, so the copy that reaches the page is the draft's own.
 */
export const Placement = z.object({
  /** a new block takes the place of one line of the page's current copy */
  replacements: z.array(z.object({ old: z.string().min(1), new_block: z.string().min(1) })).default([]),
  /** a new block the page has no line for: inserted right after the quoted line (null: before everything) */
  additions: z.array(z.object({ after: z.string().nullable().optional(), new_block: z.string().min(1) })).default([]),
  /** lines of the current copy that stay as they are (the nav, the footer, a form's fields, a legal line) */
  keep: z.array(z.string()).default([]),
  /** lines of the current copy whose job the new copy now does elsewhere, so they come out */
  drop: z.array(z.string()).default([]),
});
export type PlacementT = z.infer<typeof Placement>;
