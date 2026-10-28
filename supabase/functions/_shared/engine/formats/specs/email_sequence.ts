import type { FormatSpec } from "../spec.ts";

/**
 * Item roles per sequence type, in send order. The draft repeats the sections below once per email,
 * suffixing each section id with `#n` (n = 1-based email index) and setting the section title to the role.
 *
 * The drafter sees an email's role token as that email's job ("EMAIL 3 of 7, role: ..."), so each token names the job
 * the masters gave that email, never a position (a numbered prelaunch or close day) or a slot that invites invention
 * (a customer story or an FAQ with nothing on file): Brunson's soap opera welcome (set the stage, the origin story
 * opened mid-scene, the epiphany), Sethi's big reveal, free taste and last chance, Walker's three prelaunch pieces,
 * the close day's morning, hours-left and last-call emails, and Kennedy's follow-up notices for the abandoned cart.
 * A role naming an objection or questions keeps the detector's FAQ reading (tells.ts FAQ_RE): those emails answer the
 * buyer's own questions.
 */
export const SEQUENCE_ROLES: Record<"welcome" | "launch" | "abandoned_cart" | "post_purchase" | "win_back", string[]> = {
  welcome: ["deliver_and_set_the_stage", "origin_story_opened_mid_scene", "epiphany_belief_shift", "proof_story_or_free_taste", "objection_a_reader_raised", "direct_offer", "direct_offer_last_call"],
  launch: ["prelaunch_opportunity", "prelaunch_transformation", "prelaunch_ownership_experience", "open_cart_big_reveal", "mid_cart_biggest_objection", "mid_cart_free_taste", "mid_cart_questions_readers_asked", "mid_cart_who_this_is_not_for", "close_morning", "close_hours_left", "close_last_call", "post_close"],
  abandoned_cart: ["30_60_minutes_plain_reminder_no_discount", "24_hours_the_doubt_that_stops_buyers", "48_72_hours_last_reminder"],
  post_purchase: ["fast_win", "how_to_get_the_result", "check_in", "review_request", "next_offer"],
  win_back: ["nine_word_email_no_links", "what_you_missed", "stay_or_go"],
};

