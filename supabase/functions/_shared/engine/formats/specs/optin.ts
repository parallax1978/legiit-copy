import type { FormatSpec } from "../spec.ts";

export const optin: FormatSpec = {
  id: "optin",
  name: "Opt-in page",
  family: "page",
  description: "Trade one email for one promised artifact. The headline sells the result, the bullets withhold, the form asks for the email only.",
  length_band_words: [60, 250],
  sections: [
    { id: "headline", name: "Headline", job: "Promise the result with a number, timeframe or mechanism; the artifact is the carrier, not the subject", band_words: [6, 30], must: ["a number, timeframe or mechanism", "ledger ID on any number"], must_not: ["headline describing the artifact (\"Free PDF\", \"Download our guide\")", "\"Ultimate Guide\""], block_types: ["preheadline", "headline", "deck"] },
    { id: "bullets", name: "Three to six incomplete bullets", job: "Open loops the artifact closes; each withholds the closing noun", band_words: [30, 120], must: ["three to six bullets", "each bullet withholds the answer", "one bullet carries a number or a named mechanism"], must_not: ["bold-label-colon bullets", "feature list of the artifact (\"12 pages\", \"printable\")", "complete answers"], block_types: ["bullets"] },
    { id: "proof_line", name: "One proof line", job: "One ledger-backed reason to believe the promise, in a sentence", band_words: [8, 40], must: ["ledger ID on the number or name"], must_not: ["\"join thousands\"", "\"we will never spam you\""], block_types: ["paragraph", "testimonial", "caption"] },
    { id: "form", name: "Email-only form", job: "One field", band_words: [1, 6], must: ["email only"], must_not: ["name field", "phone field", "\"we will never spam you\""], block_types: ["field"] },
    { id: "button", name: "Button completing \"I want...\"", job: "First person, the result not the artifact", band_words: [2, 10], must: ["completes \"I want...\"", "names the result"], must_not: ["\"Submit\"", "\"Download\" alone", "\"Sign up\""], block_types: ["button"] },
  ],
  draft_order: ["button", "bullets", "proof_line", "form", "headline"],
  lead_variants: 0,
  skim_path_block_types: ["preheadline", "headline", "deck", "button"],
  hard_gates: ["optin.bullet_items>=3", "optin.bullet_items<=6", "optin.fields<=1", "optin.no_submit_button", "page.no_markdown_headings"],
  cadence_floor_cv: 0.7,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Opt-in page",
};
