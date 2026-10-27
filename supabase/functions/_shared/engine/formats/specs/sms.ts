import type { FormatSpec } from "../spec.ts";

export const sms: FormatSpec = {
  id: "sms",
  name: "SMS",
  family: "message",
  description: "[Brand]: one-idea hook in second person with a stock, scarcity or newness fact; offer with % and deadline; link; STOP wording. 75-115 characters, never above 240; sent 8 a.m. to 9 p.m. recipient time.",
  length_band_words: [12, 40],
  sections: [
    { id: "body", name: "Brand, hook, offer, link", job: "Brand first, one idea in second person carried by a stock, scarcity or newness fact, the offer as a % with its deadline, the link", band_words: [10, 30], must: ["brand name first", "one idea in second person", "a stock, scarcity or newness fact with a ledger ID", "offer as a % with a deadline", "one link"], must_not: ["a list or count of the product's steps (say what the reader gets from them)", "jokes", "dollar-off", "no deadline", "invented \"almost gone\"", "two ideas", "ALL CAPS whole message"], block_types: ["paragraph"] },
    { id: "opt_out", name: "STOP wording", job: "The opt-out instruction the carrier requires", band_words: [2, 8], must: ["contains STOP"], must_not: ["a second link"], block_types: ["disclosure", "paragraph"] },
  ],
  draft_order: ["opt_out", "body"],
  lead_variants: 0,
  skim_path_block_types: ["paragraph"],
  hard_gates: ["sms.chars<=240", "sms.stop_wording", "sms.links<=1", "sms.no_dollar_off"],
  cadence_floor_cv: 0.5,
  allow_markdown_headings: false,
  allow_caps: true,
  platform_limits: { chars: 240, chars_target_min: 75, chars_target_max: 115, segment_chars: 160, send_hour_min: 8, send_hour_max: 21 },
  standard_section: "SMS",
};
