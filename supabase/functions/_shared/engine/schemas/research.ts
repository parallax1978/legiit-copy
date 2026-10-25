import { z } from "zod";
import { Awareness, EvidenceGrade, Sophistication, Traffic } from "./common.ts";

/*
 * Research runs as two model calls in two invocations: collect (web search and fetch; verbatims, findings,
 * sources) and synthesize (no tools; every other dossier section from the collected material). The Dossier is
 * the merged result and is what every later step reads. Fields that can be empty carry defaults so the model
 * can omit them (see llm.ts promptJsonSchema) and consumers still see the complete shape.
 */
const nstr = () => z.string().nullable().default(null);
const nbool = () => z.boolean().default(false);

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
  source_url: nstr(),
  source_type: z.enum(["review", "forum", "interview", "survey", "support", "sales_call", "competitor_promo", "ad_comment", "social", "other"]),
  speaker_role: nstr(),
  tags: z.array(VerbatimTag),
  desire_cluster: nstr(),
  intensity_marker: nbool(),
  duration_marker: nbool(),
  date: nstr(),
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
  url: nstr(),
  category_claimed: nstr(),
  audience: nstr(),
  headline_outcome: nstr(),
  top_claims: z.array(z.object({ claim: z.string(), proof: nstr() })),
  mechanism_named: nbool(),
  logo_swap_passes: z.boolean().describe("true when our hero copy would still read true under this competitor's logo"),
});

export const Segment = z.object({ traffic: Traffic, label: z.string(), awareness: Awareness, evidence: z.string() });

export const ProofItem = z.object({
  claim: z.string(),
  evidence_type: z.enum(["demonstration", "specific_result", "mechanism", "process_specifics", "authority", "testimonial", "case_history", "candor", "social_proof_count", "study", "guarantee"]),
  grade: EvidenceGrade,
  source: nstr(),
  quote: nstr(),
  ledger_ref: nstr(),
});

export const Source = z.object({ url: z.string(), title: nstr(), kind: nstr() });

/** A fact the synthesis will need that is not a verbatim: competitor claims, proof, refunds, first week, story events, speaker, awareness signals. */
export const Finding = z.object({
  kind: z.enum(["competitor_claim", "proof", "objection", "refund", "first_week", "story", "speaker", "awareness", "sophistication", "other"]),
  text: z.string().describe("the fact in one or two sentences, names and numbers as the page states them"),
  source_url: nstr(),
  quote: nstr().describe("the exact words from the page when a quote carries the fact"),
});
export type Finding = z.infer<typeof Finding>;

/** Phase 1 output: what the researcher brought back from the web. */
export const ResearchCollect = z.object({
  cluster_vocabulary: z.array(z.string()).describe("the 6 to 12 desire-cluster tokens fixed before tagging"),
  verbatims: z.array(Verbatim),
  findings: z.array(Finding),
  sources: z.array(Source),
});
export type ResearchCollect = z.infer<typeof ResearchCollect>;

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
  story_inventory: z.array(z.object({ event: z.string(), date: nstr(), numbers: nstr(), people: nstr(), source: nstr() })),
  speaker: z.object({ name: nstr(), role: nstr(), stake: nstr(), source: nstr().describe("the page that names them") }),
  forces: z.object({ push: z.string(), pull: z.string(), anxiety: z.string(), habit: z.string(), dominant: z.enum(["push", "pull", "anxiety", "habit"]) }),
  first_week_experience: nstr(),
  refund_history: nstr(),
  unsourced_hypotheses: z.array(z.string()).describe("anything not backed by a verbatim; outranked by any single verbatim"),
  sources: z.array(Source),
});
export type Dossier = z.infer<typeof Dossier>;

/** Phase 2 output: every dossier section the collected material supports, minus what phase 1 already holds. */
export const ResearchSynthesis = Dossier.omit({ verbatims: true, sources: true });
export type ResearchSynthesis = z.infer<typeof ResearchSynthesis>;
