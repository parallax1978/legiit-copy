import type { FormatSpec } from "../spec.ts";

/**
 * One ad = 15 headline assets (30 chars) and 4 description assets (90 chars). Headlines are `headline` blocks
 * in the `headlines` section; descriptions are `paragraph` blocks in `descriptions`, each with `meta.platform_field`
 * set to `description` and `meta.role` naming the asset's job.
 */
export const google_rsa: FormatSpec = {
  id: "google_rsa",
  name: "Google responsive search ad",
  family: "ad",
  description: "15 headlines of 30 characters in five shapes (3-4 keyword, 3-4 benefit with number, 2-3 proof, 2 offer or risk reversal, 2 CTA) and 4 descriptions of 90 characters, each a complete argument with a CTA. No two headlines share a shape and wording.",
  length_band_words: [80, 160],
  sections: [
    { id: "headlines", name: "15 headlines", job: "Fifteen 30-character assets Google can combine in any order: 3-4 keyword, 3-4 benefit with a number, 2-3 proof, 2 offer or risk reversal, 2 CTA", band_words: [45, 90], must: ["exactly 15", "each 30 characters or fewer", "3-4 keyword headlines", "3-4 benefit headlines with a number", "2-3 proof headlines with a ledger ID", "2 offer or risk-reversal headlines", "2 CTA headlines", "each stands alone in any position"], must_not: ["one headline shape", "repetition across headlines", "ALL CAPS", "exclamation marks (policy)"], block_types: ["headline"] },
    { id: "descriptions", name: "4 descriptions", job: "Four 90-character complete arguments, each with its own CTA", band_words: [30, 70], must: ["exactly 4", "each 90 characters or fewer", "each a complete argument: claim, proof, CTA"], must_not: ["repetition", "a description that depends on a specific headline", "\"Click here\""], block_types: ["paragraph"] },
  ],
  draft_order: ["descriptions", "headlines"],
  lead_variants: 0,
  skim_path_block_types: ["headline"],
  hard_gates: ["google_rsa.headline_chars<=30", "google_rsa.description_chars<=90", "google_rsa.headline_count==15", "google_rsa.description_count==4", "google_rsa.no_duplicate_headlines"],
  cadence_floor_cv: 0.7,
  allow_emoji_bullets: false,
  allow_markdown_headings: false,
  allow_caps: false,
  platform_limits: { headline_chars: 30, description_chars: 90, headlines: 15, descriptions: 4, path_chars: 15 },
  standard_section: "Google responsive search ads",
  multi_item: { item_name: "asset", min: 19, max: 19, item_roles: ["headline_keyword", "headline_benefit_number", "headline_proof", "headline_offer_or_risk_reversal", "headline_cta", "description"] },
};
