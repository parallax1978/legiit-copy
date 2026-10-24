import type { FormatSpec } from "../spec.ts";

export const order_bump: FormatSpec = {
  id: "order_bump",
  name: "Order bump",
  family: "commerce",
  description: "A checkbox on the order form. 30-80 words at 20-40% of the main price; related to the main purchase and priced below it.",
  length_band_words: [30, 80],
  sections: [
    { id: "checkbox_line", name: "Checkbox line", job: "Bolded \"Yes! Add [thing] for only $X\" beside the checkbox", band_words: [6, 16], must: ["starts with Yes", "names the thing and the price", "price 20-40% of the main price with a ledger ID"], must_not: ["a same-priced bump", "an unrelated product"], block_types: ["label", "paragraph"] },
    { id: "body", name: "Two or three sentences", job: "What it is; how it makes the main purchase work faster; why only here, if true", band_words: [20, 65], must: ["what it is", "how it makes the main purchase work faster", "why only here only if true"], must_not: ["a fourth sentence", "bullets", "a second product", "invented scarcity"], block_types: ["paragraph"] },
  ],
  draft_order: ["body", "checkbox_line"],
  lead_variants: 0,
  skim_path_block_types: ["label", "price"],
  hard_gates: ["order_bump.words<=80", "order_bump.sentences<=4", "order_bump.has_price", "page.no_markdown_headings"],
  cadence_floor_cv: 0.7,
  allow_emoji_bullets: false,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Order bump",
};
