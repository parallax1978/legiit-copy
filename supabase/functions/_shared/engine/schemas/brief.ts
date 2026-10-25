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
  suggested_rewrite: z.string().nullable().default(null),
});

/*
 * Ledger rows are the bulk of intake's output, and the intake schema is too large for native structured
 * outputs (see llm.ts), so the model writes prompt-described JSON. Every field that can be empty carries a
 * default: the model omits those keys instead of spelling out null for each, which roughly halves the size
 * of a row, and parsing fills them back in so every consumer sees the complete shape.
 */
const nstr = () => z.string().nullable().default(null);
const nnum = () => z.number().nullable().default(null);
const nbool = () => z.boolean().default(false);

export const ClaimRowInput = z.object({
  claim_text: z.string(),
  claim_type: ClaimType,
  role: z.enum(["promise", "mechanism", "proof", "offer_term", "credential", "story", "feature", "other"]),
  evidence_grade: EvidenceGrade.nullable().default(null),
  evidence: z
    .object({
      source_ref: nstr(),
      quote: nstr(),
      endpoint: nstr(),
      population: nstr(),
      dose: nstr(),
      duration: nstr(),
      effect_size: nstr(),
    })
    .prefault({}),
  precision: nstr().describe("the exact figure as the evidence states it"),
  typical_result: nstr(),
  earnings_context: z
    .object({ dates: nstr(), cohort_size: nstr(), percent_achieving: nstr(), time_and_effort: nstr(), expenses: nstr() })
    .nullable()
    .default(null),
  material_connection: nbool(),
  guarantee_terms: z.object({ text: z.string(), days: nnum(), conditions: nstr(), approver: nstr() }).nullable().default(null),
  former_price: z.object({ amount: z.string(), basis: nstr() }).nullable().default(null),
  scarcity: z.object({ number: nstr(), enforced: nbool() }).nullable().default(null),
  deadline: z.object({ date_or_rule: z.string(), mechanism: nstr() }).nullable().default(null),
  trial_terms: z.object({ text: z.string() }).nullable().default(null),
  story_claim: nbool(),
  establishment_signal: nbool(),
  status: z.enum(["verified", "unverified", "flagged"]),
  flag: ClaimFlag.nullable().default(null),
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

/** Intake runs as two calls: the brief, config and questions first; then the ledger with the whole output budget to itself. */
export const IntakeBriefOutput = IntakeOutput.omit({ claims: true });
export type IntakeBriefOutput = z.infer<typeof IntakeBriefOutput>;
export const IntakeLedgerOutput = z.object({ claims: z.array(ClaimRowInput) });
export type IntakeLedgerOutput = z.infer<typeof IntakeLedgerOutput>;
