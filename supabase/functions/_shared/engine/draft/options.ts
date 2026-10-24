/**
 * Per-generation options (generations.options jsonb). Everything is optional; unknown keys pass through
 * so the web app can add UI-only options without touching the engine.
 */
import { z } from "zod";
import { Awareness, Traffic } from "../schemas/common.ts";

export const GenerationOptions = z.looseObject({
  /** Which traffic segment of the dossier this piece is written for. */
  traffic: Traffic.optional(),
  /** Segment label in dossier.awareness_by_segment, when traffic alone is ambiguous. */
  segment: z.string().optional(),
  /** User override of the diagnosed awareness state (counts as "marked known"). */
  awareness: Awareness.optional(),
  /** Skeptical readers get an indirect lead even when aware (standard §3). */
  skeptical: z.boolean().optional(),
  /** The control the editorial reviewer predicts against; absent → the strongest competitor promotion in the dossier. */
  control_text: z.string().optional(),
  /** Item count for multi-item formats (sequences, ad sets); clamped to the spec's min/max. */
  item_count: z.number().int().positive().optional(),
  /** User chose to keep the offer as-is (no offer construction step). */
  skip_offer: z.boolean().optional(),
  purpose: z.string().optional(),
});
export type GenerationOptions = z.infer<typeof GenerationOptions>;

export function parseOptions(raw: unknown): GenerationOptions {
  const r = GenerationOptions.safeParse(raw ?? {});
  return r.success ? r.data : {};
}
