import type { FormatSpec } from "../spec.ts";

/** Follow-ups repeat the `followup` section as `followup#1`, `followup#2`, `followup#3`; email one is the unsuffixed sections. */
export const cold_email: FormatSpec = {
  id: "cold_email",
  name: "Cold email",
  family: "email",
  description: "Three lines: a verifiable observation about the reader; the implied problem or a one-line case study with a number; one question answerable in a word. 40-90 words, subject 1-3 words, no links in email one. Follow-ups of one to three sentences, each with one new piece of relevance.",
  length_band_words: [40, 200],
  sections: [
    { id: "subject", name: "Subject, 1-3 words", job: "Lowercase, internal-looking, 1-3 words", band_words: [1, 3], must: ["1-3 words"], must_not: ["\"Quick question\"", "the product name", "ALL CAPS"], block_types: ["subject"] },
    { id: "observation", name: "Line one: a verifiable observation", job: "Something true about the reader they can check in a second (a post, a hire, a page, a number)", band_words: [8, 30], must: ["verifiable", "about the reader, not the sender"], must_not: ["\"I hope this email finds you well\"", "\"My name is\"", "flattery"], block_types: ["greeting", "paragraph"] },
    { id: "problem_or_case", name: "Line two: implied problem or one-line case study", job: "The problem the observation implies, or one persona-matched case with a number and a ledger ID", band_words: [10, 40], must: ["persona-matched proof", "a number with a ledger ID when a case is used", "tentative over assumptive"], must_not: ["a feature list", "\"designed to\"", "an assumptive claim about their situation"], block_types: ["paragraph"] },
    { id: "question", name: "Line three: one question answerable in a word", job: "One question a reader can answer with yes, no or a name", band_words: [5, 20], must: ["answerable in a word", "0-1 questions in the email"], must_not: ["\"I'd love to schedule a call\"", "\"Thoughts?\"", "two questions"], block_types: ["paragraph", "cta"] },
    { id: "signoff", name: "Sign-off", job: "First name only", band_words: [1, 6], must: ["a named person"], must_not: ["a signature block with links", "a title line"], block_types: ["signoff"] },
    { id: "followup", name: "Follow-up", job: "One to three sentences with one new piece of relevance each; replies in thread", band_words: [10, 60], must: ["one new piece of relevance", "one to three sentences", "0-1 questions"], must_not: ["\"Just bumping this\"", "\"Did you see my last email\"", "a link before the reader replies"], optional: true, block_types: ["paragraph", "signoff"] },
  ],
  draft_order: ["question", "problem_or_case", "signoff", "observation", "followup", "subject"],
  lead_variants: 0,
  skim_path_block_types: ["subject"],
  hard_gates: ["cold_email.words<=90", "cold_email.subject_words<=3", "cold_email.email_one_links==0", "cold_email.questions<=1"],
  cadence_floor_cv: 0.7,
  allow_emoji_bullets: false,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Cold email",
};
