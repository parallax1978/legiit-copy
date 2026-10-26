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
    "section_id": "headline",
    "blocks": [
      {
        "type": "preheadline",
        "text": "From Chris M. Walker, founder of Legiit [[L:a72985e9-6a7b-4351-8f12-ee9da1bcea8b]]",
        "items": null,
        "meta": null
      },
      {
        "type": "headline",
        "text": "Better sales copy than your copywriter or ChatGPT [[L:980b0ae7-82d5-4020-84f6-9b7769c4d457]]. Your first piece is free [[L:816b48f2-2e37-4829-8e39-337553e236a1]].",
        "items": null,
        "meta": null
      }
    ]
  },
  {
    "section_id": "subhead",
    "blocks": [
      {
        "type": "deck",
        "text": "For course sellers, SaaS and service businesses, and the freelancers who write for them [[L:12e76023-0232-4866-9dd7-8a31ee659be9]]. Your offer in. Your sales page, emails and ads out [[L:ae6a0cb6-6a71-4fc6-b57a-2affc463fff6]].",
        "items": null,
        "meta": null
      }
    ]
  },
  {
    "section_id": "cta_primary",
    "blocks": [
      {
        "type": "cta",
        "text": "Enter your email; a sign-in link arrives, no password [[L:defb52fb-f8bf-4612-807c-9760fac2ed2d]]. Nothing is charged [[L:816b48f2-2e37-4829-8e39-337553e236a1]].",
        "items": null,
        "meta": null
      },
      {
        "type": "button",
        "text": "Write my first piece free",
        "items": null,
        "meta": null
      }
    ]
  },
  {
    "section_id": "benefits",
    "blocks": [
      {
        "type": "paragraph",
        "text": "I'm Chris M. Walker, founder of Legiit [[L:a72985e9-6a7b-4351-8f12-ee9da1bcea8b]]. I built Legiit Copy to write direct response copy for an offer you sell, and nothing else.",
        "items": null,
        "meta": null
      },
      {
        "type": "crosshead",
        "text": "A piece that makes one case for your offer, start to finish",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "Marketing blogger Lilach Bullock says a one-prompt page comes out \"generic and full of soft, hedging language\" [[L:a41d2442-b0b0-40d7-b7e4-7c09bfd12010]]. Nothing in a single prompt decides why anyone should buy your offer. Legiit Copy decides that first. It weighs candidate arguments for your offer in a separate step and picks one before a line of prose exists [[L:3b497c07-8cae-47e2-8ca9-e2a0ead7fdfb]]. Just one. Every section after it is written to prove that case for your offer, not for offers in general.",
        "items": null,
        "meta": null
      },
      {
        "type": "crosshead",
        "text": "Copy that says it at full strength, with every fact tied to its source [[L:088f5b44-e43f-4c4c-870f-f997e12d256b]]",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "One marketer's verdict on an AI-written sales page: \"There are no verifiable details\" [[L:6e9f6c2a-18f2-4417-b910-99b1b5ac5fa0]]. Here every number, study, name, credential, quote, price and deadline in your copy is tied to the source it came from. A claim with no support gets flagged, with the rule and a rewrite [[L:088f5b44-e43f-4c4c-870f-f997e12d256b]]. You keep, rewrite or drop it; nothing gets quietly softened [[L:088f5b44-e43f-4c4c-870f-f997e12d256b]].",
        "items": null,
        "meta": null
      },
      {
        "type": "crosshead",
        "text": "A draft reviewed and revised before it reaches you [[L:d7a3ccdc-cc6e-4ad5-8fbd-f9442b0a84a1]]",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "One reviewer's verdict on a big AI writer: \"It requires heavy editing for quality output\" [[L:69c21ef5-6681-4f6c-9012-bf1b3138f79b]]. Here a copy chief review names the failing line and the fix [[L:3488f094-2db6-4c28-9d8b-762c1ad5d927]]. The writer revises, up to three rounds, before the piece reaches you [[L:d7a3ccdc-cc6e-4ad5-8fbd-f9442b0a84a1]].",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "That's my call, as the man who built it: it writes better sales copy than the copywriter you'd hire or a ChatGPT prompt [[L:980b0ae7-82d5-4020-84f6-9b7769c4d457]]. Don't take my word, and don't wait on live traffic to find out. Your first piece is free [[L:816b48f2-2e37-4829-8e39-337553e236a1]]. Set it beside the copy you have now.",
        "items": null,
        "meta": null
      }
    ]
  },
  {
    "section_id": "proof_strip",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Legiit Copy comes from Legiit, the marketplace I founded in 2018 [[L:a72985e9-6a7b-4351-8f12-ee9da1bcea8b]]. It has processed 1M+ orders [[L:1f6ae968-6b06-4a3b-9148-20001ddb4587]] and served 100K+ businesses [[L:0b872e7b-9912-4556-a58f-d7d12037c699]].",
        "items": null,
        "meta": null
      }
    ]
  },
  {
    "section_id": "objections",
    "blocks": [
      {
        "type": "crosshead",
        "text": "Written in your voice, then checked for machine patterns",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "The worry is copy that \"screams 'I used ChatGPT!'\" [[L:7225e431-159b-4791-a75a-02c59fa9a270]]. Paste samples of your own writing, and the copy for your offer is written within that voice profile [[L:2f16da88-8c22-42cd-8e40-416ce85feab8]]. A check then flags the patterns that read as machine-written: bold-label bullets, placeholders, leftover assistant notes [[L:95bbf92b-e328-416f-8f7e-6f547ecd453f]].",
        "items": null,
        "meta": null
      },
      {
        "type": "crosshead",
        "text": "Nothing to pay during early access",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "One reviewer called a dedicated AI copy tool \"expensive and not worth it\" next to ChatGPT [[L:e97e9b6f-8e06-46cf-93ce-cc636ee1689a]]. Here no price is published, and nothing is charged during early access [[L:816b48f2-2e37-4829-8e39-337553e236a1]].",
        "items": null,
        "meta": null
      },
      {
        "type": "guarantee",
        "text": "Nothing is charged, so there is nothing to refund [[L:816b48f2-2e37-4829-8e39-337553e236a1]].",
        "items": null,
        "meta": null
      }
    ]
  },
  {
    "section_id": "demo_offer",
    "blocks": []
  },
  {
    "section_id": "cta_repeat",
    "blocks": [
      {
        "type": "cta",
        "text": "Enter your email; a sign-in link arrives, no password [[L:defb52fb-f8bf-4612-807c-9760fac2ed2d]]. Save your offer, then watch each step on a timeline, research to final, as your first piece is written. Nothing is charged during early access [[L:816b48f2-2e37-4829-8e39-337553e236a1]].",
        "items": null,
        "meta": null
      },
      {
        "type": "button",
        "text": "Write my first piece free",
        "items": null,
        "meta": null
      }
    ]
  }
];

/** The run's own review, as the app reported it. */
export const review = {
  /** what a blind reader on a second model said the page promises, in one sentence */
  coldRead: "Give it your offer and it will write a free first piece of sales copy, built on one argument with every fact sourced and every unsupported claim flagged, so you can compare it with the copy you have now.",
  /** the copy chief's verdict label as the app shows it */
  verdict: "Needs work",
  /** the gate it stopped at, or null when all four passed */
  stoppedAt: null as string | null,
  /** flags still waiting on the owner, and flags the owner decided (keep, rewrite or drop) */
  flagsPending: 0,
  flagsDecided: 10,
  tellsPer300: 0,
  words: 567,
  /** the argument it chose, before a word was written */
  argument: "Judge it on your own offer, free.",
  /** market quotes the research kept, and the sources it read */
  quotes: 59,
  sources: 150,
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
