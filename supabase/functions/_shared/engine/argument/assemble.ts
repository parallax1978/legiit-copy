/**
 * Gates every candidate, merges the computed and judged scores, ranks with the tie-breaks, picks three finalists,
 * the winner and the two losers kept, and writes the thesis in the exact form of Section 1, rule 1.
 * Pure: the step feeds it the model outputs; tests feed it fixtures.
 */
import { z } from "zod";
import { ArgumentOutput, WEIGHTS } from "../schemas/argument.ts";
import type { StepEffects } from "../steps/types.ts";
import type { CandidateT } from "./candidates.ts";
import { desireGate, type DesireGateResult, type LedgerClaimLike, PROOF_GATE, proofGate, type ProofGateResult } from "./gates.ts";
import { type ClusterStats, findCluster } from "./magnitude.ts";
import {
  buildScores,
  clampScore,
  composeThesis,
  type Criterion,
  describeTieBreak,
  JUDGED_CRITERIA,
  type JudgedCriterion,
  pickFinalists,
  rankCandidates,
  type Rankable,
  type ScoreTable,
  weightedTotal,
} from "./weighting.ts";

/** Output schema of the scoring call: C4-C14 per survivor, with the rationale. */
export const JudgedScores = z.object(
  Object.fromEntries(JUDGED_CRITERIA.map((c) => [c, z.number().min(0).max(3)])) as Record<JudgedCriterion, z.ZodNumber>,
);
export const ScoringOutput = z.object({
  scored: z.array(z.object({ id: z.string(), scores: JudgedScores, rationale: z.string() })),
});
export type ScoringOutput = z.infer<typeof ScoringOutput>;

export interface JudgedEntry {
  scores: Partial<Record<Criterion, number>>;
  rationale: string;
}

export function indexJudged(out: ScoringOutput): Record<string, JudgedEntry> {
  const map: Record<string, JudgedEntry> = {};
  for (const s of out.scored) map[s.id.trim()] = { scores: s.scores, rationale: s.rationale };
  return map;
}

export interface GatedCandidate {
  candidate: CandidateT;
  desire: DesireGateResult;
  proof: ProofGateResult;
}

/** Both gates, from the dossier's cluster table and the ledger. With a stated purpose, a candidate that serves it is never failed by thin research alone. */
export function gateCandidates(candidates: CandidateT[], table: ClusterStats[], claims: LedgerClaimLike[], opts: { purposeGiven?: boolean } = {}): GatedCandidate[] {
  return candidates.map((candidate) => ({
    candidate,
    desire: desireGate(findCluster(table, candidate.cluster), { assertedByUser: !!opts.purposeGiven && candidate.serves_purpose }),
    proof: proofGate(candidate.proof_ledger_refs, claims),
  }));
}

/** A survivor goes to the scoring call: desire pass or provisional, proof pass. */
export function isSurvivor(g: GatedCandidate): boolean {
  return g.desire.status !== "fail" && g.proof.status === "pass";
}

type Angle = NonNullable<StepEffects["angles"]>[number];
type GatesT = z.infer<typeof ArgumentOutput>["candidates"][number]["gates"];

interface Row extends Rankable {
  candidate: CandidateT;
  gates: GatesT;
  rationale: string;
  eligible: boolean;
}

export interface AssembledArgument {
  output: ArgumentOutput;
  angles: Angle[];
  survivorIds: string[];
  /** True when no candidate passed both gates; winner_id then names the best-ranked candidate for reference only. */
  noSurvivors: boolean;
}

