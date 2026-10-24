import type { FormatSpec } from "../spec.ts";

/**
 * Heterogeneous package: registration page, three reminder emails, the presentation and 5-7 replay emails.
 * Sections are listed per asset; the replay emails repeat the `replay_email` section as `replay_email#1` ... `replay_email#7`.
 */
export const webinar_package: FormatSpec = {
  id: "webinar_package",
  name: "Webinar package",
  family: "video",
  description: "Registration page, reminders, a roughly 90-minute presentation and the replay sequence. The offer, price, bonuses, scarcity and guarantee are decided first; the presentation teaches to the sale, not to completeness.",
  length_band_words: [9000, 16000],
  sections: [
    { id: "registration_headline", name: "Registration: the One Thing", job: "Promise the one belief shift the webinar delivers, as a result", band_words: [8, 40], must: ["one thing", "ledger ID on any number or name"], must_not: ["describing the webinar's agenda", "\"masterclass\" as the promise"], block_types: ["preheadline", "headline", "deck"] },
    { id: "registration_secrets", name: "Registration: three secrets", job: "Three open loops, one per false belief (vehicle, internal, external)", band_words: [40, 150], must: ["three secrets", "each withholds the answer"], must_not: ["bold-label-colon bullets", "teaching the secret"], block_types: ["bullets", "paragraph"] },
    { id: "registration_cta", name: "Registration CTA", job: "Date, time, the seat, the action", band_words: [3, 40], must: ["date and time with time zone", "literal action"], must_not: ["\"Submit\"", "invented seat limits"], block_types: ["cta", "button", "field"] },
    { id: "reminder_morning_of", name: "Reminder: morning of", job: "Restate the One Thing and the time; one link", band_words: [30, 150], must: ["time with time zone", "one link", "a reason to show up live"], must_not: ["a second offer", "multiple links"], block_types: ["subject", "preview", "greeting", "paragraph", "cta", "signoff"] },
    { id: "reminder_60_minutes", name: "Reminder: 60 minutes", job: "The link and one open loop from the secrets", band_words: [20, 100], must: ["one link", "one open loop"], must_not: ["restating the registration page"], block_types: ["subject", "preview", "greeting", "paragraph", "cta", "signoff"] },
    { id: "reminder_10_minutes", name: "Reminder: 10 minutes", job: "The link, two lines", band_words: [10, 60], must: ["one link"], must_not: ["anything but the link and the time"], block_types: ["subject", "greeting", "paragraph", "cta", "signoff"] },
    { id: "presentation_open", name: "Presentation: opening", job: "Two-agendas statement; five testimonials in five minutes; ruler goals; the Epiphany Bridge origin story", band_words: [600, 1500], must: ["two agendas stated", "five documented testimonials", "ruler goals the audience measures itself against", "Epiphany Bridge with the emotion before the logic"], must_not: ["biography first", "teaching before the story", "apology for selling later"], block_types: ["beat", "slide", "paragraph", "testimonial"] },
    { id: "presentation_secrets", name: "Presentation: case study and three secrets", job: "Case study, then three secrets, each with bridge, results, broken beliefs and the restated belief", band_words: [2500, 5000], must: ["case study with ledger-backed numbers", "each secret: bridge, results, broken beliefs, restated belief", "objections cycled through the secrets"], must_not: ["teaching to completeness", "a fourth secret", "mechanism without a result"], block_types: ["beat", "slide", "paragraph", "testimonial", "crosshead"] },
    { id: "presentation_transition", name: "Presentation: transition", job: "The permission ask, then the turn to the offer as a reason-why", band_words: [60, 200], must: ["permission ask", "turn states cause"], must_not: ["apology transition", "\"I know this is a lot\""], block_types: ["beat", "paragraph"] },
    { id: "presentation_stack", name: "Presentation: stack, price, guarantee, restack", job: "Stack bonuses second-best to best; price within five minutes of the offer; guarantee matched to activation points; restack; urgency bonus", band_words: [800, 1800], must: ["price within five minutes of the offer", "bonuses ordered second-best to best", "guarantee matched to activation points", "restack", "urgency bonus with its mechanism", "offer identical to the order form"], must_not: ["fabricated stack values", "invented scarcity", "an extended deadline"], block_types: ["beat", "slide", "paragraph", "recap", "price", "guarantee", "cta", "button"] },
    { id: "presentation_close", name: "Presentation: countdown and Q&A", job: "30-minute countdown with live Q&A and closes between questions; 20-26 asks across the presentation", band_words: [1500, 3500], must: ["closes between questions", "scarcity throughout", "objections answered with proof", "CTA with what happens after the click"], must_not: ["new bonuses not in the stack", "apology", "an extended deadline"], block_types: ["beat", "slide", "paragraph", "cta", "button", "testimonial"] },
    { id: "replay_email", name: "Replay email", job: "Five to seven emails over four days clustered at the deadline; each carries one objection or one proof and the deadline as a fact", band_words: [100, 400], must: ["one link", "deadline as a fact", "a reason to open the next (non-final)"], must_not: ["an extended deadline", "multiple links", "re-teaching the webinar"], block_types: ["subject", "preview", "greeting", "paragraph", "testimonial", "cta", "signoff", "ps"] },
  ],
  draft_order: ["presentation_stack", "presentation_close", "presentation_transition", "registration_cta", "presentation_secrets", "presentation_open", "replay_email", "reminder_10_minutes", "reminder_60_minutes", "reminder_morning_of", "registration_secrets", "registration_headline"],
  lead_variants: 3,
  skim_path_block_types: ["preheadline", "headline", "deck", "slide", "crosshead", "recap", "price", "guarantee", "cta", "button", "subject"],
  hard_gates: ["webinar.presentation_ctas>=20", "webinar.replay_emails>=5", "webinar.replay_emails<=7", "page.no_markdown_headings"],
  cadence_floor_cv: 0.7,
  allow_emoji_bullets: false,
  allow_markdown_headings: false,
  allow_caps: true,
  standard_section: "Webinar package",
  multi_item: { item_name: "asset", min: 10, max: 12, item_roles: ["registration_page", "reminder_morning_of", "reminder_60_minutes", "reminder_10_minutes", "presentation", "replay_email"] },
};
