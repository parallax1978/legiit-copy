import type { FormatSpec } from "../spec.ts";

export const email_single: FormatSpec = {
  id: "email_single",
  name: "Promotional email",
  family: "email",
  description: "One reader, one idea, one link. The job is the click or the reply.",
  length_band_words: [30, 700],
  sections: [
    { id: "subject", name: "Subject and preview", job: "Written last from the body: the most specific interesting line in it", band_words: [3, 14], must: ["under 70 characters", "not restated as line one"], must_not: ["personalization tokens", "ALL CAPS whole subject"], block_types: ["subject", "preview"] },
    { id: "hook", name: "Hook line", job: "Earn the second sentence", band_words: [5, 40], must: ["a concrete noun, number or scene"], must_not: ["\"I hope this finds you well\"", "a rhetorical pain question", "restating the subject"], block_types: ["greeting", "paragraph"] },
    { id: "body", name: "One story or argument", job: "Carry one claim with its proof, ending at a one-sentence bridge", band_words: [20, 550], must: ["one idea", "proof within two sentences of the claim", "every description of the reader maps to a verbatim"], must_not: ["three benefits with \"so you can\"", "\"That's why we built\" without a cause", "\"Not this. That.\"", "\"Let that sink in\"", "summary paragraph"], block_types: ["paragraph", "bullets", "testimonial"] },
    { id: "cta", name: "Bridge and link", job: "One sentence that names the next step and what happens after the click", band_words: [8, 40], must: ["exactly one link", "literal action"], must_not: ["\"Learn more\" alone", "multiple links"], block_types: ["cta", "button"] },
    { id: "signoff", name: "Sign-off and P.S.", job: "A named sender; P.S. only past 250 words and it carries what the skimmer needs", band_words: [2, 60], must: ["named person"], must_not: ["cheerful sign-off", "second CTA with a different destination"], optional: true, block_types: ["signoff", "ps"] },
  ],
  draft_order: ["cta", "body", "hook", "signoff", "subject"],
  lead_variants: 0,
  skim_path_block_types: ["subject", "preview", "crosshead", "cta", "ps"],
  hard_gates: ["email.links<=1", "email.subject_chars<=70", "email.single_idea"],
  cadence_floor_cv: 0.7,
  allow_emoji_bullets: false,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Single email",
};
