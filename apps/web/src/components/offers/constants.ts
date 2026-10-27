import { CLAIM_TYPES, type ClaimType } from "@engine/schemas/common.ts";
import { OfferVariantKind } from "@engine/schemas/offer.ts";

export { CLAIM_TYPES };
export type { ClaimType };

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  specific_health_benefit: "Specific health benefit",
  structure_function: "Structure / function",
  establishment: "Establishment (\"clinically proven\")",
  results_testimonial: "Results testimonial",
  experience_testimonial: "Experience testimonial",
  narrative: "Narrative",
  expert_endorsement: "Expert endorsement",
  earnings: "Earnings",
  opportunity_characterization: "Opportunity characterization",
  track_record: "Track record / backtest",
  price_discount: "Price / discount",
  free: "\"Free\"",
  guarantee: "Guarantee",
  continuity_trial: "Continuity / trial",
  scarcity_urgency: "Scarcity / urgency",
  comparative: "Comparative",
  vague_superlative: "Vague superlative",
  ad_identity: "Ad identity",
  audience_language: "Audience language",
  credential: "Credential",
  feature: "Feature",
  benefit: "Benefit",
  mechanism: "Mechanism",
  statistic: "Statistic",
  other: "Other",
};

export const CLAIM_ROLES = ["promise", "mechanism", "proof", "offer_term", "credential", "story", "feature", "other"] as const;
export type ClaimRole = (typeof CLAIM_ROLES)[number];
export const CLAIM_ROLE_LABELS: Record<ClaimRole, string> = {
  promise: "Promise",
  mechanism: "Mechanism",
  proof: "Proof",
  offer_term: "Offer term",
  credential: "Credential",
  story: "Story",
  feature: "Feature",
  other: "Other",
};

export const EVIDENCE_GRADES = ["A", "B", "C", "D", "E", "F"] as const;
export type EvidenceGradeId = (typeof EVIDENCE_GRADES)[number];
export const EVIDENCE_GRADE_LABELS: Record<EvidenceGradeId, string> = {
  A: "A · RCT on the finished product at the marketed dose",
  B: "B · RCT on the ingredient, same dose and form",
  C: "C · Observational",
  D: "D · Mechanistic, in vitro, animal",
  E: "E · Anecdote, testimonial, traditional use",
  F: "F · No outside evidence of results",
};

export const CLAIM_STATUSES = ["verified", "unverified", "flagged"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const SEVERITIES = ["info", "low", "medium", "high", "fatal"] as const;

export const OFFER_STATUSES = ["draft", "extracting", "needs_review", "ready", "archived"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];
export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  draft: "Draft",
  extracting: "Extracting",
  needs_review: "Needs review",
  ready: "Ready",
  archived: "Archived",
};

export const VARIANT_KINDS = OfferVariantKind.options;
export type VariantKind = (typeof VARIANT_KINDS)[number];
export const VARIANT_KIND_LABELS: Record<VariantKind, string> = {
  hard: "Hard offer",
  bill_me: "Bill me later",
  installments: "Installments",
  free_trial: "Free trial",
  money_back: "Money back",
  charter: "Charter",
  premium_led: "Premium led",
  continuity: "Continuity",
  multi_unit: "Multi unit",
  lead_gen: "Lead generation",
};

export const PRICE_PLANS = ["one-time", "monthly", "annual", "installments", "free", "by application"] as const;
export const EDGE_TOLERANCES = ["low", "medium", "high"] as const;

export const ACCEPTED_FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
};
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const STORAGE_BUCKET = "offer-sources";

export function titleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
