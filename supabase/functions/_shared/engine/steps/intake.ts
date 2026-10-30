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
import intakePrompt, { type IntakeSource } from "../prompts/intake.v14.ts";
import { resolvePrompt } from "../prompts/types.ts";
import { type ClaimRowInput, IntakeBriefOutput, IntakeLedgerOutput, IntakeOutput, type Provenance } from "../schemas/brief.ts";
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

/**
 * The kind of source the app can tell from the URL or title alone (docs/04 8.1, where a fact comes from): a shared,
 * sample, example or demo page is the product's output for one run; a terms or privacy page is the terms; a typed
 * source is the user's own words. Null leaves the call to the model, which reads the page for what it is.
 */
const SAMPLE_PATH = /\/(?:share|shared|sample|samples|example|examples|demo|demos|preview)(?:[\/?#.-]|$)/i;
const SAMPLE_TITLE = /\b(?:shared report|sample (?:plan|report|output|run)|example (?:plan|report|output|run)|demo|preview)\b/i;
const TERMS_PATH = /\/(?:terms|tos|terms-of-service|terms-and-conditions|privacy|privacy-policy|legal|policy|policies|cookies|dpa|gdpr)(?:[\/?#.-]|$)/i;
const TERMS_TITLE = /\b(?:terms of (?:service|use)|terms and conditions|privacy policy|legal)\b/i;

export function classifySource(s: Pick<RawSource, "kind" | "url" | "title">): Provenance | null {
  if (s.kind === "text") return "user";
  const title = s.title ?? "";
  let path = "";
  if (s.url) {
    try {
      path = new URL(s.url).pathname;
    } catch {
      path = s.url;
    }
  }
  if (SAMPLE_PATH.test(path) || SAMPLE_TITLE.test(title)) return "sample_output";
  if (TERMS_PATH.test(path) || TERMS_TITLE.test(title)) return "terms";
  return null;
}

function normalizeUrl(u: string): string {
  try {
    const x = new URL(u.trim());
    x.hash = "";
    x.hostname = x.hostname.toLowerCase().replace(/^www\./, "");
    return x.toString().replace(/\/$/, "");
  } catch {
    return u.trim().toLowerCase().replace(/\/$/, "");
  }
}

/** The source a row cites: by the <source id>, by its URL, or the user's own words. */
export function sourceOf(ref: string | null | undefined, sources: IntakeSource[]): IntakeSource | "user" | null {
  const r = (ref ?? "").trim();
  if (!r) return null;
  if (r === "user_setup" || r === "user_answer") return "user";
  const byId = sources.find((s) => s.id === r);
  if (byId) return byId;
  const n = normalizeUrl(r);
  return sources.find((s) => s.url && normalizeUrl(s.url) === n) ?? null;
}

/** Roles and types that state what the product does, promises or beats: never written from an example of its output. */
const PRODUCT_ROLES = new Set<ClaimRowInput["role"]>(["feature", "mechanism", "promise"]);
const PRODUCT_TYPES = new Set<ClaimRowInput["claim_type"]>(["feature", "mechanism", "benefit", "comparative"]);

export interface DroppedRow {
  text: string;
  source: string;
}

/**
 * Where a fact comes from (docs/04 8.1), enforced after the model returns: a row takes the provenance of the source it
 * cites when the app classified that source (the model's own label fills the rest); a row from an example of the
 * product's output that states what the product does, promises or beats is dropped and reported, so one run's facts
 * never become the product's; a row from the terms that the model gave a selling role keeps its fact as role other.
 */
export function enforceProvenance(claims: ClaimRowInput[], sources: IntakeSource[]): { claims: ClaimRowInput[]; dropped: DroppedRow[] } {
  const kept: ClaimRowInput[] = [];
  const dropped: DroppedRow[] = [];
  for (const c of claims) {
    const src = sourceOf(c.evidence.source_ref, sources);
    const fixed: Provenance | null = src === "user" ? "user" : src?.provenance ?? null;
    const provenance = fixed ?? c.evidence.provenance ?? null;
    const row = { ...c, evidence: { ...c.evidence, provenance } };
    const sells = PRODUCT_ROLES.has(c.role) || PRODUCT_TYPES.has(c.claim_type);
    if (provenance === "sample_output" && sells) {
      const label = src && src !== "user" ? (src.title ?? src.url ?? src.id) : (c.evidence.source_ref ?? "a sample");
      dropped.push({ text: c.claim_text, source: label });
      continue;
    }
    if (provenance === "terms" && PRODUCT_ROLES.has(c.role)) row.role = "other";
    kept.push(row);
  }
  return { claims: kept, dropped };
}

/** The brief's proof list never cites the terms (a data provider or a clause is not proof of the product). */
export function proofWithoutTerms<T extends { source: string | null }>(proof: T[], sources: IntakeSource[]): T[] {
  return proof.filter((p) => {
    const src = sourceOf(p.source, sources);
    return !(src && src !== "user" && src.provenance === "terms");
  });
}

/** What a dropped row becomes in brief.unknowns: the user can add it by hand when the product itself does it. */
export function droppedNote(d: DroppedRow): string {
  return `Not recorded as a product fact, because it comes from an example of the product's output (${d.source}): "${d.text}". Add it by hand if the product itself does this.`;
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
    sources.push({ id: s.id, kind: s.kind, url: s.url, title: s.title, text: cut, truncated, provenance: classifySource(s) });
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
    // where a fact comes from (docs/04 8.1): one run's facts never become the product's, the terms never its proof
    const { claims, dropped } = enforceProvenance(IntakeLedgerOutput.parse(ledgerRes.output).claims, sources);
    const brief = { ...head.brief, proof_available: proofWithoutTerms(head.brief.proof_available, sources), unknowns: [...head.brief.unknowns, ...dropped.map(droppedNote)] };
    const output = IntakeOutput.parse({ ...head, brief, claims });

    const blocking = output.questions.filter((q) => q.blocking);
    const flagged = output.claims.filter((c) => c.status === "flagged").length;
    const result: StepResult<IntakeOutput> = {
      output,
      model: res.model,
      summary: `Brief for ${output.brief.product_name}: ${output.claims.length} ledger rows (${flagged} flagged${dropped.length ? `; ${dropped.length} from sample output not recorded as product facts` : ""}), ${output.questions.length} question${output.questions.length === 1 ? "" : "s"} (${blocking.length} blocking), ${sources.length} sources read`,
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
