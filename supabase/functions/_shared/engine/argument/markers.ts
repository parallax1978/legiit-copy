/**
 * Marker lexicons and band cuts for the desire dimensions (docs/04-copy-standard.md Section 2, rule 2),
 * ported from research/rubric/magnitude.py. The regex text is kept character-for-character identical to the
 * Python so the calibration on the Trustpilot corpora holds, quirks included ("struggl" followed by \b never
 * matches "struggling"; "before" counts as time pressure). Recalibrate the lexicon and the cuts together.
 */

/** Intensity or time-pressure markers → urgency (C1). */
export const URGENCY_MARKERS =
  /\b(now|finally|every (single )?day|everyday|daily|can'?t|cannot|need|lost|wasted|miss(ed|ing)?|urgent|immediately|crash|before|deadline|struggl|sick|pain|ache|nightmare|disrupt|bombed|never recovered|shocked|impossible|without crashing|go without|scattered|locked out|stopped working)\b/i;

/** Duration markers → staying power (C2). */
export const STAYING_MARKERS =
  /\b(years?|months?|since \d{4}|still|again|always|for a while|long time|routine|every morning|every day|constantly|ongoing|used to|past \d+|\d+ years?)\b/i;

/** Share of the cluster's verbatims with an urgency marker, banded 0-3 at 10/25/50 percent. */
export const URGENCY_CUTS = [10, 25, 50] as const;
/** Share of the cluster's verbatims with a duration marker, banded 0-3 at 10/30/50 percent. */
export const STAYING_SHARE_CUTS = [10, 30, 50] as const;
/** Distinct years among the cluster's dated verbatims, banded 0-3 at 2/3/4. */
export const STAYING_YEARS_CUTS = [2, 3, 4] as const;
/** Prevalence: the cluster's share of all verbatims, banded 0-3 at 5/15/30 percent. */
export const SCOPE_CUTS = [5, 15, 30] as const;

/** Number of cuts `x` reaches or passes: 0-3 for three cuts. Mirrors magnitude.py `band`. */
export function band(x: number, cuts: readonly number[]): number {
  let n = 0;
  for (const c of cuts) if (x >= c) n += 1;
  return n;
}
