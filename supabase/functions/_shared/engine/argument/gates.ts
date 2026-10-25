/**
 * The two gates that run before any sum (docs/04-copy-standard.md Section 2, rule 3).
 *   Desire: C1+C2+C3 >= 4 of 9 with k >= 5 verbatims; fewer verbatims pass only as provisional.
 *   Proof:  C9 >= 2, meaning the ledger holds a verifiable fact that covers the promise.
 * Both are computed in code. The proof gate here is the ledger inspection ("is there a verifiable fact at all");
 * whether that fact covers the promise is judged in the scoring call, which may lower C9 (see assemble.ts).
 */
import type { ClusterStats } from "./magnitude.ts";

export const DESIRE_GATE = { minMagnitude: 4, minK: 5 } as const;
export const PROOF_GATE = { minC9: 2 } as const;

export type DesireGateStatus = "pass" | "fail" | "provisional";

export interface DesireGateResult {
  status: DesireGateStatus;
  magnitude: number;
  c1: number;
  c2: number;
  c3: number;
  k: number;
  reason: string;
}

/**
 * The desire gate. `assertedByUser` marks a candidate that serves the purpose the user wrote for this piece:
 * the user has asserted the desire, so thin research evidence makes it provisional, never a fail, and the
 * reason records how thin the evidence is so the user sees the risk.
 */
export function desireGate(stats: ClusterStats | null | undefined, opts: { assertedByUser?: boolean } = {}): DesireGateResult {
  if (!stats || stats.k === 0) {
    if (opts.assertedByUser) {
      return { status: "provisional", magnitude: 0, c1: 0, c2: 0, c3: 0, k: 0, reason: "desire gate provisional: the stated purpose names this desire; the research holds no verbatim for it (k=0)" };
    }
    return { status: "fail", magnitude: 0, c1: 0, c2: 0, c3: 0, k: 0, reason: "desire gate fail: cluster not in the dossier (k=0)" };
  }
  const { c1, c2, c3, k, magnitude } = stats;
  const base = `C1 ${c1} + C2 ${c2} + C3 ${c3} = ${magnitude}/9, k=${k}`;
  if (magnitude < DESIRE_GATE.minMagnitude) {
    if (opts.assertedByUser) {
      return { status: "provisional", magnitude, c1, c2, c3, k, reason: `desire gate provisional: the stated purpose names this desire; research evidence is thin (${base}, needs >= ${DESIRE_GATE.minMagnitude} with k >= ${DESIRE_GATE.minK})` };
    }
    return { status: "fail", magnitude, c1, c2, c3, k, reason: `desire gate fail: ${base} (needs >= ${DESIRE_GATE.minMagnitude})` };
  }
  if (k < DESIRE_GATE.minK) {
    return { status: "provisional", magnitude, c1, c2, c3, k, reason: `desire gate provisional: ${base} (k < ${DESIRE_GATE.minK})` };
  }
  return { status: "pass", magnitude, c1, c2, c3, k, reason: `desire gate pass: ${base}` };
}

/** The ledger fields the proof gate reads. offer_claims rows satisfy this. */
export interface LedgerClaimLike {
  id: string;
  claim_type: string;
  evidence_grade: string | null;
  status?: string | null;
  user_decision?: string | null;
  claim_text?: string | null;
}

/** Facts verifiable by inspecting the product or the offer itself; a grade is not required (Section 8.2 grade F still permits them). */
export const SELLER_FACT_TYPES: ReadonlySet<string> = new Set([
  "guarantee",
  "price_discount",
  "free",
  "continuity_trial",
  "feature",
  "credential",
  "scarcity_urgency",
]);

/** Claims whose carrier strength is their evidence grade: A-C a verifiable fact; D/E a weaker carrier; F none. */
export const GRADED_FACT_TYPES: ReadonlySet<string> = new Set([
  "statistic",
  "specific_health_benefit",
  "structure_function",
  "establishment",
  "earnings",
  "track_record",
  "comparative",
  "mechanism",
  "benefit",
  "other",
]);

/** Documented people saying things: a carrier, never a verifiable fact that covers a promise on its own (C9 = 1). */
export const TESTIMONIAL_TYPES: ReadonlySet<string> = new Set([
  "results_testimonial",
  "experience_testimonial",
  "narrative",
  "expert_endorsement",
]);

export type CarrierValue = 0 | 1 | 2;

/**
 * What one ledger row can carry for a promise, on the C9 scale, before coverage is judged:
 * 2 a verifiable fact; 1 testimonials, anecdote, mechanistic or ungraded evidence; 0 no carrier.
 * Rows the user dropped carry nothing. Status (verified/unverified/flagged) does not change the value:
 * flagged rows are usable, they carry their flag.
 */
export function carrierValue(claim: LedgerClaimLike): CarrierValue {
  if (claim.user_decision === "drop") return 0;
  if (SELLER_FACT_TYPES.has(claim.claim_type)) return 2;
  if (TESTIMONIAL_TYPES.has(claim.claim_type)) return 1;
  if (GRADED_FACT_TYPES.has(claim.claim_type)) {
    const g = claim.evidence_grade;
    if (g === "A" || g === "B" || g === "C") return 2;
    if (g === "F") return 0;
    return 1; // D, E or ungraded
  }
  return 0; // vague_superlative, ad_identity, audience_language, opportunity_characterization
}

export interface ProofGateResult {
  status: "pass" | "fail";
  /** The C9 floor the ledger supports: 0, 1 or 2. The scorer decides 2 vs 3 (claim and proof the same object). */
  c9: CarrierValue;
  carrier_ids: string[];
  unknown_refs: string[];
  reason: string;
}

/** Accepts a bare ledger id, the inline form [[L:<id>]], or the prefixed form L:<id> models copy from the handle. */
export function ledgerIdOf(ref: string): string {
  const m = /^\s*(?:\[\[)?\s*(?:L:)?\s*(.+?)\s*(?:\]\])?\s*$/.exec(ref);
  return (m ? m[1] : ref).trim();
}

export function proofGate(refs: string[], claims: LedgerClaimLike[]): ProofGateResult {
  const byId = new Map(claims.map((c) => [c.id, c] as const));
  const unknown: string[] = [];
  const carriers: string[] = [];
  let best: CarrierValue = 0;
  for (const ref of new Set(refs.map(ledgerIdOf))) {
    if (!ref) continue;
    const claim = byId.get(ref);
    if (!claim) {
      unknown.push(ref);
      continue;
    }
    const v = carrierValue(claim);
    if (v > 0) carriers.push(claim.id);
    if (v > best) best = v;
  }
  const unknownNote = unknown.length ? `; refs not in the ledger ignored: ${unknown.join(", ")}` : "";
  if (best >= PROOF_GATE.minC9) {
    return { status: "pass", c9: best, carrier_ids: carriers, unknown_refs: unknown, reason: `proof gate pass: C9 ${best}, a verifiable ledger fact carries the promise (${carriers.join(", ")})${unknownNote}` };
  }
  if (best === 1) {
    return { status: "fail", c9: 1, carrier_ids: carriers, unknown_refs: unknown, reason: `proof gate fail: C9 1, testimonials, anecdote or ungraded evidence only (${carriers.join(", ")})${unknownNote}` };
  }
  return { status: "fail", c9: 0, carrier_ids: [], unknown_refs: unknown, reason: `proof gate fail: C9 0, no carrier in the ledger${unknownNote}` };
}
