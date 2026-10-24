import { z } from "zod";

export const FORMAT_IDS = [
  "sales_letter",
  "landing_page_short",
  "optin",
  "upsell",
  "order_bump",
  "order_form",
  "thank_you",
  "email_single",
  "email_sequence",
  "webinar_package",
  "vsl_long",
  "vsl_short",
  "meta_ad",
  "youtube_ad",
  "tiktok_reels",
  "google_rsa",
  "advertorial",
  "organic_social",
  "product_description",
  "sms",
  "cold_email",
  "pricing_page",
  "podcast_read",
] as const;
export const FormatId = z.enum(FORMAT_IDS);
export type FormatId = z.infer<typeof FormatId>;

export const Awareness = z.enum(["most_aware", "product_aware", "solution_aware", "problem_aware", "unaware", "unknown"]);
export type Awareness = z.infer<typeof Awareness>;
export const Sophistication = z.enum(["1", "2", "3", "4", "5", "unknown"]);
export const LeadType = z.enum(["offer", "promise", "problem_solution", "secret", "proclamation", "story"]);
export type LeadType = z.infer<typeof LeadType>;
export const Severity = z.enum(["info", "low", "medium", "high", "fatal"]);
export const EvidenceGrade = z.enum(["A", "B", "C", "D", "E", "F"]);
export const Traffic = z.enum(["cold", "warm", "retargeting", "owned_list", "unknown"]);

export const CLAIM_TYPES = [
  "specific_health_benefit",
  "structure_function",
  "establishment",
  "results_testimonial",
  "experience_testimonial",
  "narrative",
  "expert_endorsement",
  "earnings",
  "opportunity_characterization",
  "track_record",
  "price_discount",
  "free",
  "guarantee",
  "continuity_trial",
  "scarcity_urgency",
  "comparative",
  "vague_superlative",
  "ad_identity",
  "audience_language",
  "credential",
  "feature",
  "benefit",
  "mechanism",
  "statistic",
  "other",
] as const;
export const ClaimType = z.enum(CLAIM_TYPES);
export type ClaimType = z.infer<typeof ClaimType>;

/** Ledger reference: the id of an offer_claims row, written inline as [[L:<id>]] in copy. */
export const LedgerRef = z.string().min(1);
export const LEDGER_TAG = /\[\[L:([0-9a-fA-F-]{8,})\]\]/g;
export const NEEDS_SOURCE_TAG = "[[NEEDS SOURCE]]";
