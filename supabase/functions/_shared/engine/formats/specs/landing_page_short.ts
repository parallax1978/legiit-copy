import type { FormatSpec } from "../spec.ts";

export const landing_page_short: FormatSpec = {
  id: "landing_page_short",
  name: "Short landing page",
  family: "page",
  description: "Product-aware traffic from an ad. The headline matches the ad, the benefits are argued with proof in line, the CTA repeats. B2B demo variant adds \"here's what you'll get\" and an indicated price (300-750 words).",
  length_band_words: [150, 600],
  sections: [
    { id: "headline", name: "Headline matched to the ad", job: "Continue the ad's promise in its own words so the click is confirmed, not re-sold", band_words: [6, 25], must: ["matches the ad's promise and wording", "names the result or who it is for", "ledger ID on any number or name"], must_not: ["problem education", "story lead", "\"Unlock\", \"Discover the secret\"", "question the reader answers instantly"], block_types: ["preheadline", "headline"] },
    { id: "subhead", name: "Subhead with who and differentiator", job: "Say who this is for and the one thing that makes it different", band_words: [10, 40], must: ["who it is for", "the differentiator in one clause"], must_not: ["restating the headline", "three benefits with \"so you can\""], block_types: ["deck"] },
    { id: "cta_primary", name: "CTA with the action in the button", job: "Name the literal action and what happens after the click", band_words: [3, 25], must: ["button text states the literal action", "what happens after the click"], must_not: ["\"Submit\"", "\"Learn more\" alone"], block_types: ["cta", "button"] },
    { id: "benefits", name: "Three to five argued benefits", job: "Each benefit as claim, reason, proof, picture, with the proof in line", band_words: [60, 250], must: ["three to five benefits", "proof within two sentences of each claim", "every description of the reader maps to a verbatim"], must_not: ["feature list", "\"so you can\" triads", "bold-label-colon bullets", "problem education"], block_types: ["crosshead", "paragraph", "bullets"] },
    { id: "proof_strip", name: "Proof strip", job: "Reinforce with ledger-backed numbers, names or logos; typical result beside any result", band_words: [15, 80], must: ["ledger-backed proof", "typical result adjacent to any result"], must_not: ["\"trusted by thousands\"", "generic testimonials", "proof wall"], block_types: ["testimonial", "paragraph", "caption"] },
    { id: "objections", name: "Two objections with guarantee", job: "Answer the two objections the research raised, with the denominated guarantee", band_words: [40, 150], must: ["two objections from the research", "guarantee denominated and repeatable"], must_not: ["invented objections", "FAQ wall", "qualifiers that gut the guarantee"], block_types: ["crosshead", "paragraph", "guarantee"] },
    { id: "demo_offer", name: "Demo offer and indicated price (B2B variant)", job: "\"Here's what you'll get\" on the call and an indicated price so the reader can qualify themselves", band_words: [30, 120], must: ["what the demo covers", "indicated price or range"], must_not: ["\"Contact us for pricing\" with no stated reason"], optional: true, block_types: ["crosshead", "bullets", "paragraph", "price"] },
    { id: "cta_repeat", name: "Repeated CTA", job: "Same action, same destination, after the objections", band_words: [3, 30], must: ["same destination as the first CTA"], must_not: ["a second offer", "a different action"], block_types: ["cta", "button"] },
  ],
  draft_order: ["cta_primary", "demo_offer", "objections", "benefits", "proof_strip", "cta_repeat", "subhead", "headline"],
  lead_variants: 0,
  skim_path_block_types: ["preheadline", "headline", "deck", "crosshead", "cta", "button", "guarantee", "price"],
  hard_gates: ["page.cta_count>=2", "page.no_markdown_headings"],
  cadence_floor_cv: 0.7,
  allow_emoji_bullets: false,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Short landing page, product-aware",
};
