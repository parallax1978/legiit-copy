/**
 * Step 0, intake: brief, claims ledger (typed, graded, flagged), per-offer config and open questions, from the
 * offer's extracted sources. Two model calls writing prompt-described JSON (the schema is too large for native
 * structured outputs): the brief, config and questions first, then the ledger with the whole output budget to
 * itself (at one rung less thinking: it is reading, and thinking shares max_tokens with the rows). Either call
 * is retried once with less when it runs past the budget. The runner writes the brief, claims, config and
 * questions from the effects.
 */
import { lowerEffort, MAX_TOKENS_PER_CALL, STEP_DEFAULTS } from "../config.ts";
import { callModel, TruncatedError } from "../llm.ts";
import intakePrompt, { type IntakeSource } from "../prompts/intake.v9.ts";
import { resolvePrompt } from "../prompts/types.ts";
import { IntakeBriefOutput, IntakeLedgerOutput, IntakeOutput } from "../schemas/brief.ts";
import { remainingBudgetMs } from "./budget.ts";
import type { StepContext, StepFn, StepResult } from "./types.ts";

/** Character budgets for source text in one call (roughly a quarter of that in tokens). */
export const SOURCE_CHAR_CAP_EACH = 120_000;
export const SOURCE_CHAR_CAP_TOTAL = 400_000;

/**
 * Row budgets. One 12K-token answer holds the brief, config, questions and about sixty compact rows alongside
 * the model's thinking; an unbudgeted first call ran past the cap on every live extraction, so the first call
 * carries a budget too and the retry after a truncation tightens it.
 */
export const INTAKE_ROW_CAP = 80;
export const INTAKE_RETRY_ROW_CAP = 50;
export const INTAKE_QUOTE_WORDS = 30;
export const INTAKE_RETRY_QUOTE_WORDS = 20;

export interface RawSource {
  id: string;
  kind: string;
  url: string | null;
  title: string | null;
  extracted_text: string | null;
}

export interface IntakeDeps {
  call: typeof callModel;
  loadSources: (ctx: StepContext) => Promise<RawSource[]>;
}

/** The one query a step runs itself: the offer's sources whose extraction finished. */
export async function loadDoneSources(ctx: StepContext): Promise<RawSource[]> {
  const { data, error } = await ctx.db
    .from("offer_sources")
    .select("id, kind, url, title, extracted_text")
    .eq("offer_id", ctx.offer.id)
    .eq("extraction_status", "done")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`offer_sources query failed: ${error.message}`);
  return (data ?? []) as RawSource[];
}

/** Drops empty sources, cuts each at the per-source cap and the set at the total cap, oldest first. */
export function prepareSources(
  raw: RawSource[],
  caps: { each?: number; total?: number } = {},
): { sources: IntakeSource[]; truncatedCount: number } {
  const each = caps.each ?? SOURCE_CHAR_CAP_EACH;
  const total = caps.total ?? SOURCE_CHAR_CAP_TOTAL;
  const sources: IntakeSource[] = [];
  let used = 0;
  let truncatedCount = 0;
  for (const s of raw) {
    const text = (s.extracted_text ?? "").trim();
    if (!text) continue;
    const room = Math.max(0, total - used);
    if (room === 0) {
      truncatedCount += 1;
      continue;
    }
    const limit = Math.min(each, room);
    const truncated = text.length > limit;
    const cut = truncated ? text.slice(0, limit) : text;
    if (truncated) truncatedCount += 1;
    used += cut.length;
    sources.push({ id: s.id, kind: s.kind, url: s.url, title: s.title, text: cut, truncated });
  }
  return { sources, truncatedCount };
}

