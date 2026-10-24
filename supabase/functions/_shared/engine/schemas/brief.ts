import { z } from "zod";
import { ClaimType, EvidenceGrade, Severity } from "./common.ts";

export const Price = z.object({
  text: z.string().describe("price exactly as stated"),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  plan: z.string().nullable().describe("one-time | monthly | annual | installments | free | by application"),
});

export const OfferBrief = z.object({
  product_name: z.string(),
  one_line: z.string().describe("what it is, for whom, in one sentence, no adjectives"),
  deliverables: z.array(z.string()),
  price: Price,
  terms: z.string().nullable(),
  guarantee: z.object({ text: z.string().nullable(), type: z.string().nullable(), days: z.number().nullable(), denominated: z.boolean() }),
  audience: z.object({ who: z.string(), situation: z.string().nullable(), verbatim_sources: z.array(z.string()) }),
  positioning: z.string().nullable(),
  proof_available: z.array(z.object({ claim: z.string(), evidence: z.string(), source: z.string().nullable() })),
  competitors: z.array(z.string()),
  urls: z.array(z.string()),
  unknowns: z.array(z.string()).describe("facts the sources do not settle"),
});
export type OfferBrief = z.infer<typeof OfferBrief>;

export const ClaimFlag = z.object({
  rule: z.string().describe("the rule or regulation, cited"),
  severity: Severity,
  issue: z.string(),
  suggested_rewrite: z.string().nullable(),
});

export const ClaimRowInput = z.object({
  claim_text: z.string(),
  claim_type: ClaimType,
  role: z.enum(["promise", "mechanism", "proof", "offer_term", "credential", "story", "feature", "other"]),
  evidence_grade: EvidenceGrade.nullable(),
  evidence: z.object({
    source_ref: z.string().nullable(),
    quote: z.string().nullable(),
    endpoint: z.string().nullable(),
    population: z.string().nullable(),
    dose: z.string().nullable(),
    duration: z.string().nullable(),
    effect_size: z.string().nullable(),
  }),
  precision: z.string().nullable().describe("the exact figure as the evidence states it"),
  typical_result: z.string().nullable(),
  earnings_context: z
    .object({ dates: z.string().nullable(), cohort_size: z.string().nullable(), percent_achieving: z.string().nullable(), time_and_effort: z.string().nullable(), expenses: z.string().nullable() })
    .nullable(),
  material_connection: z.boolean(),
  guarantee_terms: z.object({ text: z.string(), days: z.number().nullable(), conditions: z.string().nullable(), approver: z.string().nullable() }).nullable(),
  former_price: z.object({ amount: z.string(), basis: z.string().nullable() }).nullable(),
  scarcity: z.object({ number: z.string().nullable(), enforced: z.boolean() }).nullable(),
  deadline: z.object({ date_or_rule: z.string(), mechanism: z.string().nullable() }).nullable(),
  trial_terms: z.object({ text: z.string() }).nullable(),
  story_claim: z.boolean(),
  establishment_signal: z.boolean(),
  status: z.enum(["verified", "unverified", "flagged"]),
  flag: ClaimFlag.nullable(),
});
export type ClaimRowInput = z.infer<typeof ClaimRowInput>;

export const OfferConfigInput = z.object({
  vertical: z.string().nullable(),
  business_opportunity: z.boolean(),
  notice_recipient: z.boolean(),
  humor_policy: z.object({ allowed: z.boolean(), notes: z.string().nullable() }),
  greeting: z.string().nullable(),
  edge_tolerance: z.enum(["low", "medium", "high"]).nullable(),
  refund_window_days: z.number().nullable(),
  first_week_experience: z.string().nullable(),
});

export const Question = z.object({ question: z.string(), why: z.string(), blocking: z.boolean() });

export const IntakeOutput = z.object({
  brief: OfferBrief,
  claims: z.array(ClaimRowInput),
  config: OfferConfigInput,
  questions: z.array(Question),
});
export type IntakeOutput = z.infer<typeof IntakeOutput>;
