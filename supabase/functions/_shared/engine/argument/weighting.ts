/**
 * Weighted totals, ranking and tie-breaks (docs/04-copy-standard.md Section 2, rules 4-6), and the thesis form
 * (Section 1, rule 1). Weighted total = Σ weight × score, maximum 57. Tie-break: C9, then C3, then C14;
 * still tied, present both.
 */
import type { z } from "zod";
import { CRITERIA, type Scores, weightedTotal } from "../schemas/argument.ts";
import type { DesireGateStatus } from "./gates.ts";

export type Criterion = (typeof CRITERIA)[number];
export type ScoreTable = z.infer<typeof Scores>;

/** C1-C3 are computed from the dossier; C9's floor is computed from the ledger; the rest are judged. */
export const COMPUTED_CRITERIA = ["C1", "C2", "C3"] as const;
export const JUDGED_CRITERIA = ["C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13", "C14"] as const;
export type JudgedCriterion = (typeof JUDGED_CRITERIA)[number];
export const TIE_BREAK_ORDER: readonly Criterion[] = ["C9", "C3", "C14"];

export function clampScore(x: unknown): number {
  const n = typeof x === "number" && Number.isFinite(x) ? Math.round(x) : 0;
  return Math.max(0, Math.min(3, n));
}

/** Assemble a full C1-C14 row: computed dimensions, the C9 decided by the gate logic, judged scores (0 where not judged). */
export function buildScores(
  computed: { c1: number; c2: number; c3: number; c9: number },
  judged?: Partial<Record<Criterion, number>> | null,
): ScoreTable {
  const row = {} as Record<Criterion, number>;
  for (const c of CRITERIA) row[c] = clampScore(judged?.[c]);
  row.C1 = clampScore(computed.c1);
  row.C2 = clampScore(computed.c2);
  row.C3 = clampScore(computed.c3);
  row.C9 = clampScore(computed.c9);
  return row;
}

export { weightedTotal };

export interface Rankable {
  id: string;
  scores: ScoreTable;
  weighted_total: number;
  desire: DesireGateStatus;
}

/** Higher total first; then C9, C3, C14; then a full desire pass ahead of a provisional one; then id for stability. */
export function compareRank(a: Rankable, b: Rankable): number {
  if (b.weighted_total !== a.weighted_total) return b.weighted_total - a.weighted_total;
  for (const c of TIE_BREAK_ORDER) if (b.scores[c] !== a.scores[c]) return b.scores[c] - a.scores[c];
  const prov = (x: Rankable) => (x.desire === "provisional" ? 1 : 0);
  if (prov(a) !== prov(b)) return prov(a) - prov(b);
  return a.id.localeCompare(b.id);
}

export function rankCandidates<T extends Rankable>(items: T[]): T[] {
  return [...items].sort(compareRank);
}

/** Which tie-break decided first place, or that none did ("present both"); null when first place was not tied. */
export function describeTieBreak(ranked: Rankable[]): string | null {
  if (ranked.length < 2) return null;
  const [a, b] = ranked;
  if (a.weighted_total !== b.weighted_total) return null;
  for (const c of TIE_BREAK_ORDER) {
    if (a.scores[c] !== b.scores[c]) {
      return `Tie at ${a.weighted_total}/57 between ${a.id} and ${b.id}, broken on ${c} (${a.scores[c]} vs ${b.scores[c]}).`;
    }
  }
  if (a.desire !== b.desire) {
    return `Tie at ${a.weighted_total}/57 between ${a.id} and ${b.id} after C9, C3 and C14; ${a.id} ranks first on a full desire pass (${b.id} is provisional, k < 5). Both are presented.`;
  }
  return `Still tied at ${a.weighted_total}/57 between ${a.id} and ${b.id} after C9, C3 and C14. Both are presented; ${a.id} is listed first.`;
}

export interface Finalists {
  finalistIds: string[];
  winnerId: string | null;
  /** The non-winning finalists: body reasons and the next two lead tests. */
  loserIds: string[];
}

export function pickFinalists(ranked: { id: string }[], n = 3): Finalists {
  const finalistIds = ranked.slice(0, n).map((x) => x.id);
  return { finalistIds, winnerId: finalistIds[0] ?? null, loserIds: finalistIds.slice(1) };
}

export const THESIS_TEMPLATE =
  "This draft exists to prove that [mechanism] is a different and superior way to get [promise] for [reader], and the proof is [carrier].";

function part(s: string, fallback: string): string {
  const t = s.replace(/\s+/g, " ").trim().replace(/[.。]+$/, "");
  return t.length ? t : fallback;
}

/** The thesis in the exact form of Section 1, rule 1, from the winner's fields. */
export function composeThesis(p: { mechanism: string; promise: string; reader: string; carrier: string }): string {
  return THESIS_TEMPLATE
    .replace("[mechanism]", part(p.mechanism, "[mechanism]"))
    .replace("[promise]", part(p.promise, "[promise]"))
    .replace("[reader]", part(p.reader, "[reader]"))
    .replace("[carrier]", part(p.carrier, "[carrier]"));
}
