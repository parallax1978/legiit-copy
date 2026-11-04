/** Who lands on the piece: the reader's awareness, in plain words, for the wizard and the Rewrite form (engine schemas/common.ts Awareness). */
export const AWARENESS_OPTIONS = [
  { id: "engine", label: "Let the research decide", hint: "The dossier's read of the traffic." },
  { id: "most_aware", label: "Came for the deal, or already a customer", hint: "The headline is the offer: product, price, deal, deadline." },
  { id: "product_aware", label: "Knows the product, not sold yet", hint: "The promise with the mechanism named, and a new reason to act." },
  { id: "solution_aware", label: "Knows fixes exist, not this one", hint: "The mechanism that makes this one different." },
  { id: "problem_aware", label: "Knows the problem, not the fix", hint: "The problem first, the product after the discovery." },
  { id: "unaware", label: "Cold: does not know the problem yet", hint: "A story or an identification lead." },
] as const;
export type AwarenessChoice = (typeof AWARENESS_OPTIONS)[number]["id"];
export const AWARENESS_IDS = ["most_aware", "product_aware", "solution_aware", "problem_aware", "unaware"] as const;
export function isAwareness(v: string): v is (typeof AWARENESS_IDS)[number] {
  return (AWARENESS_IDS as readonly string[]).includes(v);
}
/** The purpose says the piece is a sale, a deal or a launch price: its reader came for the deal (the engine applies the same rule). */
const SALE_WORDS = /\b(black friday|cyber monday|flash sale|sale|discount(?:ed|s)?|promo(?:tion)?|coupon|deal|launch (?:price|offer)|price drop|limited.time offer|special offer)\b/i;
export function awarenessFromPurpose(purpose: string): "most_aware" | null {
  return SALE_WORDS.test(purpose) ? "most_aware" : null;
}
