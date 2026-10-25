import { z } from "zod";

export const Candidate = z.object({
  id: z.string(),
  core_desire: z.string(),
  cluster: z.string(),
  k: z.number().describe("verbatims in the cluster"),
  promise: z.string(),
  mechanism: z.string(),
  big_idea: z.string().describe("eight words or fewer where possible"),
  lead_verbatim_id: z.string().nullable(),
  belief_to_displace: z.string(),
  proof_asset: z.string().describe("the ledger row or proof item that carries the promise"),
  proof_ledger_refs: z.array(z.string()),
  search_origin: z.enum(["unused_fact", "opposite_idea", "mechanism_in_process", "verbatim", "other"]),
  serves_purpose: z.boolean().default(false).describe("true when the promise is what the PURPOSE in <piece> asks this piece to achieve; false when no purpose was given"),
});

export const Gates = z.object({
  desire: z.enum(["pass", "fail", "provisional"]),
  desire_magnitude: z.number().min(0).max(9),
  proof: z.enum(["pass", "fail"]),
  c9: z.number().min(0).max(3),
});

export const CRITERIA = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13", "C14"] as const;
export const WEIGHTS: Record<(typeof CRITERIA)[number], number> = { C1: 2, C2: 2, C3: 2, C4: 1, C5: 1, C6: 1, C7: 1, C8: 1, C9: 2, C10: 1, C11: 1, C12: 2, C13: 1, C14: 1 };
export const MAX_WEIGHTED = Object.values(WEIGHTS).reduce((a, w) => a + 3 * w, 0); // 57

export const Scores = z.object(Object.fromEntries(CRITERIA.map((c) => [c, z.number().min(0).max(3)])) as Record<(typeof CRITERIA)[number], z.ZodNumber>);

export const ScoredCandidate = Candidate.extend({ gates: Gates, scores: Scores, weighted_total: z.number(), rationale: z.string() });

export const ArgumentOutput = z.object({
  candidates: z.array(ScoredCandidate).describe("all candidates, scored; gated-out ones keep their gate result"),
  finalist_ids: z.array(z.string()).max(3),
  winner_id: z.string(),
  thesis: z.string().describe('"This draft exists to prove that [mechanism] is a different and superior way to get [promise] for [reader], and the proof is [carrier]."'),
  losers_kept_ids: z.array(z.string()).max(2),
  tie_break_note: z.string().nullable(),
});
export type ArgumentOutput = z.infer<typeof ArgumentOutput>;

export function weightedTotal(scores: z.infer<typeof Scores>): number {
  return CRITERIA.reduce((sum, c) => sum + WEIGHTS[c] * scores[c], 0);
}