export function assembleArgument(input: {
  gated: GatedCandidate[];
  judged: Record<string, JudgedEntry>;
  /** brief.audience.who: the [reader] slot of the thesis. */
  reader: string;
  /** The user wrote a purpose for this piece: candidates that serve it are ranked ahead of every other survivor. */
  purposeGiven?: boolean;
}): AssembledArgument {
  if (!input.gated.length) throw new Error("argument assembly needs at least one candidate");

  const rows: Row[] = input.gated.map((g) => {
    const j = input.judged[g.candidate.id];
    const survivor = isSurvivor(g);
    let c9: number = g.proof.c9;
    let proofPass = g.proof.status === "pass";
    let proofReason = g.proof.reason;
    if (survivor && j && typeof j.scores.C9 === "number") {
      const judgedC9 = clampScore(j.scores.C9);
      c9 = judgedC9;
      if (judgedC9 < PROOF_GATE.minC9) {
        proofPass = false;
        proofReason += `; scorer judged coverage C9 ${judgedC9}: the fact does not cover the promise, proof gate fail`;
      }
    }
    const scores: ScoreTable = buildScores({ c1: g.desire.c1, c2: g.desire.c2, c3: g.desire.c3, c9 }, survivor ? j?.scores : null);
    const judgedNote = j ? j.rationale : survivor ? "not returned by the scorer" : "not scored on C4-C14: gated out before scoring";
    return {
      id: g.candidate.id,
      candidate: g.candidate,
      desire: g.desire.status,
      gates: { desire: g.desire.status, desire_magnitude: g.desire.magnitude, proof: proofPass ? "pass" : "fail", c9 },
      scores,
      weighted_total: weightedTotal(scores),
      rationale: [g.desire.reason, proofReason, judgedNote].join(" | "),
      eligible: survivor && proofPass && !!j,
    };
  });

  // With a stated purpose (Section 2, rule 7), the argument is chosen among the survivors whose promise is the
  // desire the purpose names; failing any, among those that serve it. The rest are kept, ranked below, with why.
  const eligibleRows = rows.filter((r) => r.eligible);
  const named = eligibleRows.filter((r) => r.candidate.purpose_fit === "named");
  const servers = eligibleRows.filter((r) => r.candidate.purpose_fit === "serves" || (r.candidate.purpose_fit === "none" && r.candidate.serves_purpose));
  const pool = !input.purposeGiven ? eligibleRows : named.length ? named : servers.length ? servers : eligibleRows;
  const setAside = eligibleRows.filter((r) => !pool.includes(r));
  for (const r of setAside) {
    r.rationale += named.length && pool === named
      ? " | set aside: eligible, but the stated purpose names another desire, and candidates on that desire passed both gates"
      : " | set aside: eligible, but it does not serve the stated purpose of this piece";
  }
  // The user named the desire, so how loudly the research speaks about each cluster (C1-C3) does not rank one
  // named candidate over another (Section 2, rule 7): they are ranked on C4-C14, the judged fit to this piece.
  const rankByJudged = !!input.purposeGiven && named.length > 0 && pool === named;
  const judgedTotal = (r: Row) => r.weighted_total - WEIGHTS.C1 * r.scores.C1 - WEIGHTS.C2 * r.scores.C2 - WEIGHTS.C3 * r.scores.C3;
  const ranked = rankByJudged
    ? rankCandidates(pool.map((r) => ({ ...r, weighted_total: judgedTotal(r) }))).map((x) => pool.find((r) => r.id === x.id)!)
    : rankCandidates(pool);
  const rest = [...rankCandidates(setAside), ...rows
    .filter((r) => !r.eligible)
    .sort((a, b) => b.gates.desire_magnitude + b.gates.c9 - (a.gates.desire_magnitude + a.gates.c9) || a.id.localeCompare(b.id))];
  const ordered = [...ranked, ...rest];

  const fin = pickFinalists(ranked);
  const noSurvivors = fin.winnerId === null;
  const winnerId = fin.winnerId ?? ordered[0].id;
  const winner = ordered.find((r) => r.id === winnerId)!;
  const thesis = composeThesis({
    mechanism: winner.candidate.mechanism,
    promise: winner.candidate.promise,
    reader: input.reader,
    carrier: winner.candidate.proof_asset,
  });

  const notes: string[] = [];
  const tie = rankByJudged ? null : describeTieBreak(ranked);
  if (tie) notes.push(tie);
  if (rankByJudged && ranked.length > 1) notes.push(`Ranked on C4-C14 among the candidates on the desire the purpose names (${ranked.map((r) => `${r.id} ${judgedTotal(r)}`).join(", ")}): the purpose chose the desire, so the research counts (C1-C3) do not separate them.`);
  if (setAside.length) {
    notes.push(pool === named && named.length
      ? `${setAside.length} candidate${setAside.length === 1 ? "" : "s"} passed both gates but ${setAside.length === 1 ? "was" : "were"} set aside: the stated purpose names the desire ${named.map((r) => r.id).join(", ")} ${named.length === 1 ? "sits" : "sit"} on.`
      : `${setAside.length} candidate${setAside.length === 1 ? "" : "s"} passed both gates but did not serve the stated purpose and ${setAside.length === 1 ? "was" : "were"} set aside.`);
  }
  if (input.purposeGiven && !servers.length && eligibleRows.length) notes.push("No survivor serves the stated purpose; the winner is the best evidence-backed argument instead. Refresh the research or restate the purpose if that is not the piece you want.");
  if (noSurvivors) {
    notes.push(
      `NO CANDIDATE PASSED BOTH GATES (desire >= ${4}/9 with k >= 5; a verifiable ledger fact covering the promise). winner_id names the best-ranked candidate for reference only; nothing is selected. Add proof rows to the ledger or verbatims to the research, then try another angle.`,
    );
  }

  const output = ArgumentOutput.parse({
    candidates: ordered.map((r) => ({
      ...r.candidate,
      gates: r.gates,
      scores: r.scores,
      weighted_total: r.weighted_total,
      rationale: r.rationale,
    })),
    finalist_ids: fin.finalistIds,
    winner_id: winnerId,
    thesis,
    losers_kept_ids: fin.loserIds,
    tie_break_note: notes.length ? notes.join(" ") : null,
  });

  const angles: Angle[] = ordered.map((r, i) => {
    const isWinner = !noSurvivors && r.id === winnerId;
    return {
      candidate: r.candidate,
      gates: r.gates,
      scores: r.scores,
      total: r.weighted_total,
      isFinalist: fin.finalistIds.includes(r.id),
      isWinner,
      keptAsLoser: fin.loserIds.includes(r.id),
      rank: i + 1,
      ...(isWinner ? { thesis } : {}),
    };
  });

  return { output, angles, survivorIds: input.gated.filter(isSurvivor).map((g) => g.candidate.id), noSurvivors };
}
