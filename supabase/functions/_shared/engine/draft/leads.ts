/**
 * Lead selection by awareness level (docs/04-copy-standard.md §3), as data and pure functions.
 * The draft step assigns three different lead types per the diagnosed state; the cold read picks one;
 * the ship step names the runner-up as the challenger.
 */
import type { Awareness, LeadType } from "../schemas/common.ts";
import type { DraftOutput } from "../schemas/draft.ts";
import type { FormatSpec } from "../formats/spec.ts";
import { automatedReadabilityIndex, GRADE_CEILING, GRADE_CEILING_BY_FORMAT, hemingwayGrade } from "../tells.ts";

export const DIRECT_LEADS: LeadType[] = ["offer", "promise", "problem_solution"];
export const INDIRECT_LEADS: LeadType[] = ["story", "proclamation", "secret"];

/** Preference order of lead types per awareness state. First entry is the table's primary choice. */
export const LEAD_TYPES_BY_AWARENESS: Record<Awareness, LeadType[]> = {
  most_aware: ["offer", "promise", "problem_solution"],
  product_aware: ["promise", "offer", "secret"],
  solution_aware: ["promise", "secret", "proclamation"],
  problem_aware: ["problem_solution", "proclamation", "secret"],
  unaware: ["story", "proclamation", "secret"],
  unknown: ["problem_solution", "story", "promise"],
};

/** The row of the §3 table for the prompt. */
export const LEAD_RULES_BY_AWARENESS: Record<Awareness, { opening_move: string; product_named: string; do_not: string }> = {
  most_aware: { opening_move: "Product, price, deal, deadline in line one", product_named: "Line one", do_not: "Explain the problem" },
  product_aware: { opening_move: "The promise with the mechanism named; a new reason to act", product_named: "First 100 words", do_not: "Re-educate; story lead" },
  solution_aware: { opening_move: "Name the desire, show a solution is possible, then the mechanism", product_named: "After the mechanism", do_not: "Open with the product name" },
  problem_aware: { opening_move: "Name the need in the reader's words; dramatize only until the next sentence is earned", product_named: "After the turn", do_not: "Lead with the solution; \"Are you tired of...\"" },
  unaware: { opening_move: "A scene, a dated event or an identification line with the big idea inside", product_named: "After word 300", do_not: "Pitch in the first 300 words" },
  unknown: { opening_move: "Awareness undiagnosed: name the need in the reader's words and earn each next sentence", product_named: "After the turn", do_not: "Lead with the solution" },
};

/**
 * Three distinct lead types for the state. Skeptical readers get indirect leads first even when aware (§3).
 */
export function leadTypesForAwareness(awareness: Awareness, skeptical = false): LeadType[] {
  const base = LEAD_TYPES_BY_AWARENESS[awareness] ?? LEAD_TYPES_BY_AWARENESS.unknown;
  const order = skeptical ? [...base.filter((t) => INDIRECT_LEADS.includes(t)), ...INDIRECT_LEADS.filter((t) => !base.includes(t)), ...base.filter((t) => DIRECT_LEADS.includes(t))] : base;
  const out: LeadType[] = [];
  for (const t of order) if (!out.includes(t)) out.push(t);
  return out.slice(0, 3);
}

/** The first lead that was not chosen, in preference order (leads are stored in preference order). */
export function runnerUpLead(leads: DraftOutput["leads"], chosenId: string | null): string | null {
  if (!leads || leads.length === 0) return null;
  const other = leads.find((l) => l.id !== chosenId);
  return other?.id ?? null;
}

/** Stable ids for the three lead variants. */
export const LEAD_IDS = ["lead-a", "lead-b", "lead-c"] as const;

/**
 * The openings a cold reader may pick from: the ones at or under the piece's reading grade (docs/04 rule 40), when
 * any is; an opening a grade above the ceiling loses to one under it before a reader sees them, because the piece
 * ships with the chosen opening on top and the machine reads the whole piece's grade. When every opening is over,
 * all three go to the reader. A very short opening (under 25 words) is not graded.
 */
export function leadsWithinGrade<L extends { id: string; text: string }>(leads: L[], spec: FormatSpec): L[] {
  const ceiling = GRADE_CEILING_BY_FORMAT[spec.id] ?? GRADE_CEILING[spec.family];
  const graded = leads.map((l) => {
    const words = l.text.split(/\s+/).filter(Boolean).length;
    const ari = words >= 25 ? automatedReadabilityIndex(l.text) : null;
    return { lead: l, grade: ari === null ? null : hemingwayGrade(ari) };
  });
  const within = graded.filter((g) => g.grade === null || g.grade <= ceiling).map((g) => g.lead);
  return within.length ? within : leads;
}
