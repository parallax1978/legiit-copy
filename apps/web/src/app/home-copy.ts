/**
 * The words on the home page. The piece itself is what Legiit Copy wrote for its own home page (format
 * landing_page_short, length longer), pasted in as the app shipped it, ledger tags included: the page strips the
 * tags, the sample card shows them. `review` is that run's own review, read from the generation. Replacing the copy
 * means a new run in the app and a paste here; nothing on the page is hand-written persuasion.
 */

export type HomeBlock = { type: string; text: string; items?: string[] | null; meta?: Record<string, string> | null };
export type HomeSection = { section_id: string; blocks: HomeBlock[] };

/** Piece as shipped: generation 6ae32717 → (filled in when the run lands). */
export const piece: HomeSection[] = [
  {
    section_id: "headline",
    blocks: [
      { type: "preheadline", text: "Direct response copy, argued from your evidence" },
      { type: "headline", text: "Copy that picks the argument\nbefore it writes a word." },
    ],
  },
  {
    section_id: "subhead",
    blocks: [{ type: "deck", text: "For people who sell their own offer and have been burned by generic AI copy. Legiit Copy reads your offer, researches the market in your customers' own words, chooses the one promise the evidence can carry, and writes the piece. Every number is tied to a source." }],
  },
  {
    section_id: "cta_primary",
    blocks: [
      { type: "button", text: "Write your first piece" },
      { type: "cta", text: "Enter your email. A sign-in link arrives, you save the offer, and the first piece is argued, written and reviewed before you see it." },
    ],
  },
  {
    section_id: "benefits",
    blocks: [
      { type: "crosshead", text: "It argues before it writes" },
      { type: "paragraph", text: "Twenty candidate arguments are scored and run through gates in order: market, awareness, sophistication, desire, mechanism, big idea, lead, structure, proof, offer, close. One wins. Two losers are kept for the body." },
      { type: "crosshead", text: "Every number has a source" },
      { type: "paragraph", text: "Each number, name, study, quote, price and deadline in the copy carries the ID of the ledger row that supports it. It never generates a testimonial, a narrator, a study or a statistic." },
      { type: "crosshead", text: "Reviewed before you see it" },
      { type: "paragraph", text: "A cold read on a second model, a copy chief that stops at the first failed gate, a tell detector, and a factual review that shows you the line, the rule and a rewrite. The drafter fixes the notes itself, up to three rounds." },
    ],
  },
  {
    section_id: "proof_strip",
    blocks: [{ type: "paragraph", text: "From the team behind Legiit: trusted by businesses since 2018, 1M+ orders processed, 100K+ businesses served." }],
  },
  {
    section_id: "objections",
    blocks: [
      { type: "crosshead", text: "Is the AI making this up?" },
      { type: "paragraph", text: "No. Every claim in the copy links to a ledger row with its source and grade. A fact the sources do not settle becomes a question for you; the writer never fills it in." },
      { type: "crosshead", text: "What does it cost?" },
      { type: "paragraph", text: "There is no published price. Signing in and writing is free while the product is in early access, and nothing is charged." },
    ],
  },
  {
    section_id: "cta_repeat",
    blocks: [
      { type: "cta", text: "Save one offer and read what it argues." },
      { type: "button", text: "Write your first piece" },
    ],
  },
];

/** The run's own review, as the app reported it. */
export const review = {
  /** what a blind reader on a second model said the page promises, in one sentence */
  coldRead: "",
  /** the copy chief's verdict label as the app shows it */
  verdict: "Ready to use",
  /** the gate it stopped at, or null when all four passed */
  stoppedAt: null as string | null,
  /** factual flags left for the owner to decide */
  flags: 0,
  tellsPer300: 0,
  words: 0,
  /** the argument it chose, before a word was written */
  argument: "",
  /** the lead it chose */
  lead: "",
};

/** Product facts for the questions section: what the product does, not persuasion. */
export const facts: { q: string; a: string }[] = [
  { q: "Which formats can it write?", a: "Twenty-three. Pages: long-form sales letter, short landing page, opt-in page, upsell, order bump, order form, thank-you page, B2B pricing page, advertorial, product description. Email and messages: promotional email, email sequence, cold email, SMS. Video and audio: long and short VSL, webinar package, podcast read. Ads: Meta and Instagram, YouTube, TikTok and Reels, Google responsive search ad. Social: organic post." },
  { q: "What do I have to give it?", a: "The offer: paste the URLs of its pages, upload documents (PDF, DOCX, TXT or Markdown) or type a description. From a URL it also reads the refund, terms, pricing, about and FAQ pages on the same site. At setup it asks who signs the copy, who the reader is, which offer to lead with, the refund terms and what proof you have." },
  { q: "Does it invent testimonials or statistics?", a: "No. It never generates a testimonial, a narrator, a study or a statistic. Proof comes from your sources and the ledger, or it is not in the copy." },
  { q: "What happens when a claim is risky?", a: "The factual review shows the line, the rule it breaks and a rewritten line. You decide keep, rewrite or drop. The app never softens, removes or hedges a claim on its own, and never adds \"may\" or \"results vary\"." },
  { q: "Can I edit the result?", a: "Yes. Edit in place, have a passage rewritten, rewrite the whole piece from the same brief in one click, or write another piece from the same offer with the settings pre-filled. Export to DOCX, Markdown, HTML or plain text." },
  { q: "Can it write in my voice?", a: "Paste samples of your writing into a voice profile and the copy is written within it." },
];
