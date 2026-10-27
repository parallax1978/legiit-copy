import type { FormatSpec } from "../spec.ts";

export const vsl_short: FormatSpec = {
  id: "vsl_short",
  name: "Short video sales letter",
  family: "video",
  description: "Cold traffic, 3-7 minutes. Interrupt tied to the promise; promise, mechanism and credibility in one breath; catalyst; three fascinations or a mini-demonstration; who it is for; next step; one real reason to act now. No stack; price only when the page sells.",
  length_band_words: [450, 1050],
  sections: [
    { id: "interrupt", name: "Interrupt tied to the promise", job: "Stop the specific viewer in the first line with a specific the promise pays off", band_words: [15, 60], must: ["tied to the promise", "a concrete specific from the viewer's world"], must_not: ["\"In the next few minutes\"", "\"Hey everyone\"", "logo intro"], block_types: ["beat", "hook", "slide"] },
    { id: "promise_mechanism_credibility", name: "Promise, mechanism and credibility in one breath", job: "Result, the named mechanism, and who is talking, in two or three sentences", band_words: [30, 100], must: ["result", "mechanism named", "ledger-backed credential"], must_not: ["\"our proven system\"", "biography"], block_types: ["beat", "slide"] },
    { id: "catalyst", name: "Catalyst", job: "Why this exists now", band_words: [30, 120], must: ["a dated event or discovery"], must_not: ["invented urgency"], block_types: ["beat", "paragraph"] },
    { id: "benefits_or_demo", name: "Three fascinations or a mini-demonstration", job: "Three fascination-style benefits that withhold the closing noun, or one short documented demonstration", band_words: [80, 300], must: ["three fascinations or one demonstration", "proof within two sentences of each claim"], must_not: ["stack", "feature tour", "bold-label-colon bullets"], block_types: ["beat", "slide", "bullets", "testimonial"] },
    { id: "who_for", name: "Who it is for plus one disqualifier", job: "Name the viewer and name one person this is not for", band_words: [30, 100], must: ["one disqualifier"], must_not: ["\"whether you're a beginner or a pro\"", "a list of personas"], block_types: ["beat", "paragraph"] },
    { id: "next_step", name: "Next step", job: "The literal action and what happens after the click", band_words: [15, 60], must: ["literal action", "what happens after"], must_not: ["price unless the page sells", "\"click the link below\" alone"], block_types: ["beat", "cta", "button"] },
    { id: "reason_now", name: "One real reason to act now", job: "The deadline or scarcity with its mechanism, or a consequence of waiting from the research", band_words: [20, 80], must: ["mechanism stated"], must_not: ["invented scarcity", "\"don't miss out\""], block_types: ["beat", "paragraph", "cta"] },
  ],
  draft_order: ["next_step", "reason_now", "who_for", "benefits_or_demo", "catalyst", "promise_mechanism_credibility", "interrupt"],
  lead_variants: 3,
  lead_section_id: "interrupt",
  skim_path_block_types: ["slide", "cta", "button"],
  hard_gates: ["vsl.cta_count>=1", "vsl_short.spoken_words<=1050", "page.no_markdown_headings"],
  cadence_floor_cv: 0.7,
  allow_emoji_bullets: false,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Short VSL, cold",
};
