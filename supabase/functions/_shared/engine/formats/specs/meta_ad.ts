import type { FormatSpec } from "../spec.ts";

/**
 * Ad set of 3-6 variations. The draft repeats the sections once per variation, suffixing section ids with `#n`.
 * Blocks may carry `meta.platform_field` (primary_text | headline | description | cta_button) for the exporter.
 */
export const meta_ad: FormatSpec = {
  id: "meta_ad",
  name: "Meta and Instagram ad",
  family: "ad",
  description: "Hook, one angle, one proof, one literal CTA in the primary text; the headline field restates the offer. 50-150 characters before the fold (Instagram 125); headline 27 characters (Instagram 40). Describe the product or the outcome, never the reader's attribute.",
  length_band_words: [40, 700],
  sections: [
    { id: "primary_text", name: "Primary text", job: "First block stands alone above the fold: hook, one angle, one proof, one literal CTA", band_words: [15, 120], must: ["first block stands alone within 150 characters (125 on Instagram)", "one angle", "one ledger-backed proof", "one literal CTA", "describes the product or outcome, never the reader's attribute"], must_not: ["a list or count of the product's steps (say what the reader gets from them)", "\"Are you tired of\"", "\"Do you have [condition]\"", "\"cure, heal, eliminate\"", "effortless-income claims", "emojis", "hashtags", "bold-label-colon bullets"], block_types: ["hook", "paragraph", "bullets", "cta"] },
    { id: "headline", name: "Headline field", job: "Restate the offer in 27 characters (40 on Instagram)", band_words: [2, 7], must: ["restates the offer", "under 27 characters for Facebook placements"], must_not: ["a question", "the reader's attribute"], block_types: ["headline"] },
    { id: "description", name: "Description field", job: "One line of proof or risk reversal where the placement shows it", band_words: [2, 12], must: ["one specific"], must_not: ["a second CTA"], optional: true, block_types: ["paragraph", "caption"] },
    { id: "cta_button", name: "CTA button label", job: "The platform button label that matches the literal action in the text", band_words: [1, 4], must: ["matches the action in the primary text"], must_not: ["\"Learn More\" when the action is a purchase or sign-up"], optional: true, block_types: ["button"] },
  ],
  draft_order: ["cta_button", "description", "primary_text", "headline"],
  lead_variants: 0,
  skim_path_block_types: ["hook", "headline", "cta", "button"],
  hard_gates: ["meta_ad.primary_text_chars<=150", "meta_ad.headline_chars<=40", "meta_ad.variations>=3", "meta_ad.variations<=6"],
  cadence_floor_cv: 0.7,
  allow_markdown_headings: false,
  allow_caps: true,
  platform_limits: { primary_text_fold_chars: 125, primary_text_chars: 150, headline_chars: 27, instagram_primary_text_chars: 125, instagram_headline_chars: 40 },
  standard_section: "Meta and Instagram ads",
  multi_item: { item_name: "variation", min: 3, max: 6 },
};
