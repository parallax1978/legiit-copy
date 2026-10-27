import type { FormatSpec } from "../spec.ts";

/**
 * Item roles per sequence type, in send order. The draft repeats the sections below once per email,
 * suffixing each section id with `#n` (n = 1-based email index) and setting the section title to the role.
 */
export const SEQUENCE_ROLES: Record<"welcome" | "launch" | "abandoned_cart" | "post_purchase" | "win_back", string[]> = {
  welcome: ["deliver_and_reframe", "origin_story", "belief_shift", "proof_story", "objection", "direct_offer", "direct_offer_last_call"],
  launch: ["prelaunch_1", "prelaunch_2", "prelaunch_3", "open_cart", "mid_cart_biggest_objection", "mid_cart_customer_story", "mid_cart_faq", "mid_cart_who_this_is_not_for", "close_day_1", "close_day_2", "close_day_3", "post_close"],
  abandoned_cart: ["30_60_minutes_no_discount", "24_hours", "48_72_hours"],
  post_purchase: ["fast_win", "how_to_get_the_result", "check_in", "review_request", "next_offer"],
  win_back: ["nine_word_email_no_links", "what_you_missed", "stay_or_go"],
};

export const email_sequence: FormatSpec = {
  id: "email_sequence",
  name: "Email sequence",
  family: "email",
  description: "A run of single emails where every non-final email ends with a reason to open the next and every email sells. Welcome 5-7, launch 10-12, abandoned cart 3, post-purchase 5, win-back 3; roles in SEQUENCE_ROLES.",
  length_band_words: [200, 5000],
  sections: [
    { id: "subject", name: "Subject and preview", job: "Written last from the body: the most specific interesting line in it", band_words: [3, 14], must: ["under 70 characters", "not restated as line one"], must_not: ["personalization tokens", "ALL CAPS whole subject", "the same subject shape twice in the sequence"], block_types: ["subject", "preview"] },
    { id: "hook", name: "Hook line", job: "Earn the second sentence; pays off the previous email's open loop where there was one", band_words: [5, 40], must: ["a concrete noun, number or scene"], must_not: ["\"I hope this finds you well\"", "a rhetorical pain question", "restating the subject"], block_types: ["greeting", "paragraph"] },
    { id: "body", name: "One story or argument", job: "Carry the email's role (deliver, origin, belief shift, proof, objection, offer) with one claim and its proof", band_words: [20, 550], must: ["one idea", "proof within two sentences of the claim", "every email sells", "role matches the sequence position"], must_not: ["a list or count of the product's steps (say what the reader gets from them)", "three benefits with \"so you can\"", "\"That's why we built\" without a cause", "\"Not this. That.\"", "\"Let that sink in\"", "an extended deadline"], block_types: ["paragraph", "bullets", "testimonial"] },
    { id: "cta", name: "Bridge and link", job: "One sentence that names the next step and what happens after the click; none in the nine-word win-back email", band_words: [8, 40], must: ["exactly one link", "literal action"], must_not: ["\"Learn more\" alone", "multiple links"], optional: true, block_types: ["cta", "button"] },
    { id: "signoff", name: "Sign-off", job: "A named sender", band_words: [2, 20], must: ["named person"], must_not: ["cheerful sign-off"], block_types: ["signoff"] },
    { id: "next_open", name: "Reason to open the next", job: "Every non-final email ends with a specific reason to open the next one; P.S. past 250 words", band_words: [8, 60], must: ["names what the next email carries", "specific (a number, a name, a story)"], must_not: ["\"stay tuned\"", "a second CTA with a different destination"], optional: true, block_types: ["ps", "paragraph"] },
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
