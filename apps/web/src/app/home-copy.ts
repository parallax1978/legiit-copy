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
        "text": "Direct response copy for the offer you save",
        "items": null,
        "meta": null
      },
      {
        "type": "headline",
        "text": "AI sales copy still needs a hard edit. Here, the edit happens before you see it.",
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
        "text": "For course sellers, SaaS and service businesses, and the freelancers and agencies who write their copy [[L:12e76023-0232-4866-9dd7-8a31ee659be9]]. A separate AI copy chief reads every draft and names the failing line and the fix [[L:3488f094-2db6-4c28-9d8b-762c1ad5d927]], and the writer revises on those notes, up to three rounds, before you get it [[L:d7a3ccdc-cc6e-4ad5-8fbd-f9442b0a84a1]].",
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
        "text": "Enter your email and a sign-in link arrives in your inbox, no password. Then you save your first offer. [[L:defb52fb-f8bf-4612-807c-9760fac2ed2d]]",
        "items": null,
        "meta": null
      },
      {
        "type": "button",
        "text": "Sign in with my email",
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
        "text": "I'm Chris M. Walker. I founded Legiit, which has been running since 2018 [[L:a72985e9-6a7b-4351-8f12-ee9da1bcea8b]]. You've tried ChatGPT or an AI writer on your sales copy [[L:4c6d3f0a-7d7e-4538-a2fc-0e6737e6b1bd]], and you've seen the kind of line one Jasper reviewer wrote: “It requires heavy editing for quality output, so be advised.” [[L:69c21ef5-6681-4f6c-9012-bf1b3138f79b]] Legiit Copy runs its own review inside the app: a copy chief names the failing line and the fix [[L:3488f094-2db6-4c28-9d8b-762c1ad5d927]], and the writer revises, up to three rounds, before the draft reaches you [[L:d7a3ccdc-cc6e-4ad5-8fbd-f9442b0a84a1]].",
        "items": null,
        "meta": null
      },
      {
        "type": "crosshead",
        "text": "An AI copy chief points at the line that fails",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "Every note names the line from your draft that fails and the fix [[L:3488f094-2db6-4c28-9d8b-762c1ad5d927]]. The copy chief reads every draft against a written standard and stops at the first gate it fails [[L:3488f094-2db6-4c28-9d8b-762c1ad5d927]]. Over-explaining gets marked down [[L:3488f094-2db6-4c28-9d8b-762c1ad5d927]].",
        "items": null,
        "meta": null
      },
      {
        "type": "crosshead",
        "text": "A second AI reads your page cold before you do",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "A second, different AI model gives it a cold read first, as a reader who has not seen the brief [[L:ae5fd030-11b0-400d-95e3-d1597404315c]].",
        "items": null,
        "meta": null
      },
      {
        "type": "crosshead",
        "text": "You keep, rewrite or drop every flagged claim",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "A factual review shows each problem as the line, the rule it breaks and a rewritten line. You keep it, rewrite it or drop it; Legiit Copy never quietly softens a claim behind your back [[L:088f5b44-e43f-4c4c-870f-f997e12d256b]]. The writer works under one rule: a claim is never bigger than its proof, and the proof sits within two sentences of it [[L:0b1565a6-2cdc-4cf7-a2a7-10af66b6984d]].",
        "items": null,
        "meta": null
      },
      {
        "type": "crosshead",
        "text": "Your market's own words are gathered before a line is written",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "Research runs two passes. First: what people are trying to buy, in their own words. Then: what they got, and what they complain about [[L:d8c4c066-e8ef-403f-a28b-6d71b2df6c75]]. Only after that is the argument chosen, in its own step, before any prose is written [[L:3b497c07-8cae-47e2-8ca9-e2a0ead7fdfb]]. One writer blames generic output on “the same lazy prompt everyone else uses.” [[L:32768653-c88f-4d4d-8f75-bc549aa915b8]] Here, research and the choice of argument each run as their own step before any prose is written [[L:3b497c07-8cae-47e2-8ca9-e2a0ead7fdfb]].",
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
        "text": "Legiit Copy is new. No blind evaluation has been run yet, so I won't tell you it sells better than ChatGPT or anything else [[L:e61424d3-67c9-4471-9bd2-5e1442f87639]]. What I will tell you is that every draft is reviewed and revised, up to three rounds, before it reaches you [[L:3488f094-2db6-4c28-9d8b-762c1ad5d927]] [[L:d7a3ccdc-cc6e-4ad5-8fbd-f9442b0a84a1]]. What's left for you is what only you can decide [[L:d41866f1-c1ec-4059-b934-d082ce3187f5]].",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "Behind the product is Legiit, the company I founded, running since 2018 [[L:a72985e9-6a7b-4351-8f12-ee9da1bcea8b]]. Its marketplace at legiit.com shows 1M+ orders processed [[L:1f6ae968-6b06-4a3b-9148-20001ddb4587]] and 100K+ businesses served [[L:0b872e7b-9912-4556-a58f-d7d12037c699]], as of 25 October 2026. Those figures describe the marketplace, not Legiit Copy [[L:13fa85ab-7961-4396-8cd1-45142464e0f1]].",
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
        "text": "A mechanical check flags the patterns that give machine copy away before you read the draft",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "One seller of AI writing prompts names the fear this way: “Robotic, soulless writing that screams ‘I used ChatGPT!’” [[L:7225e431-159b-4791-a75a-02c59fa9a270]] Paste samples of your own writing, and the copy for that offer is written within the voice profile the app builds from them [[L:2f16da88-8c22-42cd-8e40-416ce85feab8]]. Then a mechanical check flags what gives machine copy away: bold-label bullets, placeholders, leftover assistant notes and any authority with no source behind it [[L:95bbf92b-e328-416f-8f7e-6f547ecd453f]].",
        "items": null,
        "meta": null
      },
      {
        "type": "crosshead",
        "text": "Nothing is charged while Legiit Copy is in early access",
        "items": null,
        "meta": null
      },
      {
        "type": "paragraph",
        "text": "One reviewer of a paid AI writer put the other worry plainly: “I don't recommend this app, it is expensive and not worth it. Better use ChatGPT4 or even 3.5” [[L:e97e9b6f-8e06-46cf-93ce-cc636ee1689a]]. Legiit Copy has no published price. Signing in and writing are free during early access [[L:816b48f2-2e37-4829-8e39-337553e236a1]], and sign-in asks for your email, with no password [[L:defb52fb-f8bf-4612-807c-9760fac2ed2d]].",
        "items": null,
        "meta": null
      },
      {
        "type": "guarantee",
        "text": "Nothing is charged during early access, so there is nothing to refund. [[L:816b48f2-2e37-4829-8e39-337553e236a1]]",
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
        "text": "Enter your email and a sign-in link arrives in your inbox, no password. The next thing you do is save your first offer. [[L:defb52fb-f8bf-4612-807c-9760fac2ed2d]]",
        "items": null,
        "meta": null
      },
      {
        "type": "button",
        "text": "Sign in with my email",
        "items": null,
        "meta": null
      }
    ]
  }
];

/** The run's own review, as the app reported it. */
export const review = {
  /** what a blind reader on a second model said the page promises, in one sentence */
  coldRead: "Sign in free and the AI will write your sales copy, and have it checked and revised by a second AI up to three times, so you get a cleaner draft than a raw ChatGPT output, though it hasn't been proven to sell better.",
  /** the copy chief's verdict label as the app shows it */
  verdict: "Not ready",
  /** the gate it stopped at, or null when all four passed */
  stoppedAt: "the claims" as string | null,
  /** flags still waiting on the owner, and flags the owner decided (keep, rewrite or drop) */
  flagsPending: 0,
  flagsDecided: 14,
  tellsPer300: 0,
  words: 682,
  /** the argument it chose, before a word was written */
  argument: "The editing happens before you see it",
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
