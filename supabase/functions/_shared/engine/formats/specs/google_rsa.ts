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
  description: "The searcher is scanning a list: each asset is a plain label of what he gets or does, in his words. 15 headlines of 30 characters at most, most of them under 20, in five shapes (3-4 that carry the searched words whole, 3-4 that say the result the searcher gets in his words, 2-3 proof from the ledger or the reader's own test, 2 offer or risk reversal, 2 that say what to do) and 4 descriptions of 60-80 characters (90 at most), each one complete thought: the result, its reason or proof, the action. Sentence case throughout. Every asset makes sense alone, beside any other and as a link; the first three headlines read as one ad. No two headlines share a shape and wording.",
  length_band_words: [80, 160],
  sections: [
    { id: "headlines", name: "15 headlines", job: "Fifteen headlines Google combines in any order and may show alone as links: 3-4 that carry the searched words whole (a keyword never split across two headlines), 3-4 that say the result the searcher gets in plain words (a number only when the ledger holds one on the result), 2-3 proof (a ledger fact or count, the mechanism said as a fact, or the reader testing it on his own case), 2 offer or risk reversal (the price of trying, the trial, the guarantee the offer leads with), 2 that tell him what to do; each a plain label of a thing, most under 20 characters", band_words: [45, 90], must: ["exactly 15", "each 30 characters or fewer, at least 8 of them under 20", "sentence case: capitals only on the first word, proper nouns and the product's own name", "3-4 keyword headlines, each holding its keyword whole", "3-4 benefit headlines (the reader's result in his words; a number only when the ledger holds one on the result, never a count of the product's parts)", "2-3 proof headlines (ledger proof with its ID, or the demonstration: \"Test it on your own site\")", "2 offer or risk-reversal headlines", "2 CTA headlines naming the action and what it gets", "each makes sense alone, beside any other headline and as a link", "the first three read as one ad"], must_not: ["one headline shape", "repetition across headlines", "ALL CAPS", "exclamation marks (policy)", "Title Case On Every Word", "a slogan, theme or quality word that names no thing", "a superlative or ranking with no ledger row", "a question", "the product's internals or a count of its steps", "emoji, symbols used as bullets, or repeated punctuation (policy)"], block_types: ["headline"] },
    { id: "descriptions", name: "4 descriptions", job: "Four descriptions, most 60-80 characters (90 at most), each one complete thought that reads under any headline: the result the searcher gets, its reason or proof, and what to do", band_words: [30, 70], must: ["exactly 4", "each 90 characters or fewer, most 60-80", "each one complete thought: the result, its reason or proof, the action", "sentence case", "one carries the offer line (the price of trying or the trial) when the offer block has one", "a keyword too long for a headline goes in a description, whole"], must_not: ["repetition", "a description that depends on a specific headline", "\"Click here\"", "a sentence a headline already says", "padding to reach 90 characters", "a hedge on the result", "more than one exclamation mark in the whole ad"], block_types: ["paragraph"] },
  ],
  draft_order: ["descriptions", "headlines"],
  lead_variants: 0,
  skim_path_block_types: ["headline"],
  hard_gates: ["google_rsa.headline_chars<=30", "google_rsa.description_chars<=90", "google_rsa.headline_count==15", "google_rsa.description_count==4", "google_rsa.no_duplicate_headlines", "google_rsa.no_all_caps_headlines", "google_rsa.no_exclamation_headlines"],
  cadence_floor_cv: 0.7,
  allow_markdown_headings: false,
  allow_caps: false,
  platform_limits: { headline_chars: 30, description_chars: 90, headlines: 15, descriptions: 4, path_chars: 15 },
  standard_section: "Google responsive search ads",
  multi_item: { item_name: "asset", min: 19, max: 19, item_roles: ["headline_keyword", "headline_benefit", "headline_proof", "headline_offer_or_risk_reversal", "headline_cta", "description"] },
};
