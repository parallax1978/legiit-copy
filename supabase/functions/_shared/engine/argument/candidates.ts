/**
 * Candidate normalization and exclusions. The model proposes twenty candidates; code owns their ids,
 * recomputes k from the dossier, drops promises the user excluded ("try another angle") and duplicates.
 */
import { z } from "zod";
import { Candidate } from "../schemas/argument.ts";
import { ledgerIdOf } from "./gates.ts";
import { type ClusterStats, findCluster } from "./magnitude.ts";

export type CandidateT = z.infer<typeof Candidate>;

/** Output schema of the candidate-generation call. */
export const CandidatesOutput = z.object({
  cluster_vocabulary_used: z.array(z.string()).describe("every cluster token used, each exactly as it appears in <cluster_table>"),
  candidates: z.array(Candidate),
});
export type CandidatesOutput = z.infer<typeof CandidatesOutput>;

export interface Exclusions {
  /** Promises and big ideas the user sent back; compared after normalizeText. */
  promises: string[];
  angleIds: string[];
}

export function normalizeText(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[“”"'‘’`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function stringList(x: unknown): string[] {
  return Array.isArray(x) ? x.filter((v): v is string => typeof v === "string" && v.trim().length > 0) : [];
}

/**
 * Reads generations.options { exclude_angle_ids, exclude_promises } and resolves angle ids to their promise and
 * big idea when the rows are available, so the exclusion survives a new generation that lacks the old angles.
 */
export function readExclusions(options: unknown, priorAngles: { id: string; candidate: unknown }[] = []): Exclusions {
  const o = (options && typeof options === "object" ? options : {}) as Record<string, unknown>;
  const angleIds = stringList(o.exclude_angle_ids);
  const promises = new Set(stringList(o.exclude_promises));
  for (const id of angleIds) {
    const row = priorAngles.find((a) => a.id === id);
    const c = row?.candidate as Partial<CandidateT> | undefined;
    if (c?.promise) promises.add(c.promise);
    if (c?.big_idea) promises.add(c.big_idea);
  }
  return { promises: [...promises], angleIds };
}

export function isExcluded(c: Pick<CandidateT, "promise" | "big_idea">, ex: Exclusions): boolean {
  if (!ex.promises.length) return false;
  const banned = new Set(ex.promises.map(normalizeText).filter(Boolean));
  return banned.has(normalizeText(c.promise)) || banned.has(normalizeText(c.big_idea));
}

export interface NormalizedCandidates {
  candidates: CandidateT[];
  dropped: { id: string; reason: string }[];
}

/**
 * Reassigns ids A01..Ann in the model's order, snaps `cluster` to the dossier vocabulary and overrides `k` with the
 * computed count (0 when the cluster is unknown), drops excluded promises and exact duplicates.
 */
export function normalizeCandidates(raw: CandidateT[], table: ClusterStats[], ex: Exclusions): NormalizedCandidates {
  const out: CandidateT[] = [];
  const dropped: { id: string; reason: string }[] = [];
  const seen = new Set<string>();
  let n = 0;
  for (const c of raw) {
    const id = `A${String(++n).padStart(2, "0")}`;
    if (isExcluded(c, ex)) {
      dropped.push({ id, reason: `excluded by the user: "${c.promise}"` });
      continue;
    }
    const key = normalizeText(c.promise);
    if (key && seen.has(key)) {
      dropped.push({ id, reason: `duplicate promise: "${c.promise}"` });
      continue;
    }
    seen.add(key);
    const stats = findCluster(table, c.cluster);
    out.push({
      ...c,
      id,
      cluster: stats?.cluster ?? c.cluster.trim().toLowerCase(),
      k: stats?.k ?? 0,
      proof_ledger_refs: [...new Set(c.proof_ledger_refs.map(ledgerIdOf).filter(Boolean))],
    });
  }
  return { candidates: out, dropped };
}
