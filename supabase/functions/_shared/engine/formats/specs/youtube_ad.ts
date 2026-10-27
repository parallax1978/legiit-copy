import type { FormatSpec } from "../spec.ts";

export const youtube_ad: FormatSpec = {
  id: "youtube_ad",
  name: "YouTube ad script",
  family: "video",
  description: "Under 3 minutes. 0-5s call-out and disqualifier; 5-15s stakes and one credibility line; 15-45s mechanism; then proof, offer, spoken and on-screen CTA, rehook, second CTA.",
  length_band_words: [150, 480],
  sections: [
    { id: "callout", name: "Call-out and disqualifier (0-5s)", job: "Name the viewer and name who should skip, before the skip button appears", band_words: [8, 25], must: ["names the viewer by situation", "one disqualifier"], must_not: ["logo intro", "\"Hey everyone\"", "\"At [Brand], we\"", "a reframe that presents one thing as another (\"X feels like Y. It's Z.\")", "a windup (\"Here's the part...\")", "a teaser that withholds nothing specific"], block_types: ["beat", "hook", "caption"] },
    { id: "stakes", name: "Stakes and one credibility line (5-15s)", job: "What the viewer loses by staying as they are, and one ledger-backed reason to listen", band_words: [20, 50], must: ["one credibility line with a ledger ID", "stakes from the research"], must_not: ["biography", "melodrama"], block_types: ["beat", "caption"] },
    { id: "mechanism", name: "Mechanism (15-45s)", job: "Why the usual fixes fail and what this does instead, in one step", band_words: [50, 120], must: ["mechanism in one step", "names a usual fix that fails"], must_not: ["\"our proven system\"", "multi-step mechanism"], block_types: ["beat", "slide", "caption"] },
    { id: "proof", name: "Proof", job: "One documented result with its typical result adjacent", band_words: [20, 80], must: ["ledger ID", "typical result adjacent"], must_not: ["improbable-result claims", "undated results"], block_types: ["beat", "testimonial", "caption"] },
    { id: "offer", name: "Offer", job: "What they get and on what terms, in the words of the landing page", band_words: [20, 80], must: ["identical to the landing page", "price or free stated as a fact"], must_not: ["a stack", "a claim the page does not make"], block_types: ["beat", "slide", "price"] },
    { id: "cta_spoken", name: "Spoken and on-screen CTA", job: "The literal action said aloud and shown", band_words: [8, 30], must: ["spoken and on-screen", "literal action"], must_not: ["\"click the link below\" alone"], block_types: ["beat", "cta", "caption", "button"] },
    { id: "rehook", name: "Rehook", job: "A second reason to keep watching for the viewer who did not click", band_words: [10, 40], must: ["a new specific"], must_not: ["repeating the call-out"], block_types: ["beat", "hook"] },
    { id: "cta_second", name: "Second CTA", job: "Repeat the action with what happens after the click", band_words: [8, 30], must: ["what happens after the click"], must_not: ["a different destination"], block_types: ["beat", "cta", "caption", "button"] },
  ],
  draft_order: ["offer", "cta_spoken", "cta_second", "rehook", "proof", "mechanism", "stakes", "callout"],
  lead_variants: 3,
  lead_section_id: "callout",
  skim_path_block_types: ["caption", "slide", "cta", "button", "price"],
  hard_gates: ["youtube_ad.cta_count>=2", "youtube_ad.spoken_words<=480", "page.no_markdown_headings"],
  cadence_floor_cv: 0.7,
  allow_markdown_headings: false,
  allow_caps: true,
  platform_limits: { seconds_max: 180, spoken_words: 480 },
  standard_section: "YouTube ad script",
};
