import { z } from "zod";
import { ClaimRowInput } from "./brief.ts";

export const OfferVariantKind = z.enum(["hard", "bill_me", "installments", "free_trial", "money_back", "charter", "premium_led", "continuity", "multi_unit", "lead_gen"]);

export const OfferOption = z.object({
  variant: OfferVariantKind,
  when_used: z.string(),
  front_end_effect: z.string(),
  back_end_effect: z.string(),
  copy_must_say: z.string(),
  fit_score: z.number().min(0).max(3),
  reason: z.string(),
});

export const ChosenOffer = z.object({
  variant: OfferVariantKind,
  reasons: z.string(),
  price_presentation: z.string().describe("how the price is framed: once, after value, with reframe and guarantee adjacent"),
  premiums: z.array(z.object({ name: z.string(), answers_worry: z.string(), value_basis: z.string().nullable() })),
  guarantee: z.object({ denominated_text: z.string(), terms: z.string(), days: z.number().nullable(), costs_seller: z.boolean() }),
  deadline: z.object({ mechanism: z.string(), date_or_rule: z.string() }).nullable(),
  first_visible_win: z.object({ what: z.string(), interval: z.string() }),
  biggest_failure_reason: z.string(),
  bundle_uncomparable_how: z.string(),
});

export const OfferConstruction = z.object({
  options_sheet: z.array(OfferOption),
  chosen: ChosenOffer,
  promise_delivery_gap_note: z.string().describe("what arrives when, for the user: the first thing the buyer gets and how soon, and when the result it produces shows; timing only, never a limit on the result the copy sells (the rankings, the customers, the sales, the money), rule 8"),
  ledger_rows_to_add: z.array(ClaimRowInput),
  needs_user_approval: z.literal(true),
});
export type OfferConstruction = z.infer<typeof OfferConstruction>;
