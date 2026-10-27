import type { FormatSpec } from "../spec.ts";

/** Two variants share the spec: a produced spot (the `spot` section alone plus `code_url`) or a host read (the `host_*` sections plus `code_url`). */
export const podcast_read: FormatSpec = {
  id: "podcast_read",
  name: "Podcast and audio read",
  family: "audio",
  description: "Produced spot: 55-70 words, brand within five seconds, one CTA with the code. Host read: talking points, not a script; a \"why I use it\" moment; one mechanism; one proof; one objection; code and URL said twice, last.",
  length_band_words: [55, 400],
  sections: [
    { id: "spot", name: "Produced spot", job: "55-70 words: brand within the first five seconds, one claim with its proof, one CTA with the code", band_words: [55, 70], must: ["brand within the first twelve words", "one CTA with the code", "ledger ID on any number"], must_not: ["two CTAs", "a stack", "\"visit our website\" with no URL"], optional: true, block_types: ["beat", "paragraph"] },
    { id: "host_open", name: "Host read: \"why I use it\"", job: "Talking points for the host's own moment with the product, in their words", band_words: [20, 80], must: ["talking points, not a script", "a moment the host can own"], must_not: ["a scripted paragraph", "claims the host cannot make"], optional: true, block_types: ["bullets", "beat"] },
    { id: "host_mechanism", name: "Host read: one mechanism", job: "One sentence of why it works", band_words: [10, 40], must: ["one mechanism"], must_not: ["feature list"], optional: true, block_types: ["bullets", "beat"] },
    { id: "host_proof", name: "Host read: one proof", job: "One ledger-backed number or name", band_words: [8, 40], must: ["ledger ID"], must_not: ["\"trusted by thousands\""], optional: true, block_types: ["bullets", "beat"] },
    { id: "host_objection", name: "Host read: one objection", job: "The objection the research ranked first, answered in the host's voice", band_words: [10, 50], must: ["objection from the research map"], must_not: ["an invented objection"], optional: true, block_types: ["bullets", "beat"] },
    { id: "code_url", name: "Code and URL, said twice, last", job: "The URL and the code, said twice, as the last thing", band_words: [6, 30], must: ["code and URL", "said twice", "last"], must_not: ["a URL that is hard to say", "two codes"], block_types: ["cta", "beat"] },
  ],
  draft_order: ["code_url", "host_objection", "host_proof", "host_mechanism", "host_open", "spot"],
  lead_variants: 0,
  skim_path_block_types: ["cta"],
  hard_gates: ["podcast.spot_words<=70", "podcast.cta_count>=1"],
  cadence_floor_cv: 0.7,
  allow_markdown_headings: false,
  allow_caps: true,
  platform_limits: { spot_words_min: 55, spot_words_max: 70 },
  standard_section: "Podcast and audio read",
};
