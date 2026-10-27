/**
 * Weakening admissions (docs/04 rule 12): a line that says the product, its example or its maker has not launched,
 * sold, opened or gone live, is only planned, or has no site, customers, sales, reviews or results yet. The writer
 * never volunteers one when the claim stays true without it, and an edit may cut one. No edit may add one, or reword
 * one it found ("a planned subscription" into "a subscription that hasn't launched yet"): the tell edit refuses such
 * an edit and the revision's reconcile reverts the block.
 */

const A = "['’]";

export const ADMISSION_RE = new RegExp(
  [
    `\\b(?:has|have|had)n${A}t (?:yet )?(?:launched|opened|gone live|started selling|sold anything)`,
    `\\b(?:has|have) not (?:yet )?(?:launched|opened|gone live|started selling)`,
    `\\bnot (?:yet )?(?:launched|live|selling|open for business)\\b`,
    `\\byet to (?:launch|open|sell|go live)\\b`,
    `\\b(?:un|pre-?)launched\\b`,
    `\\bpre-?launch\\b`,
    `\\bplann?(?:s|ing)? to (?:sell|launch|open|go live)\\b`,
    `\\ba planned (?:[a-z][a-z'’-]* ){0,3}(?:subscription|business|store|shop|brand|product|company|site|website|service|launch|line|offer)s?\\b`,
    `\\bno (?:website|web site|online store|storefront|track record)(?: yet)?\\b`,
    `\\bno (?:customers|sales|reviews|results|testimonials|buyers|users|revenue) yet\\b`,
    `\\bwithout (?:a )?(?:website|online store|storefront)\\b`,
    `\\bnone (?:of them )?(?:paying|buying)(?: yet)?\\b`,
    `\\bbefore (?:it|they|the (?:brand|store|business|site|company)) (?:launch(?:es|ed)?|opens|opened|went live|goes live)\\b`,
  ].join("|"),
  "gi",
);

/**
 * The detector's subset: the admissions that weaken a proof in any piece. A launch announcement ("pre-launch price",
 * "before it launches", "yet to launch") is a fact of a launch campaign, so only the edit guards refuse those.
 */
export const ADMISSION_TELL_RE = new RegExp(
  [
    `\\b(?:has|have|had)n${A}t (?:yet )?(?:launched|gone live|started selling|sold anything)`,
    `\\bplan(?:s|ning) to (?:sell|go live)\\b`,
    `\\ba planned (?:[a-z][a-z'’-]* ){0,3}(?:subscription|business|store|shop|brand|product|company|site|website|service|line|offer)s?\\b`,
    `\\bno (?:website|web site|online store|storefront|track record)(?: yet)?\\b`,
    `\\bwithout (?:a )?(?:website|online store|storefront)\\b`,
    `\\bnone (?:of them )?(?:paying|buying)(?: yet)?\\b`,
  ].join("|"),
  "gi",
);

/** The admissions a text holds, lowercased, in order. */
export function admissionsIn(text: string): string[] {
  return Array.from(text.matchAll(new RegExp(ADMISSION_RE.source, "gi")), (m) => m[0].toLowerCase());
}

/** The admissions an edit brings in: in the new text and not, word for word, in the old one. Cutting one adds none. */
export function admissionsAdded(before: string, after: string): string[] {
  const had = new Set(admissionsIn(before));
  return admissionsIn(after).filter((a) => !had.has(a));
}
