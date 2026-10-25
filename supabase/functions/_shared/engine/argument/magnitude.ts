/**
 * Desire magnitude per cluster (C1 urgency, C2 staying power, C3 scope), computed from the dossier's tagged
 * verbatims. Pure port of research/rubric/magnitude.py `analyse`:
 *   urgency  = share of the cluster's verbatims with an intensity/time-pressure marker, banded at 10/25/50
 *   staying  = max( band(share with a duration marker, 10/30/50), band(distinct years, 2/3/4) )
 *   scope    = band(cluster share of ALL verbatims, 5/15/30)
 * The prevalence denominator is every verbatim in the dossier, service complaints included, as in the Python
 * (its corpora kept "svc" rows "for prevalence denominator").
 */
import type { Verbatim } from "../schemas/research.ts";
import {
  band,
  SCOPE_CUTS,
  STAYING_MARKERS,
  STAYING_SHARE_CUTS,
  STAYING_YEARS_CUTS,
  URGENCY_CUTS,
  URGENCY_MARKERS,
} from "./markers.ts";

export type VerbatimLike = Pick<Verbatim, "id" | "text" | "desire_cluster" | "date"> &
  Partial<Pick<Verbatim, "intensity_marker" | "duration_marker">>;

export interface MagnitudeOptions {
  /**
   * Count the research step's own `intensity_marker` / `duration_marker` tags alongside the lexicon
   * (default true). The lexicon is the calibrated instrument; the tags catch wording the lexicon misses.
   * Set false to reproduce magnitude.py exactly.
   */
  useModelMarkers?: boolean;
  /**
   * Cap each share band at what its count supports (Section 2, rule 2): two marked verbatims for band 1, three
   * for band 2, five for band 3. Default true. Set false to reproduce magnitude.py's raw shares.
   */
  countFloors?: boolean;
}

/** Marked verbatims a share band needs: band 1, 2, 3. */
export const COUNT_FLOORS: readonly number[] = [2, 3, 5];
export function countCap(marked: number): number {
  return band(marked, COUNT_FLOORS);
}

export interface ClusterStats {
  /** Normalized cluster token (lowercase, single spaces). */
  cluster: string;
  /** Verbatims in the cluster. */
  k: number;
  /** All verbatims in the dossier (the prevalence denominator). */
  n: number;
  prevalence_pct: number;
  urgency_pct: number;
  staying_pct: number;
  distinct_years: number;
  c1: number;
  c2: number;
  c3: number;
  /** C1 + C2 + C3, out of 9. */
  magnitude: number;
  verbatim_ids: string[];
}

/** Cluster tokens compared case-insensitively with underscores, hyphens and runs of spaces collapsed. */
export function normalizeCluster(name: string | null | undefined): string | null {
  if (name == null) return null;
  const n = name.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  return n.length ? n : null;
}

/** First four-digit year in a free-form date ("2026-10-21", "Mar 2025", "since 2019"); null when none. */
export function yearOf(date: string | null | undefined): string | null {
  if (!date) return null;
  const m = /\b(?:1[89]|20)\d{2}\b/.exec(date);
  return m ? m[0] : null;
}

export function hasUrgencyMarker(v: VerbatimLike, opts: MagnitudeOptions = {}): boolean {
  if (URGENCY_MARKERS.test(v.text)) return true;
  return (opts.useModelMarkers ?? true) && v.intensity_marker === true;
}

export function hasStayingMarker(v: VerbatimLike, opts: MagnitudeOptions = {}): boolean {
  if (STAYING_MARKERS.test(v.text)) return true;
  return (opts.useModelMarkers ?? true) && v.duration_marker === true;
}

/** One row per cluster, largest first. Verbatims without a desire_cluster count toward n but form no cluster. */
export function computeClusterTable(verbatims: VerbatimLike[], opts: MagnitudeOptions = {}): ClusterStats[] {
  const n = verbatims.length;
  const groups = new Map<string, VerbatimLike[]>();
  for (const v of verbatims) {
    const c = normalizeCluster(v.desire_cluster);
    if (!c) continue;
    const g = groups.get(c);
    if (g) g.push(v);
    else groups.set(c, [v]);
  }
  const out: ClusterStats[] = [];
  for (const [cluster, rows] of groups) {
    const k = rows.length;
    const prevalence = n ? (100 * k) / n : 0;
    const urgMarked = rows.filter((v) => hasUrgencyMarker(v, opts)).length;
    const stayMarked = rows.filter((v) => hasStayingMarker(v, opts)).length;
    const urgency = (100 * urgMarked) / k;
    const staying = (100 * stayMarked) / k;
    const years = new Set(rows.map((v) => yearOf(v.date)).filter((y): y is string => y !== null)).size;
    const floors = opts.countFloors ?? true;
    const c1 = floors ? Math.min(band(urgency, URGENCY_CUTS), countCap(urgMarked)) : band(urgency, URGENCY_CUTS);
    const stayShareBand = floors ? Math.min(band(staying, STAYING_SHARE_CUTS), countCap(stayMarked)) : band(staying, STAYING_SHARE_CUTS);
    const c2 = Math.max(stayShareBand, band(years, STAYING_YEARS_CUTS));
    const c3 = band(prevalence, SCOPE_CUTS);
    out.push({
      cluster,
      k,
      n,
      prevalence_pct: prevalence,
      urgency_pct: urgency,
      staying_pct: staying,
      distinct_years: years,
      c1,
      c2,
      c3,
      magnitude: c1 + c2 + c3,
      verbatim_ids: rows.map((v) => v.id),
    });
  }
  return out.sort((a, b) => b.k - a.k || a.cluster.localeCompare(b.cluster));
}

export function findCluster(table: ClusterStats[], name: string | null | undefined): ClusterStats | undefined {
  const key = normalizeCluster(name);
  if (!key) return undefined;
  return table.find((row) => row.cluster === key);
}

/** Cluster tokens the Python run flagged as service complaints rather than buying desires (display only). */
export const SERVICE_CLUSTER_TOKENS: ReadonlySet<string> = new Set(["svc", "service", "billing", "support", "shipping", "delivery"]);

/** The table as a model sees it: one line per cluster with the computed bands and the desire-gate reading. */
export function renderClusterTable(table: ClusterStats[]): string {
  if (!table.length) return "(no verbatim carries a desire_cluster; every candidate fails the desire gate)";
  const head = "cluster | k | prevalence% | urgency% | staying% | years | C1 C2 C3 | magnitude/9 | desire gate";
  const lines = table.map((r) => {
    const gate = r.magnitude >= 4 ? (r.k >= 5 ? "pass" : "provisional (k<5)") : "fail";
    const svc = SERVICE_CLUSTER_TOKENS.has(r.cluster) ? " (service complaint, not a buying desire)" : "";
    return `${r.cluster} | ${r.k} | ${r.prevalence_pct.toFixed(0)} | ${r.urgency_pct.toFixed(0)} | ${r.staying_pct.toFixed(0)} | ${r.distinct_years} | ${r.c1} ${r.c2} ${r.c3} | ${r.magnitude} | ${gate}${svc}`;
  });
  return [head, ...lines].join("\n");
}
