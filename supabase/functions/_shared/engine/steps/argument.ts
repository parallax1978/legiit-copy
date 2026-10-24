/**
 * Step 3, argument selection (docs/04-copy-standard.md Section 2).
 *   1. one model call: twenty candidates by search (unused fact, opposite idea, mechanism in the process, verbatim)
 *   2. code: C1-C3 and the desire gate from the dossier's verbatims; C9 floor and the proof gate from the ledger
 *   3. one model call: C4-C14 for the survivors with the anchored rubric
 *   4. code: weighted totals, tie-breaks (C9, C3, C14), three finalists, the winner, two losers kept
 *   5. code: the thesis sentence in the exact form of Section 1, rule 1
 * The runner writes the angles from the effects and sets selected_angle_id from isWinner.
 */
import { assembleArgument, gateCandidates, indexJudged, isSurvivor, type JudgedEntry, ScoringOutput } from "../argument/assemble.ts";
import { CandidatesOutput, normalizeCandidates, readExclusions } from "../argument/candidates.ts";
import { computeClusterTable, renderClusterTable } from "../argument/magnitude.ts";
import { MAX_TOKENS_PER_CALL, STEP_DEFAULTS } from "../config.ts";
import { callModel } from "../llm.ts";
import argumentPrompt from "../prompts/argument.v1.ts";
import { resolvePrompt } from "../prompts/types.ts";
import { formatExamplesForPrompt, retrieve } from "../retrieval.ts";
import { ArgumentOutput } from "../schemas/argument.ts";
import type { OfferBrief } from "../schemas/brief.ts";
import type { Dossier } from "../schemas/research.ts";
import { requireDossier } from "./offer.ts";
import { requireBrief } from "./research.ts";
import type { StepContext, StepFn, StepResult } from "./types.ts";

export const CANDIDATE_COUNT = 20;
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
    const common = { brief, claims, dossier, variant: ctx.variant, clusterTable, formatName: ctx.format.name };

    await ctx.progress(`Generating ${CANDIDATE_COUNT} candidate arguments by search`);
    const gen = await call({
      ...base,
      user: argumentPrompt.user(ctx, { phase: "candidates", ...common, count: CANDIDATE_COUNT, examples, exclusions }),
      schema: CandidatesOutput,
      log: log("argument.candidates"),
    });
    const { candidates, dropped } = normalizeCandidates(gen.output.candidates, table, exclusions);
    if (!candidates.length) {
      throw new Error(`the model returned no usable candidates (${dropped.length} dropped: ${dropped.map((x) => x.reason).join("; ") || "none"})`);
    }

    const gated = gateCandidates(candidates, table, claims);
    const survivors = gated.filter(isSurvivor);
    let judged: Record<string, JudgedEntry> = {};
    let model = gen.model;
    if (survivors.length) {
      await ctx.progress(`Scoring ${survivors.length} gate survivor${survivors.length === 1 ? "" : "s"} on C4-C14`);
      const sc = await call({
        ...base,
        user: argumentPrompt.user(ctx, { phase: "scoring", ...common, survivors }),
        schema: ScoringOutput,
        log: log("argument.scoring"),
      });
      judged = indexJudged(sc.output);
      model = sc.model;
    }

    const asm = assembleArgument({ gated, judged, reader: brief.audience.who });
    const output = ArgumentOutput.parse(asm.output);
    const winner = output.candidates.find((c) => c.id === output.winner_id)!;
    const droppedNote = dropped.length ? `; ${dropped.length} dropped (${dropped.map((x) => x.reason).join("; ")})` : "";

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
