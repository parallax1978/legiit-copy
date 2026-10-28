import type { FormatSpec } from "../spec.ts";

/**
 * Ad set of 3-6 variations. The draft repeats the sections once per variation, suffixing section ids with `#n`.
 * Blocks may carry `meta.platform_field` (primary_text | headline | description | cta_button) for the exporter.
 */
export const meta_ad: FormatSpec = {
  id: "meta_ad",
  name: "Meta and Instagram ad",
  family: "ad",
  description: "An ad set of 3-6 variations, each a different argument for the same offer (the reader's situation now said as a fact, one checkable fact the ledger holds, the speaker's own use or story, the offer itself, a demonstration the reader can run, one longer story), each one person talking to one reader. The first 125 characters stand alone above \"See more\": the hook and what the reader gets, in a sentence the speaker would say. Below the fold: why it works, one proof within two sentences of the promise, the offer in concrete nouns, then one literal CTA. At least one variation runs a full paragraph. The headline field names what the click gets (27 characters; Instagram 40). \"You\" is fine, and so is a call-out by trade or task; never a personal attribute in Meta's list or knowledge of the reader's own finances.",
  length_band_words: [40, 700],
  sections: [
    { id: "primary_text", name: "Primary text", job: "The first block (125 characters, what a phone shows before \"See more\") carries the hook and what the reader gets, as a sentence the speaker would say to one reader; the blocks below carry why it works, one proof within two sentences of the promise, the offer in concrete nouns (what the click gets), and one literal CTA last", band_words: [15, 250], must: ["first block stands alone within 125 characters and says what the reader gets, or the one fact that makes him want it", "one angle, not another variation's angle", "line one built on one fact with one opening move from Section 3, Hooks", "one proof within two sentences of the promise: a ledger row, a documented customer with name and place, a checkable fact or study on file, the speaker's own use on file, or the demonstration the reader runs", "the offer in concrete nouns: what the click gets (the free thing and what is in it, the trial and its price, the first output)", "one literal CTA that names the action and what it gets", "the reader as \"you\" in his present situation, or a call-out by trade, task or tool"], must_not: ["a list or count of the product's steps (say what the reader gets from them)", "\"Are you tired of\"", "\"Do you have [condition]\"", "\"cure, heal, eliminate\"", "effortless-income claims", "emojis", "hashtags", "bold-label-colon bullets", "a personal attribute in Meta's list (race, ethnicity, religion, beliefs, age, sexual orientation, gender identity, disability, physical or mental health, financial status, voting status, union membership, criminal record) asserted or implied about the reader", "the reader's own past purchases, spending or failures told back to him (Section 7.1, tell 14)", "a tool, score or report as the subject of the opening sentence (tell 17)", "a statistic about other people as the opener", "a short verdict or slogan line after the opening (tells 15 and 16)", "a one-line promise with a number and nothing behind it", "a question the next line answers"], block_types: ["hook", "paragraph", "bullets", "cta"] },
    { id: "headline", name: "Headline field", job: "Name what the click gets in plain words, 27 characters (40 on Instagram): the free thing, the trial, the deal, or the result in the reader's words", band_words: [2, 7], must: ["names what the click gets", "under 27 characters for Facebook placements", "sentence case or the product's own capitalization"], must_not: ["a question", "a personal attribute in Meta's list", "a slogan, a tagline or a quality word that names no thing", "the primary text's first line said again"], block_types: ["headline"] },
    { id: "description", name: "Description field", job: "One line where the placement shows it: the risk reversal, the price of trying, or a count the ledger holds", band_words: [2, 12], must: ["one specific from the offer block or the ledger"], must_not: ["a second CTA", "a count, rating or \"join thousands\" with no ledger row"], optional: true, block_types: ["paragraph", "caption"] },
    { id: "cta_button", name: "CTA button label", job: "The platform button label that matches the literal action in the text", band_words: [1, 4], must: ["matches the action in the primary text", "a label Meta offers that names the action (Sign Up, Download, Book Now, Get Offer, Shop Now, Subscribe, Apply Now)"], must_not: ["\"Learn More\" when the action is a purchase or sign-up"], optional: true, block_types: ["button"] },
  ],
  draft_order: ["cta_button", "description", "primary_text", "headline"],
  lead_variants: 0,
  skim_path_block_types: ["hook", "headline", "cta", "button"],
  hard_gates: ["meta_ad.primary_text_chars<=125", "meta_ad.headline_chars<=40", "meta_ad.variations>=3", "meta_ad.variations<=6"],
  cadence_floor_cv: 0.7,
  allow_markdown_headings: false,
  allow_caps: true,
  platform_limits: { primary_text_fold_chars: 125, primary_text_chars: 125, headline_chars: 27, instagram_primary_text_chars: 125, instagram_headline_chars: 40 },
  standard_section: "Meta and Instagram ads",
  multi_item: { item_name: "variation", min: 3, max: 6 },
};
