import type { FormatSpec } from "../spec.ts";

export const thank_you: FormatSpec = {
  id: "thank_you",
  name: "Thank-you page",
  family: "page",
  description: "Confirm, tell them where the thing is, give one instruction for the next sixty seconds, then bridge to one low-ticket offer tied to the promise they just accepted.",
  length_band_words: [80, 250],
  sections: [
    { id: "confirmation", name: "Confirmation with where the thing is", job: "Say it worked and exactly where the thing is (inbox, link, folder) and when", band_words: [10, 50], must: ["where the thing is", "when it arrives"], must_not: ["\"Success!\" alone", "a second subscription ask"], block_types: ["headline", "paragraph"] },
    { id: "instruction", name: "One instruction for the next sixty seconds", job: "One literal action that makes the thing arrive or get used", band_words: [8, 50], must: ["one action", "literal (whitelist, open, reply, watch)"], must_not: ["three instructions", "\"check your spam folder\" as the only line"], block_types: ["paragraph", "numbered", "cta"] },
    { id: "bridge", name: "Bridge to one low-ticket offer", job: "Tie one low-ticket offer to the magnet's promise and name the next step", band_words: [40, 150], must: ["one offer", "tied to the magnet's promise", "price with a ledger ID"], must_not: ["two offers", "a full sales page", "re-selling the free thing"], block_types: ["crosshead", "paragraph", "bullets", "price", "cta", "button"] },
  ],
  draft_order: ["bridge", "instruction", "confirmation"],
  lead_variants: 0,
  skim_path_block_types: ["headline", "crosshead", "cta", "button", "price"],
  hard_gates: ["thank_you.cta_count>=1", "page.no_markdown_headings"],
  cadence_floor_cv: 0.7,
  allow_emoji_bullets: false,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Thank-you page",
};
