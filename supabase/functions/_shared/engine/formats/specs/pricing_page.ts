import type { FormatSpec } from "../spec.ts";

export const pricing_page: FormatSpec = {
  id: "pricing_page",
  name: "B2B pricing page",
  family: "page",
  description: "Value headline; three plans as \"Best for [persona]\"; an offer that neutralizes a researched objection; proof at the decision point; FAQ headings phrased as the objection; anchor against the expensive alternative; the value argument restated above the price.",
  length_band_words: [300, 1200],
  sections: [
    { id: "value_headline", name: "Value headline", job: "The result and its denominator, not \"Pricing\"", band_words: [5, 25], must: ["the result", "ledger ID on any number"], must_not: ["\"Simple, transparent pricing\"", "\"Plans for every team\""], block_types: ["headline", "deck"] },
    { id: "plans", name: "Three plans as \"Best for [persona]\"", job: "Three plans, each named for who it is best for, price stated as a fact, the differences as situations", band_words: [60, 300], must: ["three plans", "each plan \"Best for [persona]\" from the research", "price with a ledger ID", "the recommended plan marked with a reason"], must_not: ["four or more plans", "gated pricing without a stated reason", "feature matrix as the only content"], block_types: ["label", "price", "bullets", "button", "paragraph"] },
    { id: "offer", name: "Offer that neutralizes a researched objection", job: "The trial, guarantee, migration or onboarding term that answers the objection the research ranked first", band_words: [30, 120], must: ["objection from the research map", "denominated term"], must_not: ["\"cancel anytime, no contracts, no setup fees\" triad", "an invented objection"], block_types: ["crosshead", "paragraph", "guarantee"] },
    { id: "proof", name: "Proof at the decision point", job: "A documented customer at the plan boundary, with the number", band_words: [30, 120], must: ["ledger ID", "placed beside the plans"], must_not: ["logo wall alone", "\"trusted by thousands\""], block_types: ["testimonial", "paragraph", "caption"] },
    { id: "anchor", name: "Anchor against the expensive alternative", job: "What the expensive alternative costs (headcount, agency, the old tool) with a ledger-backed number", band_words: [30, 120], must: ["named alternative", "ledger-backed number"], must_not: ["\"less than a cup of coffee\"", "per-day frame without the full price"], block_types: ["paragraph", "crosshead"] },
    { id: "value_restate", name: "Value argument restated above the price", job: "One sentence of value directly above the price", band_words: [10, 40], must: ["restates the result"], must_not: ["a new claim"], block_types: ["paragraph", "deck"] },
    { id: "faq", name: "FAQ headings phrased as the objection", job: "Each heading is the objection in the buyer's words; each answer carries proof", band_words: [60, 300], must: ["objections from the research map", "heading in the buyer's words", "proof in each answer"], must_not: ["invented objections", "self-posed question headers that the answer does not resolve"], block_types: ["crosshead", "paragraph"] },
    { id: "cta", name: "CTA", job: "The literal action for the recommended plan; sales contact as a second path, never the only one", band_words: [3, 30], must: ["a self-serve action"], must_not: ["\"Contact us\" as the only CTA"], block_types: ["cta", "button"] },
  ],
  draft_order: ["plans", "offer", "cta", "anchor", "value_restate", "proof", "faq", "value_headline"],
  lead_variants: 0,
  skim_path_block_types: ["headline", "deck", "label", "price", "crosshead", "guarantee", "button", "cta"],
  hard_gates: ["pricing_page.plans<=3", "pricing_page.cta_count>=1", "pricing_page.not_only_contact_us", "page.no_markdown_headings"],
  cadence_floor_cv: 0.7,
  allow_emoji_bullets: false,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "B2B pricing page",
};
