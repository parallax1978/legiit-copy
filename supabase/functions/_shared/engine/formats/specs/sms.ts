import type { FormatSpec } from "../spec.ts";

export const sms: FormatSpec = {
  id: "sms",
  name: "SMS",
  family: "message",
  description: "[Brand]: the news or the thing held for the reader, said plainly to him (what is new, what is waiting, what ends when), with the stock, scarcity or newness fact the offer block holds; the offer line (its % and deadline when the offer has them, else the price, the trial and the action); one link; STOP wording. With no deal, deadline or stock fact on file, one reason-why clause carries it. 75-115 characters, never above 240; sent 9 a.m. to 8 p.m. recipient time.",
  length_band_words: [12, 40],
  sections: [
    { id: "body", name: "Brand, hook, offer, link", job: "Brand first; one idea: the news (a launch, a new feature, a price change, a deadline the offer block holds) or the thing held for the reader when it is true (his cart, his saved report, the trial already set up for him), said to him in the present; the offer line (its % and deadline when the offer has them, else the price, the trial and the action); the link", band_words: [10, 30], must: ["brand name first", "one idea, said to the reader in the present (what is his, what he can do now)", "a stock, scarcity or newness fact only when the offer block holds one, with its ledger ID", "with no deal, deadline or stock fact on file: one reason-why clause (why it matters now, from the offer block or the mechanism)", "the offer line: its % and deadline when the offer block has them, else the price, the trial and the action", "one link"], must_not: ["a list or count of the product's steps (say what the reader gets from them)", "jokes", "dollar-off", "leaving out a deadline the offer block holds", "a %, deadline, stock or scarcity fact the offer block does not hold", "invented \"almost gone\"", "two ideas", "ALL CAPS whole message", "a question", "the reader's own past told back to him (Section 7.1, tell 14)", "a superlative about the product when the message carries no deal", "jargon the reader would not use", "\"waiting for you\", \"reserved for you\" or \"on hold\" unless the thing is actually held for the reader", "a social-proof count"], block_types: ["paragraph"] },
    { id: "opt_out", name: "STOP wording", job: "The opt-out instruction the carrier requires", band_words: [2, 8], must: ["contains STOP"], must_not: ["a second link"], block_types: ["disclosure", "paragraph"] },
  ],
  draft_order: ["opt_out", "body"],
  lead_variants: 0,
  skim_path_block_types: ["paragraph"],
  hard_gates: ["sms.chars<=240", "sms.stop_wording", "sms.links<=1", "sms.no_dollar_off"],
  cadence_floor_cv: 0.5,
  allow_markdown_headings: false,
  allow_caps: true,
  platform_limits: { chars: 240, chars_target_min: 75, chars_target_max: 115, segment_chars: 160, send_hour_min: 9, send_hour_max: 20 },
  standard_section: "SMS",
};
