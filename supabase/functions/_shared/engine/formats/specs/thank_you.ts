import type { FormatSpec } from "../spec.ts";

/**
 * The page after an opt-in, or the last page of a checkout (docs/04 Section 9, Thank-you page; rules 38 to 40). The
 * masters' shape: one line says what he did, as the record, and where the thing is; one instruction makes it arrive
 * or get used, shown as what he will see; then the next step the offer block holds, tied to the promise just
 * accepted as the next problem the thing creates. A thank-you headline or a celebration costs the next sale, so the
 * confirmation is one line and the next ask comes soon after; with no next step on file the page ends on the
 * instruction. Every example a writer could copy comes from another trade.
 */
export const thank_you: FormatSpec = {
  id: "thank_you",
  name: "Thank-you page",
  family: "page",
  description: "The page after an opt-in, or the last page of a checkout. One line says it worked and where the thing is. One instruction makes the thing arrive or get used (open the email from a named sender, log in, download, add the date). Then the next step the offer block holds, tied to the promise just accepted: a low-ticket offer, the trial, the class he already owns, an application, or a referral ask with a mechanism. The confirmation is one line and the next ask comes soon after. With no next step on file the page ends on the instruction. 80-250 words with a next step; shorter without one.",
  length_band_words: [40, 250],
  sections: [
    {
      id: "confirmation",
      name: "Confirmation with where the thing is",
      job: "One line that says what he did, as the record (You're registered; your order went through), and where the thing is: the email from a named sender, the login, the download on this page, the post. When it arrives is a fact of delivery, never a push.",
      band_words: [10, 50],
      must: [
        "one line",
        "where the thing is, named (the email from a named sender, the login, the download link on this page)",
        "when it arrives, as a fact of delivery (today by email; ships the week of the 21st), never as a reason to act",
        "what he feels is the thing on its way: say it as the thing itself, the record and the first thing he will see, never an adjective about it (rule 39)",
      ],
      must_not: [
        "\"Success!\" alone",
        "a second subscription ask",
        "\"Thank you!\" or \"Confirmation\" as the headline",
        "a paragraph of congratulations, or flattery about him",
        "a celebration (confetti copy, his name said three times)",
        "a scene of his day invented for him (tell 14); the record is not that",
      ],
      block_types: ["headline", "paragraph"],
    },
    {
      id: "instruction",
      name: "One instruction for the next sixty seconds",
      job: "One literal action that makes the thing arrive or get used, shown as what he will see where possible: the sender's name, the subject line, the button. With no next step on file, this is the page's one call to action.",
      band_words: [8, 50],
      must: [
        "one action",
        "literal (open, whitelist, reply, watch, add to the calendar)",
        "the sender's name or address to look for, when the thing comes by email",
        "a cta block when the page has no next step, so the page ends on the action",
        "plain words a ten-year-old knows (rule 40)",
      ],
      must_not: [
        "three instructions",
        "\"check your spam folder\" as the only line",
        "a numbered list where one sentence does the job",
        "an ask (subscribe, follow) before the thing is delivered",
      ],
      block_types: ["paragraph", "numbered", "cta"],
    },
    {
      id: "bridge",
      name: "Bridge to the next step",
      job: "Start the next sale with the one next step the offer block holds: a low-ticket offer, the trial, the class he already owns, an application, or a referral ask with a mechanism. It is tied to the promise he just accepted as the next problem the thing creates, with its price or terms and one button. With no next step on file, the page ends on the instruction.",
      band_words: [40, 150],
      must: [
        "one next step, from the offer block",
        "tied to the promise just accepted: the next problem the thing he got creates, as a cause (the recipe book needs the knife)",
        "the next thing introduced in one plain sentence with its name: what it is and what it does for him (rule 38)",
        "the picture of the result the next step brings, so he feels it (rule 39); price or terms with a ledger ID when it costs money",
        "a referral reward or a count only with its ledger row",
        "words a ten-year-old knows; nothing a cold reader would ask about (rule 40)",
      ],
      must_not: [
        "two offers",
        "a full sales page",
        "re-selling the free thing",
        "an offer wall of unrelated things",
        "a count of people ahead or a sold-out line with no ledger row",
        "a credential line about the host as its own sentence (it rides in the sentence that says what he shows)",
        "a reason to come live or act that the plan does not keep",
        "an invented offer, or a line that says there is none",
        "a lesson in his trade; the next thing pointed at (\"it\") before its plain sentence",
      ],
      optional: true,
      block_types: ["crosshead", "paragraph", "bullets", "price", "cta", "button"],
    },
  ],
  draft_order: ["bridge", "instruction", "confirmation"],
  lead_variants: 0,
  skim_path_block_types: ["headline", "crosshead", "cta", "button", "price"],
  hard_gates: ["thank_you.cta_count>=1", "page.no_markdown_headings"],
  cadence_floor_cv: 0.7,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Thank-you page",
};
