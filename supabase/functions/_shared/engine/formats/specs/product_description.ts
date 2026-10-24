import type { FormatSpec } from "../spec.ts";

export const product_description: FormatSpec = {
  id: "product_description",
  name: "Product description",
  family: "commerce",
  description: "Name plus benefit tag; a lead in the buyer's words; three to five bullets translating features to situations; a proof line; specs in a separate block. 60-150 words for consumables, 150-400 for considered purchases. Phrases are checked against the review corpus.",
  length_band_words: [60, 400],
  sections: [
    { id: "name_tag", name: "Name plus benefit tag", job: "The product name and the one benefit the buyer searched for", band_words: [3, 15], must: ["product name", "one benefit"], must_not: ["\"Elevate your [category] experience\"", "superlatives without the proof line"], block_types: ["headline", "deck"] },
    { id: "lead", name: "Lead in the buyer's words", job: "The situation the buyer is in, in a verbatim from the review corpus", band_words: [20, 120], must: ["maps to a review-corpus verbatim", "one claim with its proof"], must_not: ["\"crafted with care\"", "\"designed to\"", "brand story"], block_types: ["paragraph"] },
    { id: "bullets", name: "Three to five bullets: features as situations", job: "Each feature translated to the situation where it matters", band_words: [30, 150], must: ["three to five bullets", "each names a situation", "every number has a ledger ID"], must_not: ["bold-label-colon bullets", "feature names alone", "\"so you can\" triads"], block_types: ["bullets"] },
    { id: "proof_line", name: "Proof line", job: "One ledger-backed number, test or review figure", band_words: [8, 40], must: ["ledger ID"], must_not: ["\"loved by thousands\"", "a superlative with no referent"], block_types: ["paragraph", "testimonial"] },
    { id: "specs", name: "Specs in a separate block", job: "Dimensions, materials, contents, compatibility, as a labeled list", band_words: [10, 80], must: ["every spec from the ledger"], must_not: ["benefits mixed into specs", "a spec the ledger does not hold"], block_types: ["numbered", "label", "paragraph"] },
  ],
  draft_order: ["specs", "proof_line", "bullets", "lead", "name_tag"],
  lead_variants: 0,
  skim_path_block_types: ["headline", "deck", "label"],
  hard_gates: ["product.benefit_bullets>=3", "product.benefit_bullets<=5", "page.no_markdown_headings"],
  cadence_floor_cv: 0.7,
  allow_emoji_bullets: false,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Product description",
};
