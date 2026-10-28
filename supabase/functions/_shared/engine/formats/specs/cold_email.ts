import type { FormatSpec } from "../spec.ts";

/**
 * Follow-ups repeat the `followup` section as `followup#1`, `followup#2`, `followup#3`; email one is the unsuffixed sections.
 *
 * A note from one named person to one reader, the way McLean's, Buchan's and the measured campaigns (Gong, Hunter,
 * Woodpecker) work: why this reader, what the sender does as what it gets him with one carrier, and one easy yes, in
 * three jobs rather than a three-line template. The engine holds no prospect record, so "why this reader" uses only a
 * fact the user gave; with none, the sender says who he is and why he writes, and never invents an observation.
 */
export const cold_email: FormatSpec = {
  id: "cold_email",
  name: "Cold email",
  family: "email",
  description: "A short note from one named person to one reader. Why this reader: a fact about him the user gave, said as what the sender saw and why it made him write; with none, who the sender is and why he writes to businesses like this one. What the sender does for businesses like his, said as what it gets him, with one carrier. One easy yes. Email one runs 30-100 words with a subject of 1-4 words and no links. A follow-up of one to three sentences brings one new thing, never guilt.",
  length_band_words: [30, 200],
  sections: [
    { id: "subject", name: "Subject, 1-4 words", job: "1-4 words a colleague would write about the reader's own topic: his company, his trade or the thing he posted. Lowercase is fine.", band_words: [1, 4], must: ["1-4 words", "about his topic, in words he would use"], must_not: ["\"Quick question\"", "the product name", "ALL CAPS", "a pitch or a benefit", "a fact about him the user did not give"], block_types: ["subject"] },
    { id: "observation", name: "Why this reader", job: "Why the sender writes to this reader. With a fact about him the user gave (a post, a hire, a page, a number): say it once, as what the sender saw, and what in it made him write. With none: who the sender is and why he writes to businesses like this one, said straight.", band_words: [8, 30], must: ["a fact about him from the purpose, the memo or an answered question, or the who-and-why line when there is none", "the sender as the one who saw, read or heard it (I read, I saw)", "one fact, said once"], must_not: ["an observation, detail, name or number the user did not give", "a merge placeholder or a bracket", "the reader's own past, habit or pain told to him as a fact (Section 7.1, tell 14)", "a tool, score or report as the subject that says or hands him something (tell 17)", "\"I hope this email finds you well\" on its own", "a resume opener (\"My name is ... and I am the ... of ...\"); a name and a company in a few words is fine", "praise with no reason"], block_types: ["greeting", "paragraph"] },
    { id: "problem_or_case", name: "What the sender does for businesses like his", job: "One plain sentence: what the sender does for businesses like the reader's, said as what it gets him in his own working terms (the orders, the calls, the jobs, the hours). One carrier beside it: a case like his with its number when the ledger holds one; else the mechanism as the cause in a clause, or what his current way leaves him to do.", band_words: [10, 40], must: ["what the product does for him, in the indicative and at full strength", "one carrier: a persona-matched case with its number and ledger ID when the ledger holds one; else the mechanism as the cause, or what his current way leaves him to do", "unsure only about what the sender cannot know of his situation (ask it, or say what you saw), never about the result"], must_not: ["a feature list", "\"designed to\"", "a guess about his situation said as fact", "an ROI percentage or a percentage statistic as the proof", "results \"companies like yours\" get with no ledger row", "the sender's company history, funding or awards", "a line that says results or clients are missing (\"we're new\")", "the plan's terms, the trial's limits or the cancel steps (rule 16)"], block_types: ["paragraph"] },
    { id: "question", name: "One easy yes", job: "One easy yes: interest in one specific thing he can have, from the offer block, the ledger or the purpose (the trial run on his own numbers, a sample, a teardown the user offers), or one question about his present situation that he answers in a word (\"Still taking wholesale orders?\").", band_words: [5, 20], must: ["answerable in a word", "0-1 questions in the email", "asks for interest or a one-word fact, never a meeting"], must_not: ["\"I'd love to schedule a call\"", "\"Thoughts?\"", "two questions", "a day and time or a calendar link in email one", "an offer the offer block, the ledger or the user did not make"], block_types: ["paragraph", "cta"] },
    { id: "signoff", name: "Sign-off", job: "First name, and the company when the opening did not say who is writing", band_words: [1, 6], must: ["a named person"], must_not: ["a signature block with links", "a title line", "a team or company as the sender"], block_types: ["signoff"] },
    { id: "followup", name: "Follow-up", job: "One to three sentences in the same thread. Each brings one new thing: a second fact about him the user gave, the thing the sender offered him, a case like his on file, or, last, a short note that closes the thread and leaves the door open.", band_words: [10, 60], must: ["one new thing the first email did not say", "one to three sentences", "0-1 questions", "its first line opens on the new thing, said by the sender"], must_not: ["\"Just bumping this\"", "\"Did you see my last email\"", "a link before the reader replies", "\"I never heard back\" or any guilt line", "a report of the sender's effort (\"I left you a voicemail\")", "the first email said again", "a result, client or number the ledger does not hold"], optional: true, block_types: ["paragraph", "signoff"] },
  ],
  draft_order: ["question", "problem_or_case", "signoff", "observation", "followup", "subject"],
  lead_variants: 0,
  skim_path_block_types: ["subject"],
  hard_gates: ["cold_email.words<=100", "cold_email.subject_words<=4", "cold_email.email_one_links==0", "cold_email.questions<=1"],
  cadence_floor_cv: 0.5,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Cold email",
  piece_sections: ["followup"],
};
