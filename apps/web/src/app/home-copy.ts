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
        "type": "headline",
        "text": "Your offer in. Your sales page, emails and ads out.",
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
        "text": "For course sellers, SaaS and service businesses, and the freelancers and agencies who write for them [[L:12e76023-0232-4866-9dd7-8a31ee659be9]]: a writer that reads your offer's pages and researches your market before it writes.",
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
        "text": "Nothing is charged during early access [[L:816b48f2-2e37-4829-8e39-337553e236a1]]. Enter your email, get a sign-in link (no password), then save your first offer [[L:defb52fb-f8bf-4612-807c-9760fac2ed2d]]. From there, you write your first piece.",
        "items": null,
        "meta": null
      },
      {
        "type": "button",
        "text": "Write your first piece free",
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
        "text": "I'm Chris M. Walker; I founded Legiit and built Legiit Copy [[L:a72985e9-6a7b-4351-8f12-ee9da1bcea8b]] to write for one thing: the offer you save.",
        "items": null,
        "meta": null
      },
      {
        "type": "crosshead",
        "text": "Your offer goes in once: pages, documents, terms",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "A prompt like “write a sales page for my product” [[L:26bd90a5-e24f-4476-9bc9-1cf0da795f86]] starts from nothing. This starts from your own pages, refund and terms included. Paste a URL and it reads the refund, terms, pricing and FAQ pages on that site too; a PDF, DOCX, TXT or Markdown file or a typed description works as well. It asks what your guarantee is. Then pick the piece (a sales page, an email or a sequence, an ad) and its purpose, length, call to action and deadline [[L:ae6a0cb6-6a71-4fc6-b57a-2affc463fff6]].",
        "items": null,
        "meta": null
      },
      {
        "type": "crosshead",
        "text": "It reads your market before it writes",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "Research runs two passes: what buyers are trying to buy, in their own words, then what they got and what they complain about [[L:d8c4c066-e8ef-403f-a28b-6d71b2df6c75]]. Every quote is kept with its source [[L:2a782089-d3e3-47f4-9aaa-148a25d028af]]. The draft is written from that research.",
        "items": null,
        "meta": null
      },
      {
        "type": "crosshead",
        "text": "It picks the argument before it writes a sentence",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "Before any prose, it develops candidate arguments and selects one [[L:3b497c07-8cae-47e2-8ca9-e2a0ead7fdfb]]. Want a different angle? Click Try another angle and it drops the winner and writes the piece again [[L:708a5969-5921-4ca4-b1db-358cc2321f25]].",
        "items": null,
        "meta": null
      },
      {
        "type": "crosshead",
        "text": "The sources and flags sit beside the draft",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "Beside the draft you see the chosen argument and why, the research sources, the factual flags and the open questions [[L:aac0d8c3-71e8-42eb-98d5-ca065a04db8c]]. Any claim without a source is flagged beside the draft with the rule and a suggested rewrite; you keep, rewrite or drop it [[L:088f5b44-e43f-4c4c-870f-f997e12d256b]]. If a draft states a fact none of your sources hold, Legiit Copy stops it there [[L:d084dc92-5a57-4eaa-ac4d-7437027cb794]].",
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
        "text": "Legiit, the marketplace I started in 2018 [[L:a72985e9-6a7b-4351-8f12-ee9da1bcea8b]], has processed 1M+ orders [[L:1f6ae968-6b06-4a3b-9148-20001ddb4587]] and served 100K+ businesses [[L:0b872e7b-9912-4556-a58f-d7d12037c699]]. Legiit Copy comes from the same team as Legiit Leads and Legiit Keywords [[L:a72985e9-6a7b-4351-8f12-ee9da1bcea8b]].",
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
        "text": "It writes from your buyers' words, and in your voice when you paste samples",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "The fear is copy that “sounds like everyone else's” [[L:bd15db87-97ab-4a31-b17c-6a5a7aa084de]]. Here the draft starts from your offer's pages and the market quotes research kept with their sources [[L:2a782089-d3e3-47f4-9aaa-148a25d028af]]. Paste samples of your own writing and it writes inside that voice [[L:2f16da88-8c22-42cd-8e40-416ce85feab8]]. A check flags the patterns that make copy read machine-written before you see a line [[L:95bbf92b-e328-416f-8f7e-6f547ecd453f]].",
        "items": null,
        "meta": null
      },
      {
        "type": "crosshead",
        "text": "A copy chief reads it before you do",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "One reviewer of another AI writer warns that the output “requires heavy editing” [[L:69c21ef5-6681-4f6c-9012-bf1b3138f79b]]. Here a separate review names the failing line and the fix [[L:3488f094-2db6-4c28-9d8b-762c1ad5d927]]. The writer revises on those notes, up to three rounds, before the piece reaches you [[L:d7a3ccdc-cc6e-4ad5-8fbd-f9442b0a84a1]]. What reaches you is the revised draft, with the remaining factual flags and open questions beside it [[L:aac0d8c3-71e8-42eb-98d5-ca065a04db8c]].",
        "items": null,
        "meta": null
      },
      {
        "type": "guarantee",
        "text": "Signing in and writing is free during early access. Nothing is charged, so there is nothing to refund [[L:816b48f2-2e37-4829-8e39-337553e236a1]].",
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
        "text": "Enter your email, get a sign-in link with no password, save your first offer [[L:defb52fb-f8bf-4612-807c-9760fac2ed2d]] and write your first piece. Nothing is charged during early access [[L:816b48f2-2e37-4829-8e39-337553e236a1]].",
        "items": null,
        "meta": null
      },
      {
        "type": "button",
        "text": "Write your first piece free",
        "items": null,
        "meta": null
      }
    ]
  }
];

/** The run's own review, as the app reported it. */
export const review = {
  /** what a blind reader on a second model said the page promises, in one sentence */
  coldRead: "Save your offer once, and this free tool will research your market and write sales copy from it, showing its sources and flagging unsupported claims, so you edit less than with a generic AI prompt.",
  /** the copy chief's verdict label as the app shows it */
  verdict: "Needs work",
  /** the gate it stopped at, or null when all four passed */
  stoppedAt: null as string | null,
  /** flags still waiting on the owner, and flags the owner decided (keep, rewrite or drop) */
  flagsPending: 0,
  flagsDecided: 11,
  tellsPer300: 4.22,
  words: 589,
  /** the argument it chose, before a word was written */
  argument: "Your offer in. Your sales page out.",
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
