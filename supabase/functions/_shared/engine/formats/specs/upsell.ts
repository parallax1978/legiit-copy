import type { FormatSpec } from "../spec.ts";

/**
 * Shown right after a purchase, while the order is open and the card is on file (docs/04 Section 9, Upsell / OTO;
 * rules 38 to 40). The buyer said yes once; the page gets the second yes without selling him on the seller again.
 * The masters' shape: the record of the sale keeps the order open (never a thank-you that closes the loop), one or
 * two sentences make him feel the next problem the purchase creates, one offer is introduced in a plain sentence
 * with the one part that produces the result and one specific beside it, the reason the price is only here is an
 * offer term, the price comes once after the value, the Yes is in his voice and the No is plain and near it. One
 * offer on the page; the downsell is its own page. Every example a writer could copy comes from another trade.
 */
export const upsell: FormatSpec = {
  id: "upsell",
  name: "Upsell / one-time offer",
  family: "page",
  description: "Shown right after a purchase, while the order is open and the card is on file. The buyer said yes once; this page gets a second yes without selling him on the seller again. One line keeps the order open and names what he bought. One or two sentences make him feel the next problem the purchase creates. One offer is the shortest path to it: the add-on in one plain sentence, the one part that produces the result, one specific beside it, the true reason the price is only here, the stack as plain lines, the price once, a one-line guarantee, a Yes button in his voice and a plain No near it. The downsell is its own page. 300-900 words or a 3-5 minute video; 1x-3x the first purchase as the offer block sets it.",
  length_band_words: [300, 900],
  sections: [
    {
      id: "confirmation",
      name: "One line that keeps the order open",
      job: "Confirm the decision and keep the order open, in one line. It names what he bought as the record, then the result he bought it for as a picture, and says one decision remains before he reaches his download or login.",
      band_words: [5, 30],
      must: [
        "one line, of one or two short sentences",
        "the record of the sale as a sentence of its own (You ordered the knife set); a record is not his history told to him (Section 7.1, tell 14 exempts it)",
        "the result he bought it for in the next sentence, as a picture he feels (dinner on the table faster), never as an adjective and never tacked onto the record as why he ordered (rule 39)",
        "says the order is open until he decides here, when the page sits before the download or login page",
      ],
      must_not: [
        "\"WAIT!\" without a reason",
        "re-selling the first product",
        "\"Thank you for your order\" or \"your order is complete\" (it closes the buying loop)",
        "a paragraph of congratulations, or flattery about him (\"you're an action-taker\")",
        "a teaser that withholds the offer (\"one thing you should know about\")",
        "the add-on named or pointed at (\"it\", \"this\") before the offer section introduces it (rule 38)",
      ],
      block_types: ["preheadline", "headline", "paragraph"],
    },
    {
      id: "bridge",
      name: "Bridge to the next problem",
      job: "Make him feel the next problem the purchase creates, as a cause he accepts on sight (a new car needs fuel). One or two sentences in his own nouns. For a physical product, say instead why more of the same at a discount is the next thing.",
      band_words: [40, 150],
      must: [
        "the next problem follows from the first purchase, stated as a cause",
        "feeling first: the moment he meets the problem with the thing he just bought (the grill lit, nothing to put on it), said as the thing itself, never as an adjective about it (rule 39)",
        "a statement, never a question the page answers",
        "one or two sentences, in words a ten-year-old knows (rule 40)",
      ],
      must_not: [
        "re-selling the first product",
        "melodrama",
        "\"But here's the thing\" or any windup (tell 4)",
        "a scene of his day invented for him (a call at 7:42 while he is at the game): Section 7.1, tell 14",
        "flattery as the bridge (\"you proved you're an action-taker\")",
        "\"Let me ask you a question\", or a question the page answers itself (tell 3)",
        "a lesson in how his trade works; a tool or a score as the actor (tell 17)",
      ],
      block_types: ["paragraph", "crosshead"],
    },
    {
      id: "offer",
      name: "The offer as the shortest path",
      job: "Introduce the add-on in one plain sentence a friend would use: what it is and what it does for him. Then the one part that produces the next result, said as how it does it, in a sentence. The rest is named in the stack, never toured.",
      band_words: [60, 250],
      must: [
        "the add-on introduced in one plain sentence with its name, before any of its own terms: what it is and what it does for him (rule 38)",
        "the one part that yields the result, with how it does it, in a sentence (the sharpener puts the edge back in one pass)",
        "the next result promised plainly, at full strength, in his nouns, right after the plain sentence (rule 8)",
        "ties to the first purchase's result",
        "one offer on the page: no A or B, no quantity menu",
        "plain words, under the eighth grade: no metric's name, no term from a tool, no label from the add-on's screens, nothing a cold reader would ask about (rule 40)",
      ],
      must_not: [
        "stack before the mechanism",
        "a feature tour, or a numbered how-it-works tour",
        "two options or a menu (the downsell is its own page)",
        "a speed claim with a number or a time the ledger does not hold; a wait said to push him (rule 18)",
        "the add-on pointed at (\"it\", \"this\") before its plain sentence; its own labels (plan names, credits, step names)",
        "a lesson in his trade; a technical input explained",
        "the add-on's own work sent elsewhere: do it by hand, hire someone (tell 19)",
        "emoji bullets; label-and-colon bullets",
      ],
      block_types: ["crosshead", "paragraph", "bullets"],
    },
    {
      id: "proof",
      name: "One specific beside the one part",
      job: "Make the next result believed with one specific beside the one part: the demonstration he will run with the add-on, told as what he sees first; a checkable fact about it (what it holds, how it was built); the maker's own use from the story inventory; or a documented result with its ledger ID. With no result on file, the first three carry it at full strength.",
      band_words: [15, 80],
      must: [
        "one specific, with its ledger ID when it is a number, a name or a result",
        "right after the claim it proves (rule 9)",
        "a number on a result only from the ledger; with none, the demonstration, the checkable fact or the maker's own use, said in the indicative (rule 8)",
      ],
      must_not: [
        "a run of testimonials, or a testimonial the ledger does not hold",
        "a count of buyers who upgraded with no ledger count",
        "a line that says what is not on file, or asks for proof to be added",
      ],
      optional: true,
      block_types: ["paragraph", "testimonial"],
    },
    {
      id: "reason_here",
      name: "The true reason it is only here",
      job: "Say the true reason the price or the bundle exists only on this page, from the offer block, as a cause he can check. With no reason on file the section is left out.",
      band_words: [20, 80],
      must: [
        "a reason from the offer block: the order is open and the card is on file, so there is no second checkout; the base is already paid, so the add-on costs its marginal price; or a real price elsewhere, with its ledger row",
        "told as a cause tied to the order moment (because your order is still open), in one or two sentences",
      ],
      must_not: [
        "\"disappears forever\" unless the offer block says the offer never returns",
        "resetting timers; invented scarcity",
        "flattery as the reason (\"only for action-takers\")",
        "\"you'll only see it here\" with nothing behind it",
      ],
      optional: true,
      block_types: ["paragraph"],
    },
    {
      id: "stack_price",
      name: "Stack and price",
      job: "What arrives, as plain lines of what each part lets him do, then the price once, after the value, with the offer block's reason for the deal.",
      band_words: [60, 200],
      must: [
        "offer identical to the order form",
        "each part as a plain line of what it lets him do or stop doing; a value figure only with a ledger basis",
        "price once, after the one part, with the offer block's reason for the deal (rule 17)",
        "plain words a friend would use for each part (rule 40)",
      ],
      must_not: [
        "fabricated stack values (\"(worth $257)\" with no ledger basis)",
        "apology for the price",
        "price before value",
        "\"FREE\" on a part the price pays for",
        "a strikethrough former price with no former-price row; a bracket or a placeholder in a price",
        "emoji bullets; label-and-colon bullets (plain bold lead-ins at most)",
      ],
      block_types: ["crosshead", "bullets", "recap", "price"],
    },
    {
      id: "guarantee",
      name: "One-line guarantee",
      job: "One line he can repeat: the offer block's guarantee as a promise in the speaker's words, with the risk on the seller.",
      band_words: [10, 50],
      must: [
        "the offer block's sentence, or the first purchase's guarantee extended when the offer block says so",
        "denominated, worded as a promise (sharp for a year, or your money back)",
      ],
      must_not: [
        "qualifiers that gut it",
        "a guarantee the offer block does not hold",
        "a reworded guarantee",
      ],
      block_types: ["guarantee"],
    },
    {
      id: "yes_button",
      name: "Yes button in the buyer's voice",
      job: "The button as the buyer's own sentence: yes, add the thing to my order, with the thing or the benefit named.",
      band_words: [3, 15],
      must: [
        "first person (Yes, add the sharpener to my order)",
        "states the benefit or the thing",
      ],
      must_not: [
        "\"Submit\"",
        "\"Buy now\" alone",
        "\"Upgrade\" alone",
        "\"your\" in the button",
      ],
      block_types: ["cta", "button"],
    },
    {
      id: "no_link",
      name: "Plain No link",
      job: "A plain No near the Yes button, so he does not leave thinking the order is done. It names the thing declined and says nothing about him.",
      band_words: [2, 25],
      must: [
        "plain and visible, near the Yes button",
        "names the thing declined, when it names anything (No thanks, I'll pass on the audiobook)",
      ],
      must_not: [
        "a shaming decline (\"No, I don't want to succeed\")",
        "a hidden link",
        "a decline that argues either way: no verdict on him, no reward for leaving",
      ],
      block_types: ["cta"],
    },
  ],
  draft_order: ["stack_price", "guarantee", "yes_button", "no_link", "reason_here", "offer", "proof", "bridge", "confirmation"],
  lead_variants: 0,
  skim_path_block_types: ["preheadline", "headline", "crosshead", "recap", "price", "guarantee", "button", "cta"],
  hard_gates: ["upsell.cta_count>=1", "upsell.decline_present", "upsell.price_position_share>=0.4", "page.no_markdown_headings"],
  cadence_floor_cv: 0.7,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Upsell / OTO",
};