export const email_sequence: FormatSpec = {
  id: "email_sequence",
  name: "Email sequence",
  family: "email",
  description: "A serial from one named sender. Each email is a single email with the one job its role names: one story, lesson or piece of news, the turn into the offer, one link. Each non-final email ends on a concrete reason to open the next. Every email sells the same offer. Welcome 5-7 emails, launch 10-12, abandoned cart 3, post-purchase 5, win-back 3.",
  length_band_words: [200, 5000],
  sections: [
    { id: "subject", name: "Subject and preview", job: "Written last, as the envelope: a line one person would send another, built from this email's most concrete detail. The preview is one plain sentence that makes the open worth it.", band_words: [3, 14], must: ["under 70 characters", "a line a person would type to one person", "paid off in the email's first two lines with the specific it promised, in new words", "the subject the previous email named, when it named one"], must_not: ["personalization tokens", "ALL CAPS whole subject", "the same subject shape twice in the sequence (a series tag such as \"Day 2 of 5:\" before different lines is fine)", "a benefit headline about the product or what it makes", "a line the email does not pay off"], block_types: ["subject", "preview"] },
    { id: "hook", name: "Opening lines", job: "Line one opens in the speaker's world on one fact: what happened to him or to a person on file, a line a person on file said, a reader's question on file, or his news. Where the previous email left a loop open, the first lines pay it off: the next scene, the promised name or number. Line two pays line one off at once.", band_words: [5, 40], must: ["one fact, picked first, then one opening move from Section 3, Hooks", "a person doing or saying something (the speaker, or a person on file), or the speaker's news, with one concrete detail: a date, a place, an object or an amount on file", "line one holds one thought; its first sentence runs about twelve words or fewer", "line two pays line one off at once: the specific, the proof with its ledger tag, or the next beat"], must_not: ["\"I hope this finds you well\"", "a rhetorical pain question", "the subject said again", "the reader's own past or habit told to him as a fact (Section 7.1, tell 14; a plain record of his dealings with the seller, such as his order or his cart, is fine)", "a tool, score, list or report as the subject that says, rates, hides or hands him something (tell 17)", "line one ending on a short verdict about itself (tell 15)", "a slogan line (tell 16)", "a run of nouns and numbers with no one doing anything", "an opening move or fact an earlier email used"], block_types: ["greeting", "paragraph"] },
    { id: "body", name: "One episode", job: "The email's role, carried as one episode: one scene, one lesson or one piece of news (the role says which), then the turn into the offer in plain sentences, and one carrier. It starts where the last email left the reader and adds facts the earlier emails did not use.", band_words: [20, 550], must: ["one idea", "proof within two sentences of the claim", "the job its role names", "every email sells: the turn names the product and says what it gets the reader, the promise as a sentence of its own with the reader in it (rule 8); the nine-word win-back email asks its one question and stops", "a story only from the story inventory or a ledger row; with none on file, the email teaches one lesson or gives the free taste", "a proof email tells a documented customer's story only when the ledger holds one; with none, it is the free taste: a working piece of the product given in the email (one lesson, or one worked example on a case the ledger holds, told as what the reader sees), or the founder's own use from the story inventory, with the result promised at full strength and the reader's own run as the step", "a questions email quotes questions readers asked when the ledger holds them; with none, it says the doubts in the objection map as plain statements and answers each", "a close email states the offer block's deadline and its reason; with no deadline on file, the reason to act now is what waiting costs him", "the same offer and the same numbers as every other email", "every description of the reader maps to a verbatim, the story inventory or the plain facts of the reader's work (rule 2)"], must_not: ["a list or count of the product's steps (say what the reader gets from them)", "three benefits with \"so you can\"", "\"That's why we built\" without a cause", "\"Not this. That.\"", "\"Let that sink in\"", "an extended deadline", "a guilt line (\"I never heard back\", \"you ignored\")", "questions the copy poses and answers itself", "a sold-count or momentum claim (\"almost sold out\", \"hundreds joined\") without a ledger count", "a deadline, discount or scarcity the offer block does not hold", "a customer, client or result the ledger does not hold", "a line that says results or proof are missing, or asks for them", "a story, lesson or point an earlier email already made"], block_types: ["paragraph", "bullets", "testimonial"] },
    { id: "cta", name: "The link line", job: "What to do, what the click gets him, and what arrives first (how long it takes only when the time is itself a reason to act, rule 18), with the offer in one line said once (the price and the trial, rule 16). The deadline and its reason when the offer block holds one. None in the nine-word win-back email.", band_words: [8, 40], must: ["exactly one link", "literal action"], must_not: ["\"Learn more\" alone", "multiple links", "the trial's limits, billing dates, cancel steps or refund terms (rule 16)", "a list of what the plan includes"], optional: true, block_types: ["cta", "button"] },
    { id: "signoff", name: "Sign-off", job: "The same named sender in every email", band_words: [2, 20], must: ["named person"], must_not: ["cheerful sign-off", "a team or company as the sender"], block_types: ["signoff"] },
    { id: "next_open", name: "Reason to open the next", job: "Every non-final email ends on a concrete reason to open the next one: the next email's subject line, the next scene of the story, or the one named thing it shows. It may be a P.S. at any length.", band_words: [8, 60], must: ["names what the next email carries", "specific: its subject line, a number, a name or a story on file, else the concrete thing the next email shows him"], must_not: ["\"stay tuned\"", "a second link", "a teaser that withholds nothing specific"], optional: true, block_types: ["ps", "paragraph"] },
  ],
  draft_order: ["cta", "body", "hook", "next_open", "signoff", "subject"],
  lead_variants: 0,
  skim_path_block_types: ["subject", "preview", "crosshead", "cta", "ps"],
  hard_gates: ["email.links<=1", "email.subject_chars<=70", "sequence.emails>=3", "sequence.emails<=12"],
  cadence_floor_cv: 0.5,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Sequences",
  multi_item: {
    item_name: "email",
    min: 3,
    max: 12,
    item_roles: Object.entries(SEQUENCE_ROLES).flatMap(([type, roles]) => roles.map((r) => `${type}:${r}`)),
  },
};
