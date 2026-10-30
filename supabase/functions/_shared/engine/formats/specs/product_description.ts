import type { FormatSpec } from "../spec.ts";

/**
 * One person who knows the thing sells it to one buyer the way the best catalogs do (docs/04 Section 9, Product
 * description; rules 8, 9, 25, 37 to 40). The name says the one result it is bought for; the lead puts him in the
 * moment he uses it and joins it to the fact that makes this the answer; the bullets give the facts with their numbers
 * and what each does for him; the proof line is a named source or his own test at home; the offer line carries the
 * price, the guarantee and what arrives where the platform lets it; the specs give every fact he needs to decide.
 * Every example a writer could copy comes from another trade.
 */
export const product_description: FormatSpec = {
  id: "product_description",
  name: "Product description",
  family: "commerce",
  description: "One person who knows the thing sells it to one buyer the way the best catalogs do: the name and the one result it is bought for; a lead that puts him in the moment he uses it and joins it to the fact that makes this the answer; three to five facts with their numbers and what each does for him; one proof line from a named source or his own test at home; the price, the guarantee and what arrives where the platform shows them; the specs in their own block. 60-150 words for a consumable, 150-400 for a considered purchase: the price sets the length. The review corpus supplies the substance, never the wording.",
  length_band_words: [60, 400],
  sections: [
    {
      id: "name_tag",
      name: "Name and the one result",
      job: "The product's name and the one result he buys it for, in his words, so he knows at a glance what it does for him; a third party's line about it, with its source named, when the ledger holds one.",
      band_words: [3, 15],
      must: [
        "the product's name",
        "the one result he buys it for, in his words, as a thing that happens to him (rule 8)",
        "a quoted line only with its source named and its ledger ID",
        "words a ten-year-old knows; no catalog label a cold buyer would ask about (rule 40)",
      ],
      must_not: [
        "\"Elevate your [category] experience\" or any tagline built from a benefit verb and category nouns (tell 16)",
        "Title Case",
        "a superlative without the proof line",
        "a review quoted or counted with no row",
        "a colon and a slogan after the name",
      ],
      block_types: ["headline", "deck"],
    },
    {
      id: "lead",
      name: "Lead: his moment, and the fact that makes this the answer",
      job: "Put him in the moment he uses it, so he feels the use before he reads a spec, and join it to the one fact that makes this the answer: what it does for him there, the odd true detail that is the reason to believe, or the maker's own use on file.",
      band_words: [20, 120],
      must: [
        "his situation from the plain facts of the use, the review corpus or the story inventory, with one concrete thing in it (the saddle, the glare, the airport) (rule 2)",
        "the feeling he already carries in that moment, said as the thing itself (the cold hands, the gift that came late), never as an adjective about it (rule 39)",
        "the product's first appearance in one plain sentence: what it is and what it does for him (rule 38)",
        "one claim with its carrier within two sentences (rule 9)",
        "in the first person when a speaker is on file; else plain sentences with no pronoun",
        "words a ten-year-old knows; one long sentence where the feeling needs it (rule 40)",
      ],
      must_not: [
        "\"crafted with care\", \"designed to\", \"premium\"",
        "a brand or origin story the ledger or the story inventory does not hold (rule 25)",
        "the buyer's past or habit told to him as a fact (tell 14); a tool or a part as the actor (tell 17); a verdict closing line one (tell 15)",
        "a reframe, an analogy or a slogan as the opening (tell 16)",
        "a verbatim's survey wording (\"good value for the price\"); a quote with no row (rule 11)",
        "the product pointed at (\"it\", \"this\") before the sentence that says what it is (tell 18)",
        "a lesson in how the thing is used that he already knows (rule 40)",
        "\"At [Brand], we\"",
      ],
      block_types: ["paragraph"],
    },
    {
      id: "bullets",
      name: "Three to five facts, each with what it does for him",
      job: "Give him the facts a friend who owns one would give: each bullet one fact with its number, material or named part, then what it does for him where it matters. Among them the pains taken in making it that others leave unsaid, and the comparison with the dearer or usual thing when the ledger holds it.",
      band_words: [30, 150],
      must: [
        "three to five bullets",
        "each carries one fact with its number, material or named part from the ledger, then what it does for him (2 mm steel, so it will not bend)",
        "every number has a ledger ID; a fact on file with no number is said without one, never with an invented one",
        "at least one bullet is a process specific or the maker's own test on file; with none, the mechanism as the cause",
        "each bullet makes him feel the use (the cold morning, the heavy bag), never only informs (rule 39)",
        "plain words: the trade's everyday words are fine; a part's catalog name is explained once or dropped (rule 40)",
      ],
      must_not: [
        "bold-label-colon bullets",
        "feature names alone; an adjective in place of a number (\"premium\", \"durable\", \"high quality\")",
        "\"so you can\" triads; \"designed to\"",
        "a benefit the ledger does not support; a number with no row",
        "every bullet in one shape or one length",
        "a bullet that sells what the usual thing also does, as this one's own (rule 1)",
      ],
      block_types: ["bullets"],
    },
    {
      id: "proof_line",
      name: "One reason to believe, beside the biggest claim",
      job: "Make the biggest claim believable in one line: a named source (the magazine, the lab, the review platform with its count) or the maker's own test when the ledger holds one. With none, the test he runs at home with the guarantee beside it, or the mechanism as the cause.",
      band_words: [8, 40],
      must: [
        "placed beside the biggest claim (rule 9)",
        "the source named, with its ledger ID, on any number, test, review or quote",
        "with nothing on file: the test he runs at home, told as what he will see, with the guarantee beside it; or the maker's own use from the story inventory; or the mechanism as the cause",
        "the promise at full strength, in the indicative (rule 20)",
      ],
      must_not: [
        "\"loved by thousands\", \"reviewers say\", a star rating or a count with no row",
        "a superlative with no referent",
        "a composed review, a composite or a narrator (rule 13)",
        "a confession that reviews, tests or results are not on file (rule 12)",
        "a request for proof inside the copy",
      ],
      block_types: ["paragraph", "testimonial"],
    },
    {
      id: "offer_line",
      name: "Price, guarantee and what arrives",
      job: "Give him the last facts he needs to decide, where the platform lets the copy carry them: the guarantee as one positive promise in the seller's words, what arrives and where, and the price as a plain fact beside the result or the dearer thing. Left out where the marketplace shows them elsewhere or forbids them in the listing.",
      band_words: [8, 50],
      must: [
        "only terms the offer block holds, with their ledger IDs",
        "the guarantee as one plain promise with its reason, in the seller's words (rule 16)",
        "the price once, after the value, without apology, beside the result or the dearer thing (rule 16)",
        "what arrives; when, only if the time is itself a reason to act (rule 18)",
      ],
      must_not: [
        "\"Guaranteed\" alone with nothing behind it; a guarantee's conditions or mechanics",
        "a price frame without the full price",
        "promotional words a marketplace forbids in a listing (\"best seller\", \"free shipping\")",
        "a deadline or a stock fact the offer block does not hold",
        "legal boilerplate",
      ],
      optional: true,
      block_types: ["guarantee", "price", "paragraph"],
    },
    {
      id: "specs",
      name: "Specs in their own block",
      job: "Give every fact he needs to decide, as a labeled list, so no missing fact gives him an excuse to wait: name and item number, materials, dimensions, weight, contents, care, compatibility and origin, as the ledger holds them.",
      band_words: [10, 80],
      must: [
        "every spec from the ledger, with its ID",
        "a labeled list: name and number, materials, dimensions, weight, contents, care, compatibility, origin, as on file",
        "each number with its unit as the ledger gives it",
        "plain labels a buyer reads (weight, not mass)",
      ],
      must_not: [
        "benefits mixed into specs",
        "a spec the ledger does not hold",
        "an adjective in a spec line",
        "a label a cold buyer would ask about with no plain word beside it (rule 40)",
      ],
      block_types: ["numbered", "label", "paragraph"],
    },
  ],
  draft_order: ["specs", "offer_line", "proof_line", "bullets", "lead", "name_tag"],
  lead_variants: 0,
  skim_path_block_types: ["headline", "deck", "label", "price", "guarantee"],
  hard_gates: ["product.benefit_bullets>=3", "product.benefit_bullets<=5", "page.no_markdown_headings"],
  cadence_floor_cv: 0.7,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Product description",
};
