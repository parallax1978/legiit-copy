/**
 * Step 3, argument selection (docs/04-copy-standard.md Section 2).
 *   1. one model call: twenty candidates by search (unused fact, opposite idea, mechanism in the process, verbatim)
 *   2. code: C1-C3 and the desire gate from the dossier's verbatims; C9 floor and the proof gate from the ledger
 *   3. one model call: C4-C14 for the survivors with the anchored rubric
 *   4. code: weighted totals, tie-breaks (C9, C3, C14), three finalists, the winner, two losers kept
 *   5. code: the thesis sentence in the exact form of Section 1, rule 1
 * The runner writes the angles from the effects and sets selected_angle_id from isWinner.
 *
 * Resumable: the candidates are checkpointed (ctx.savePartial) so scoring can run in the next invocation when
 * the budget is short, and a truncated call checkpoints a retry flag: the next invocation asks for fewer
 * candidates (or one-sentence rationales) at one rung less effort. Candidate generation runs one rung below
 * the step's effort: it is a search, and thinking shares max_tokens with twenty candidates.
 */
import { z } from "zod";
import { assembleArgument, gateCandidates, indexJudged, isSurvivor, type JudgedEntry, ScoringOutput } from "../argument/assemble.ts";
import { CandidatesOutput, isExcluded, normalizeCandidates, readExclusions } from "../argument/candidates.ts";
import { computeClusterTable, renderClusterTable } from "../argument/magnitude.ts";
import { lowerEffort, MAX_TOKENS_PER_CALL, STEP_DEFAULTS } from "../config.ts";
import { callModel, TruncatedError } from "../llm.ts";
import argumentPrompt from "../prompts/argument.v4.ts";
import { resolvePrompt } from "../prompts/types.ts";
import { formatExamplesForPrompt, retrieve } from "../retrieval.ts";
import { ArgumentOutput, Candidate } from "../schemas/argument.ts";
import type { OfferBrief } from "../schemas/brief.ts";
import type { Dossier } from "../schemas/research.ts";
import { requireDossier } from "./offer.ts";
import { parseOptions } from "../draft/options.ts";
import { remainingBudgetMs } from "./budget.ts";
import { requireBrief } from "./research.ts";
import type { StepContext, StepFn, StepResult } from "./types.ts";

export const CANDIDATE_COUNT = 20;
export const CANDIDATE_RETRY_COUNT = 12;
/** Scoring needs about this long; with less left in the invocation the step checkpoints and continues later. */
export const SCORING_ESTIMATE_MS = 150_000;
export const CANDIDATES_RETRY_REASON = "Candidate generation ran past the output budget; retrying with fewer candidates";
export const SCORING_RETRY_REASON = "Scoring ran past the output budget; retrying with one-sentence rationales";

/** The checkpoint between invocations (generation_steps.output.partial). */
export const ArgumentPartial = z.object({
  candidates: z.array(Candidate).optional(),
  dropped: z.array(z.string()).optional(),
  /** candidates missing: retry candidate generation with fewer; candidates present: retry scoring compact. */
  retry: z.boolean().optional(),
});
export type ArgumentPartial = z.infer<typeof ArgumentPartial>;

export function parseArgumentPartial(p: unknown): ArgumentPartial | null {
  const r = ArgumentPartial.safeParse(p);
  return r.success ? r.data : null;
}
export const NO_SURVIVOR_PAUSE_REASON =
  "no candidate argument passed both gates (desire magnitude >= 4/9 with k >= 5 verbatims; a verifiable ledger fact covering the promise). Add proof rows to the ledger or verbatims to the research, then try another angle.";

export interface ArgumentDeps {
  call: typeof callModel;
  retrieve: typeof retrieve;
}

/** Top examples and critiques for this format, keyed on the brief's one-liner and the dossier's top themes. Never fatal. */
export async function examplesForPrompt(ctx: StepContext, brief: OfferBrief, dossier: Dossier, retrieveFn: typeof retrieve): Promise<string> {
  const themes = dossier.themes.slice(0, 5).map((t) => t.name).join("; ");
  const queryText = [brief.one_line, themes ? `Themes: ${themes}` : null].filter(Boolean).join("\n");
  try {
    const r = await retrieveFn(ctx.db, { format: ctx.format.id, queryText });
    return formatExamplesForPrompt(r.examples, r.critiques);
  } catch (e) {
    console.error("argument: retrieval failed, continuing without examples", e);
    return "";
  }
}

