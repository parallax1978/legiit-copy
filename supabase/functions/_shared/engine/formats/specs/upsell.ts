import type { FormatSpec } from "../spec.ts";

export const upsell: FormatSpec = {
  id: "upsell",
  name: "Upsell / one-time offer",
  family: "page",
  description: "Shown right after a purchase. Confirms the decision, names the next problem the purchase creates and offers the shortest path to it; 1x-3x the first purchase. 300-900 words or a 3-5 minute video.",
  length_band_words: [300, 900],
  sections: [
    { id: "confirmation", name: "One-line confirmation", job: "Confirm the first decision in one line so the buyer stays a buyer", band_words: [5, 30], must: ["one line", "names what they just bought"], must_not: ["\"WAIT!\" without a reason", "re-selling the first product"], block_types: ["preheadline", "headline", "paragraph"] },
    { id: "bridge", name: "Bridge to the next problem", job: "Name the problem the purchase creates and why it appears now", band_words: [40, 150], must: ["the next problem follows from the first purchase", "stated as a cause"], must_not: ["re-selling the first product", "melodrama", "\"But here's the thing\""], block_types: ["paragraph", "crosshead"] },
    { id: "offer", name: "The offer as the shortest path", job: "Name the thing and its mechanism in one sentence; show it is the shortest path to the next result", band_words: [60, 250], must: ["mechanism in one sentence", "ties to the first purchase's result"], must_not: ["stack before the mechanism", "feature tour"], block_types: ["crosshead", "paragraph", "bullets"] },
    { id: "reason_here", name: "The true reason it is only here", job: "State the real reason this price or bundle exists only on this page, or say nothing", band_words: [20, 80], must: ["reason is true and checkable"], must_not: ["\"disappears forever\"", "resetting timers", "invented scarcity"], optional: true, block_types: ["paragraph"] },
    { id: "stack_price", name: "Stack and price", job: "What is included, then the price once, after value", band_words: [60, 200], must: ["offer identical to the order form", "bonus values only with a ledger basis", "price once"], must_not: ["fabricated stack values", "apology", "price before value"], block_types: ["crosshead", "bullets", "recap", "price"] },
    { id: "guarantee", name: "One-line guarantee", job: "Denominated, repeatable", band_words: [10, 50], must: ["denominated"], must_not: ["qualifiers that gut it"], block_types: ["guarantee"] },
    { id: "yes_button", name: "Yes button stating the benefit", job: "First person, the benefit not the product", band_words: [3, 15], must: ["states the benefit"], must_not: ["\"Submit\"", "\"Buy now\" alone"], block_types: ["cta", "button"] },
    { id: "no_link", name: "Plain No link", job: "A plain decline that does not shame", band_words: [2, 25], must: ["plain and visible"], must_not: ["shaming decline (\"No, I don't want to succeed\")", "hidden link"], block_types: ["cta"] },
  ],
  draft_order: ["stack_price", "guarantee", "yes_button", "no_link", "reason_here", "offer", "bridge", "confirmation"],
  lead_variants: 0,
  skim_path_block_types: ["preheadline", "headline", "crosshead", "recap", "price", "guarantee", "button", "cta"],
  hard_gates: ["upsell.cta_count>=1", "upsell.decline_present", "upsell.price_position_share>=0.4", "page.no_markdown_headings"],
  cadence_floor_cv: 0.7,
  allow_emoji_bullets: false,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Upsell / OTO",
};
