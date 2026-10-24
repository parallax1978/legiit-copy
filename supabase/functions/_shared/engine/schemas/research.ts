import { z } from "zod";
import { Awareness, EvidenceGrade, Sophistication, Traffic } from "./common.ts";

export const VerbatimTag = z.enum([
  "desire",
  "frustration",
  "prior_solution",
  "belief",
  "objection",
  "habit",
  "trigger",
  "criteria",
  "proof_need",
  "sticky_language",
  "unexpected_benefit",
  "competitor_mention",
]);

export const Verbatim = z.object({
  id: z.string(),
  text: z.string().describe("exact wording, quotation marks kept; never paraphrased"),
  source_url: z.string().nullable(),
  source_type: z.enum(["review", "forum", "interview", "survey", "support", "sales_call", "competitor_promo", "ad_comment", "social", "other"]),
  speaker_role: z.string().nullable(),
  tags: z.array(VerbatimTag),
  desire_cluster: z.string().nullable(),
  intensity_marker: z.boolean(),
  duration_marker: z.boolean(),
  date: z.string().nullable(),
});
export type Verbatim = z.infer<typeof Verbatim>;

export const Theme = z.object({
  name: z.string(),
  tag: VerbatimTag,
  count: z.number(),
  verbatim_ids: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]).describe("low when fewer than three exact quotes"),
});

export const Competitor = z.object({
  name: z.string(),
  url: z.string().nullable(),
  category_claimed: z.string().nullable(),
  audience: z.string().nullable(),
  headline_outcome: z.string().nullable(),
  top_claims: z.array(z.object({ claim: z.string(), proof: z.string().nullable() })),
  mechanism_named: z.boolean(),
  logo_swap_passes: z.boolean().describe("true when our hero copy would still read true under this competitor's logo"),
});

export const Segment = z.object({ traffic: Traffic, label: z.string(), awareness: Awareness, evidence: z.string() });

export const ProofItem = z.object({
  claim: z.string(),
  evidence_type: z.enum(["demonstration", "specific_result", "mechanism", "process_specifics", "authority", "testimonial", "case_history", "candor", "social_proof_count", "study", "guarantee"]),
  grade: EvidenceGrade,
  source: z.string().nullable(),
  quote: z.string().nullable(),
  ledger_ref: z.string().nullable(),
});

export const Dossier = z.object({
  verbatims: z.array(Verbatim),
  themes: z.array(Theme),
  competitor_table: z.array(Competitor),
  logo_swap_result: z.string(),
  awareness_by_segment: z.array(Segment),
  sophistication: z.object({ stage: Sophistication, evidence: z.string() }),
  proof_inventory: z.array(ProofItem),
  objection_map: z.array(z.object({ text: z.string(), verbatim_ids: z.array(z.string()) })),
  resident_emotion: z.object({ emotion: z.string(), evidence: z.string(), verbatim_ids: z.array(z.string()) }),
  story_inventory: z.array(z.object({ event: z.string(), date: z.string().nullable(), numbers: z.string().nullable(), people: z.string().nullable(), source: z.string().nullable() })),
  speaker: z.object({ name: z.string().nullable(), role: z.string().nullable(), stake: z.string().nullable() }),
  forces: z.object({ push: z.string(), pull: z.string(), anxiety: z.string(), habit: z.string(), dominant: z.enum(["push", "pull", "anxiety", "habit"]) }),
  first_week_experience: z.string().nullable(),
  refund_history: z.string().nullable(),
  unsourced_hypotheses: z.array(z.string()).describe("anything not backed by a verbatim; outranked by any single verbatim"),
  sources: z.array(z.object({ url: z.string(), title: z.string().nullable(), kind: z.string().nullable() })),
});
export type Dossier = z.infer<typeof Dossier>;