export function makeIntakeStep(deps: Partial<IntakeDeps> = {}): StepFn {
  const call = deps.call ?? callModel;
  const loadSources = deps.loadSources ?? loadDoneSources;
  return async (ctx) => {
    await ctx.progress("Reading the offer's sources");
    const raw = await loadSources(ctx);
    const { sources, truncatedCount } = prepareSources(raw);

    const p = resolvePrompt(ctx, intakePrompt);
    const d = STEP_DEFAULTS.intake;
    const effort = p.effort ?? d.effort;
    const base = { model: p.model ?? d.model, maxTokens: Math.min(p.maxTokens ?? d.maxTokens, MAX_TOKENS_PER_CALL), system: p.system };
    const log = (purpose: string) => ({
      db: ctx.db,
      workspaceId: ctx.generation.workspace_id,
      generationId: ctx.generation.id,
      step: "intake" as const,
      attempt: ctx.attempt,
      purpose,
      promptVersionId: p.promptVersionId,
    });
    const n = `${sources.length} source${sources.length === 1 ? "" : "s"}`;

    // Call 1: brief, config, questions.
    const runBrief = (retry: boolean) =>
      call({
        ...base,
        effort: retry ? lowerEffort(effort) : effort,
        timeoutMs: remainingBudgetMs(ctx),
        user: intakePrompt.user(ctx, { phase: "brief", sources, truncatedCount }),
        schema: IntakeBriefOutput,
        log: log(retry ? "intake.brief_config_questions.retry" : "intake.brief_config_questions"),
      });
    await ctx.progress(`Building the brief from ${n}`);
    let briefRes;
    try {
      briefRes = await runBrief(false);
    } catch (e) {
      if (!(e instanceof TruncatedError)) throw e;
      await ctx.progress("The brief ran past the output budget; retrying with less thinking");
      briefRes = await runBrief(true);
    }
    const head = IntakeBriefOutput.parse(briefRes.output);

    // Call 2: the ledger, with the budget to itself. Reading, not reasoning: one rung less thinking.
    const ledgerEffort = lowerEffort(effort);
    const runLedger = (retry: boolean) =>
      call({
        ...base,
        effort: retry ? lowerEffort(ledgerEffort) : ledgerEffort,
        timeoutMs: remainingBudgetMs(ctx),
        user: intakePrompt.user(ctx, {
          phase: "ledger",
          sources,
          truncatedCount,
          brief: head.brief,
          compact: retry ? { rowCap: INTAKE_RETRY_ROW_CAP, quoteWords: INTAKE_RETRY_QUOTE_WORDS, retry: true } : { rowCap: INTAKE_ROW_CAP, quoteWords: INTAKE_QUOTE_WORDS, retry: false },
        }),
        schema: IntakeLedgerOutput,
        log: log(retry ? "intake.ledger.retry_compact" : "intake.ledger"),
      });
    await ctx.progress(`Building the claims ledger from ${n}`);
    let ledgerRes;
    try {
      ledgerRes = await runLedger(false);
    } catch (e) {
      if (!(e instanceof TruncatedError)) throw e;
      await ctx.progress(`The ledger ran past the output budget; retrying with at most ${INTAKE_RETRY_ROW_CAP} rows`);
      ledgerRes = await runLedger(true);
    }
    const res = ledgerRes;
    const output = IntakeOutput.parse({ ...head, claims: IntakeLedgerOutput.parse(ledgerRes.output).claims });

    const blocking = output.questions.filter((q) => q.blocking);
    const flagged = output.claims.filter((c) => c.status === "flagged").length;
    const result: StepResult<IntakeOutput> = {
      output,
      model: res.model,
      summary: `Brief for ${output.brief.product_name}: ${output.claims.length} ledger rows (${flagged} flagged), ${output.questions.length} question${output.questions.length === 1 ? "" : "s"} (${blocking.length} blocking), ${sources.length} sources read`,
      effects: {
        claimsToAdd: output.claims,
        questions: output.questions.map((q) => ({ question: q.question, why: q.why })),
      },
    };
    if (blocking.length) {
      result.pause = { reason: `intake found ${blocking.length} blocking question${blocking.length === 1 ? "" : "s"} the sources do not settle` };
    }
    return result;
  };
}

export const intakeStep: StepFn = makeIntakeStep();
