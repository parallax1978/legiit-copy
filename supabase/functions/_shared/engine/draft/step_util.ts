/**
 * Shared plumbing for the drafting and review steps: resolve the prompt version, call the model with the step's
 * defaults, read earlier step outputs, and describe the argument for prompts. Not pure (calls the model).
 */
import type { z } from "zod";
import { callModel, type CallResult, TruncatedError } from "../llm.ts";
import { resolvePrompt, type PromptModule } from "../prompts/types.ts";
import { lowerEffort, MAX_TOKENS_PER_CALL, STEP_DEFAULTS, type Effort, type StepName } from "../config.ts";
import { remainingBudgetMs } from "../steps/budget.ts";
import type { AngleRow, StepContext } from "../steps/types.ts";
import { ArgumentOutput, Candidate } from "../schemas/argument.ts";
import type { DraftOutput } from "../schemas/draft.ts";
import { parseStoredDraft } from "./assemble.ts";

/** A retry after a truncated answer needs this much of the invocation left. */
export const RETRY_MIN_BUDGET_MS = 90_000;

export function resolvedModel<A>(ctx: StepContext, step: StepName, mod: PromptModule<A>): string {
  return resolvePrompt(ctx, mod).model ?? mod.model ?? STEP_DEFAULTS[step].model;
}

/** One model call for a step: prompt version (DB wins), step defaults, structured output, logged to llm_calls. */
export async function callStep<A, S extends z.ZodTypeAny>(
  ctx: StepContext,
  step: StepName,
  mod: PromptModule<A>,
  args: A,
  schema: S,
  purpose: string,
  overrides: { model?: string; maxTokens?: number; effort?: Effort } = {},
): Promise<CallResult<z.infer<S>>> {
  const r = resolvePrompt(ctx, mod);
  const d = STEP_DEFAULTS[step];
  const model = overrides.model ?? r.model ?? d.model;
  const effort = overrides.effort ?? (r.effort as Effort | undefined) ?? d.effort;
  const maxTokens = Math.min(overrides.maxTokens ?? r.maxTokens ?? d.maxTokens, MAX_TOKENS_PER_CALL);
  const user = mod.user(ctx, args);
  const run = (eff: Effort, tag: string) =>
    callModel<S>({
      model,
      effort: eff,
      maxTokens,
      timeoutMs: remainingBudgetMs(ctx),
      system: r.system,
      user,
      schema,
      log: { db: ctx.db, workspaceId: ctx.generation.workspace_id, generationId: ctx.generation.id, step, attempt: ctx.attempt, purpose: purpose + tag, promptVersionId: r.promptVersionId },
    });
  let res;
  try {
    res = await run(effort, "");
  } catch (e) {
    // Thinking and the answer share max_tokens: a review whose thinking ate the budget is rerun once with one
    // rung less thinking, in this invocation when time allows (a review call is a minute or two).
    if (!(e instanceof TruncatedError) || effort === "low" || remainingBudgetMs(ctx) < RETRY_MIN_BUDGET_MS) throw e;
    await ctx.progress(`${purpose} is taking a second pass`);
    res = await run(lowerEffort(effort), " (retry, less thinking)");
  }
  // Infer<S> resolves to z.infer<S> once S is concrete; the conditional type cannot be reduced for a generic S.
  return res as unknown as CallResult<z.infer<S>>;
}

/** The latest completed output of an earlier step, parsed; null when absent or malformed. */
export function stepOutput<S extends z.ZodTypeAny>(ctx: StepContext, step: StepName, schema: S): z.infer<S> | null {
  const raw = ctx.stepOutputs[step];
  if (raw === undefined || raw === null) return null;
  const r = schema.safeParse(raw);
  if (!r.success) {
    console.warn(`stepOutputs.${step} did not parse: ${r.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    return null;
  }
  return r.data;
}

/** The draft under review. Throws when there is none or it was not stored as a DraftOutput. */
export function latestDraftOutput(ctx: StepContext): DraftOutput {
  if (!ctx.latestDraft) throw new Error("no draft exists for this generation; run the draft step first");
  const d = parseStoredDraft(ctx.latestDraft.blocks);
  if (!d) throw new Error(`draft v${ctx.latestDraft.version} is not a structured DraftOutput (origin ${ctx.latestDraft.origin}); re-run the draft step or restore a system version`);
  return d;
}

export function thesisOf(ctx: StepContext): string | null {
  if (ctx.winningAngle?.thesis) return ctx.winningAngle.thesis;
  const arg = stepOutput(ctx, "argument", ArgumentOutput);
  return arg?.thesis ?? null;
}

/** The winning candidate and the two kept losers, as prompt text. */
export function describeArgument(winner: AngleRow | null, angles: AngleRow[]): string {
  if (!winner) return "ARGUMENT: none recorded.";
  const lines: string[] = [];
  const c = Candidate.safeParse(winner.candidate);
  if (c.success) {
    const k = c.data;
    lines.push(`core desire: ${k.core_desire} (cluster ${k.cluster}, k=${k.k})`);
    lines.push(`promise: ${k.promise}`);
    lines.push(`mechanism: ${k.mechanism}`);
    lines.push(`big idea: ${k.big_idea}`);
    lines.push(`belief to displace: ${k.belief_to_displace}`);
    lines.push(`proof asset: ${k.proof_asset}; proof ledger rows: ${k.proof_ledger_refs.map((r) => `[[L:${r}]]`).join(" ") || "none"}`);
    if (k.lead_verbatim_id) lines.push(`lead verbatim: ${k.lead_verbatim_id}`);
    lines.push(`found by: ${k.search_origin}`);
  } else {
    lines.push(`candidate: ${JSON.stringify(winner.candidate)}`);
  }
  const losers = angles.filter((a) => a.kept_as_loser && a.id !== winner.id);
  if (losers.length) {
    lines.push(`kept losers (body reasons and the next lead tests; never the lead):`);
    for (const l of losers) {
      const lc = Candidate.safeParse(l.candidate);
      lines.push(`  - ${lc.success ? `${lc.data.big_idea}: ${lc.data.promise} via ${lc.data.mechanism}` : JSON.stringify(l.candidate)}`);
    }
  }
  return lines.join("\n");
}