export function makeArgumentStep(deps: Partial<ArgumentDeps> = {}): StepFn {
  const call = deps.call ?? callModel;
  const retrieveFn = deps.retrieve ?? retrieve;
  return async (ctx) => {
    const brief = requireBrief(ctx);
    const dossier = requireDossier(ctx);
    const claims = ctx.claims.filter((c) => c.user_decision !== "drop");
    const p = resolvePrompt(ctx, argumentPrompt);
    const d = STEP_DEFAULTS.argument;
    const base = {
      model: p.model ?? d.model,
      effort: p.effort ?? d.effort,
      maxTokens: Math.min(p.maxTokens ?? d.maxTokens, MAX_TOKENS_PER_CALL),
      system: p.system,
    };
    const log = (purpose: string) => ({
      db: ctx.db,
      workspaceId: ctx.generation.workspace_id,
      generationId: ctx.generation.id,
      step: "argument",
      attempt: ctx.attempt,
      purpose,
      promptVersionId: p.promptVersionId,
    });

    await ctx.progress(`Measuring desire clusters from ${dossier.verbatims.length} verbatims`);
    const table = computeClusterTable(dossier.verbatims);
    const clusterTable = renderClusterTable(table);
    const exclusions = readExclusions(ctx.generation.options, ctx.angles);
    const examples = await examplesForPrompt(ctx, brief, dossier, retrieveFn);
    const opts = parseOptions(ctx.generation.options);
    const common = { brief, claims, dossier, variant: ctx.variant, clusterTable, formatName: ctx.format.name, piece: { purpose: opts.purpose ?? null, cta: opts.cta ?? null, instructions: opts.instructions ?? null } };
    const partial = parseArgumentPartial(ctx.partial) ?? {};

    // A checkpoint written before an exclusion was added still carries the excluded candidates: filter here too.
    const stale = (partial.candidates ?? []).filter((c) => isExcluded(c, exclusions));
    let candidates = (partial.candidates ?? []).filter((c) => !isExcluded(c, exclusions));
    let droppedReasons = [...(partial.dropped ?? []), ...stale.map((c) => `${c.id} excluded: ${c.big_idea}`)];
    let model: string | undefined;
    if (!candidates.length) {
      const retry = !!partial.retry;
      const count = retry ? CANDIDATE_RETRY_COUNT : CANDIDATE_COUNT;
      await ctx.progress(`Generating ${count} candidate arguments by search${retry ? " (retry after a truncated output)" : ""}`);
      let gen;
      try {
        gen = await call({
          ...base,
          effort: retry ? lowerEffort(lowerEffort(base.effort)) : lowerEffort(base.effort),
          timeoutMs: remainingBudgetMs(ctx),
          user: argumentPrompt.user(ctx, { phase: "candidates", ...common, count, examples, exclusions }),
          schema: CandidatesOutput,
          log: log(retry ? "argument.candidates.retry_fewer" : "argument.candidates"),
        });
      } catch (e) {
        if (!(e instanceof TruncatedError) || retry) throw e;
        const next: ArgumentPartial = { retry: true };
        await ctx.savePartial(next);
        return { output: next, summary: "candidate generation ran past the output budget; retrying with fewer candidates", continueLater: { reason: CANDIDATES_RETRY_REASON } };
      }
      const norm = normalizeCandidates(gen.output.candidates, table, exclusions);
      if (!norm.candidates.length) {
        throw new Error(`the model returned no usable candidates (${norm.dropped.length} dropped: ${norm.dropped.map((x) => x.reason).join("; ") || "none"})`);
      }
      candidates = norm.candidates;
      droppedReasons = norm.dropped.map((x) => x.reason);
      model = gen.model;
      const checkpoint: ArgumentPartial = { candidates, dropped: droppedReasons };
      await ctx.savePartial(checkpoint);
      if (remainingBudgetMs(ctx) < SCORING_ESTIMATE_MS) {
        return { output: checkpoint, model, summary: `${candidates.length} candidates generated; scoring continues in the next invocation`, continueLater: { reason: `${candidates.length} candidates generated; scoring them next` } };
      }
    }

    const purposeGiven = !!opts.purpose?.trim();
    const gated = gateCandidates(candidates, table, claims, { purposeGiven });
    const survivors = gated.filter(isSurvivor);
    let judged: Record<string, JudgedEntry> = {};
    if (survivors.length) {
      const compact = !!partial.candidates && !!partial.retry;
      await ctx.progress(`Scoring ${survivors.length} gate survivor${survivors.length === 1 ? "" : "s"} on C4-C14${compact ? " (retry, one-sentence rationales)" : ""}`);
      let sc;
      try {
        sc = await call({
          ...base,
          effort: compact ? lowerEffort(base.effort) : base.effort,
          timeoutMs: remainingBudgetMs(ctx),
          user: argumentPrompt.user(ctx, { phase: "scoring", ...common, survivors, compact }),
          schema: ScoringOutput,
          log: log(compact ? "argument.scoring.retry_compact" : "argument.scoring"),
        });
      } catch (e) {
        if (!(e instanceof TruncatedError) || compact) throw e;
        const next: ArgumentPartial = { candidates, dropped: droppedReasons, retry: true };
        await ctx.savePartial(next);
        return { output: next, model, summary: "scoring ran past the output budget; retrying with one-sentence rationales", continueLater: { reason: SCORING_RETRY_REASON } };
      }
      judged = indexJudged(sc.output);
      model = sc.model;
    }

    const asm = assembleArgument({ gated, judged, reader: brief.audience.who, purposeGiven });
    const output = ArgumentOutput.parse(asm.output);
    const winner = output.candidates.find((c) => c.id === output.winner_id)!;
    const droppedNote = droppedReasons.length ? `; ${droppedReasons.length} dropped (${droppedReasons.join("; ")})` : "";

    const result: StepResult<ArgumentOutput> = {
      output,
      model,
      summary: asm.noSurvivors
        ? `No candidate passed both gates: ${candidates.length} candidates, ${survivors.length} survivors${droppedNote}`
        : `Winner ${winner.id} "${winner.big_idea}" at ${winner.weighted_total}/57; finalists ${output.finalist_ids.join(", ")}; ${asm.survivorIds.length} of ${candidates.length} passed both gates${droppedNote}`,
      effects: { angles: asm.angles },
    };
    if (asm.noSurvivors) result.pause = { reason: NO_SURVIVOR_PAUSE_REASON };
    return result;
  };
}

export const argumentStep: StepFn = makeArgumentStep();
