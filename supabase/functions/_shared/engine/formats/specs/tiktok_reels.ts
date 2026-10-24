import type { FormatSpec } from "../spec.ts";

export const tiktok_reels: FormatSpec = {
  id: "tiktok_reels",
  name: "TikTok and Reels script",
  family: "social",
  description: "15-45 seconds, under 90 spoken words, a real person on camera. Line one spoken and captioned carries the proposition in the first 3 seconds; lines two to four show the discovery; one proof; CTA with location.",
  length_band_words: [30, 90],
  sections: [
    { id: "line_one", name: "Line one, spoken and captioned", job: "The proposition in the first 3 seconds: result-first, contrarian or POV", band_words: [5, 18], must: ["proposition in the first 3 seconds", "result-first, contrarian or POV", "captioned verbatim"], must_not: ["\"Hey everyone!\"", "\"In this video\"", "brand name first"], block_types: ["hook", "caption"] },
    { id: "discovery", name: "Lines two to four show the discovery", job: "Show, not tell: what was tried, what was found, with one concrete specific per line", band_words: [15, 45], must: ["shows the discovery", "a concrete specific per line"], must_not: ["feature tour", "listing three benefits"], block_types: ["beat", "caption"] },
    { id: "proof", name: "One proof", job: "One ledger-backed number, name or shown result", band_words: [5, 20], must: ["ledger ID", "shown on camera where possible"], must_not: ["\"trusted by thousands\"", "undocumented before/after"], block_types: ["beat", "caption", "testimonial"] },
    { id: "cta", name: "CTA with location", job: "Verb, object, location (\"tap the link in my bio\", \"comment X\")", band_words: [4, 15], must: ["verb, object, location"], must_not: ["\"link below\" with no location", "two actions"], block_types: ["beat", "cta", "caption"] },
  ],
  draft_order: ["cta", "proof", "discovery", "line_one"],
  lead_variants: 0,
  skim_path_block_types: ["hook", "caption", "cta"],
  hard_gates: ["tiktok.spoken_words<=90", "tiktok.cta_count>=1"],
  cadence_floor_cv: 0.5,
  allow_emoji_bullets: false,
  allow_markdown_headings: false,
  allow_caps: true,
  platform_limits: { spoken_words: 90, seconds_min: 15, seconds_max: 45 },
  standard_section: "TikTok and Reels",
};
