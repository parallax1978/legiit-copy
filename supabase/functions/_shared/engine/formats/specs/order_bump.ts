import type { FormatSpec } from "../spec.ts";

/**
 * A checkbox on the order form, after the card fields and before the button, where the buyer has already decided
 * (docs/04 Section 9, Order bump; rules 38 to 40). The masters' shape: a first-person checkbox line with the thing
 * and its price, then two or three sentences that say what it is in plain words and how it makes the thing he is
 * buying work faster or easier, as a cause; the reason it is only here is an offer term or it is left out; a value
 * figure or a buyer count needs a ledger row. Never pre-checked; one bump. Every example a writer could copy comes
 * from another trade.
 */
export const order_bump: FormatSpec = {
  id: "order_bump",
  name: "Order bump",
  family: "commerce",
  description: "A checkbox on the order form, after the card fields and before the button, where the buyer has already decided. It sells one small thing that makes the thing he is buying work faster or easier, in the time it takes to read a checkout line: a first-person checkbox line with the thing and its price, then two or three sentences. Priced below the main item as the offer block sets it (20-40% of a paid front end is the starting value; a free-plus-shipping front end has no ratio). Never pre-checked; one bump.",
  length_band_words: [30, 80],
  sections: [
    {
      id: "checkbox_line",
      name: "Checkbox line",
      job: "The checkbox line in the buyer's voice, bold: yes, add the thing to my order for its price. The thing is named by what it is, in his words. It may be the question he answers by ticking the box.",
      band_words: [6, 16],
      must: [
        "starts with Yes, in the first person (Yes, add the audio version to my order)",
        "names the thing and the price, the price with a ledger ID",
        "the thing named by what it is, in words a ten-year-old knows (rule 40)",
        "priced below the main item as the offer block sets it (20-40% of a paid front end is the starting value)",
      ],
      must_not: [
        "a same-priced bump",
        "an unrelated product",
        "a pre-checked box",
        "a second checkbox",
        "brackets or a placeholder in the line",
        "a label from the product's screens, or a term a cold reader would ask about",
      ],
      block_types: ["label", "paragraph"],
    },
    {
      id: "body",
      name: "Two or three sentences",
      job: "Two or three sentences: what it is, in plain words; how it makes the thing he is buying work faster or easier, as a cause; why the price is only here, when the offer block says so. If it needs more than three sentences, it is the wrong bump.",
      band_words: [20, 65],
      must: [
        "what it is, in one plain sentence a friend would use (rule 38)",
        "how it makes the main purchase work faster or easier, as a cause (the audio goes in the car; the workbook has the exercises laid out)",
        "the ease of having it with the main thing, as a picture (the audio playing on the drive), never an adjective (rule 39)",
        "why only here, only when the offer block says so",
        "words a ten-year-old knows; nothing a cold reader would ask about (rule 40)",
      ],
      must_not: [
        "a fourth sentence",
        "bullets",
        "a second product",
        "invented scarcity; \"you'll never see this offer again\" unless the offer block says so",
        "a value claim (\"a $257 value\") with no ledger basis",
        "a count of buyers who take it (\"63% choose this\") with no ledger count",
        "a question the body answers itself (tell 3)",
        "a speed number or a time the ledger does not hold (the speed is what the thing does)",
        "a lesson in his trade; the thing's own labels",
      ],
      block_types: ["paragraph"],
    },
  ],
  draft_order: ["body", "checkbox_line"],
  lead_variants: 0,
  skim_path_block_types: ["label", "price"],
  hard_gates: ["order_bump.words<=80", "order_bump.sentences<=4", "order_bump.has_price", "page.no_markdown_headings"],
  cadence_floor_cv: 0.7,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Order bump",
};
