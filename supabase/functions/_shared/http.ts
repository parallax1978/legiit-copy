/**
 * Shared request helpers for Edge Functions: CORS + error wrapping, zod body parsing, role checks,
 * llm_calls roll-ups, and the offer-scoped StepContext used by intake and research when they run
 * outside a generation (extract-offer, refresh-research, ingest-source --run_extraction).
 */
import { z } from "zod";
import type { Database, Json } from "./database.types.ts";
import { corsHeaders, type Db, handleError, HttpError, requireUser } from "./supabase.ts";
import type { ClaimRow, GenerationRow, OfferRow, StepContext } from "./engine/steps/types.ts";
import { STEPS } from "./engine/steps/index.ts";
import { getFormat } from "./engine/formats/index.ts";
import { FormatId } from "./engine/schemas/common.ts";
import { type ClaimRowInput, IntakeOutput, OfferBrief } from "./engine/schemas/brief.ts";
import { Dossier } from "./engine/schemas/research.ts";

// ---------- HTTP plumbing ----------

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

/** Keeps a promise alive after the response is sent (Supabase edge runtime); a no-op elsewhere, where the promise simply runs on. */
export function background(p: Promise<unknown>): void {
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(p);
}

/** Deno.serve with OPTIONS preflight and HttpError → JSON handled for every route. */
export function serve(handler: (req: Request) => Promise<Response>): void {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    try {
      return await handler(req);
    } catch (e) {
      return handleError(e);
    }
  });
}

/** POST-only JSON body validated by a zod schema. 400 on bad JSON or shape, 405 on other methods. */
export async function parseBody<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.output<T>> {
  if (req.method !== "POST") throw new HttpError(405, "POST only");
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "invalid JSON body");
  }
  const r = schema.safeParse(raw);
  if (!r.success) {
    throw new HttpError(400, `invalid body: ${r.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ")}`);
  }
  return r.data;
}

/** The caller must be owner or editor of the workspace (checked through the user's RLS-scoped client). */
export async function assertEditor(client: Db, workspaceId: string): Promise<void> {
  const { data, error } = await client.rpc("workspace_role", { ws: workspaceId });
  if (error) throw new HttpError(500, error.message);
  if (data !== "owner" && data !== "editor") throw new HttpError(403, "editor role required");
}

/** Authenticated caller who is in app_admins. */
export async function requireAdmin(req: Request) {
  const { user, client } = await requireUser(req);
  const { data, error } = await client.rpc("is_admin");
  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(403, "admin only");
  return { user, client };
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ---------- llm_calls roll-ups ----------

export interface CallTotals {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  /** model of the most recent successful call, if any */
  model: string | null;
}

export async function sumLlmCalls(
  db: Db,
  filter: { generationId?: string; step?: string; attempt?: number; evalOutputId?: string },
): Promise<CallTotals> {
  let q = db.from("llm_calls").select("model, input_tokens, output_tokens, cost_usd, error, created_at");
  if (filter.generationId) q = q.eq("generation_id", filter.generationId);
  if (filter.evalOutputId) q = q.eq("eval_output_id", filter.evalOutputId);
  if (filter.step) q = q.eq("step", filter.step);
  if (filter.attempt !== undefined) q = q.eq("attempt", filter.attempt);
  const { data, error } = await q.order("created_at", { ascending: true });
  if (error) throw new Error(`llm_calls sum failed: ${error.message}`);
  const t: CallTotals = { calls: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0, model: null };
  for (const r of data ?? []) {
    t.calls += 1;
    t.input_tokens += r.input_tokens ?? 0;
    t.output_tokens += r.output_tokens ?? 0;
    t.cost_usd += Number(r.cost_usd ?? 0);
    if (!r.error) t.model = r.model;
  }
  t.cost_usd = Math.round(t.cost_usd * 1e6) / 1e6;
  return t;
}

/** usage_events insert through the once-per-(generation, step, attempt) RPC. Never throws. */
export async function recordUsageSafe(
  db: Db,
  args: { workspaceId: string; generationId?: string | null; step?: string | null; attempt?: number | null; kind: string; tokens: number; cost: number },
): Promise<void> {
  try {
    const { error } = await db.rpc("record_usage", {
      p_workspace_id: args.workspaceId,
      p_generation_id: (args.generationId ?? null) as unknown as string,
      p_step: (args.step ?? null) as unknown as string,
      p_attempt: (args.attempt ?? null) as unknown as number,
      p_kind: args.kind,
      p_tokens: Math.round(args.tokens),
      p_cost: args.cost,
    });
    if (error) console.error("record_usage failed", error.message);
  } catch (e) {
    console.error("record_usage threw", e);
  }
}

// ---------- offer-scoped step context ----------

export async function loadPromptVersions(db: Db): Promise<StepContext["promptVersions"]> {
  const { data, error } = await db.from("prompt_versions").select("id, step, version, template, model, effort, max_tokens").eq("active", true);
  if (error) {
    console.error("prompt_versions load failed", error.message);
    return {};
  }
  const out: StepContext["promptVersions"] = {};
  for (const r of data ?? []) out[r.step] = { id: r.id, version: r.version, template: r.template, model: r.model, effort: r.effort, max_tokens: r.max_tokens };
  return out;
}

/**
 * A GenerationRow-shaped stand-in for steps that run per offer rather than per generation (intake, research).
 * Its id is fresh and never inserted into `generations`; llm_calls rows carry it as generation_id so one
 * extraction's calls can be summed, and carry the real workspace_id so spend lands on the workspace.
 */
export function syntheticGeneration(offer: OfferRow, format: FormatId, purpose: string): GenerationRow {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    workspace_id: offer.workspace_id,
    offer_id: offer.id,
    campaign_id: null,
    format,
    purpose,
    options: {},
    status: "running",
    current_step: purpose,
    progress_message: null,
    step_order: [],
    research_id: null,
    variant_id: null,
    voice_profile_id: null,
    selected_angle_id: null,
    prompt_version_set: {},
    model_set: {},
    cost_usd: 0,
    input_tokens: 0,
    output_tokens: 0,
    error: null,
    created_by: null,
    created_at: now,
    updated_at: now,
    completed_at: null,
  };
}

export interface OfferContext {
  ctx: StepContext;
  offer: OfferRow;
  /** the synthetic generation id used for llm_calls of this run */
  generationId: string;
}

/** Builds a StepContext from an offer alone (no generation row). Used by intake and research runs. */
export async function loadOfferContext(db: Db, offerId: string, purpose: string, format: FormatId = "email_single"): Promise<OfferContext> {
  const { data: offer, error } = await db.from("offers").select("*").eq("id", offerId).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!offer) throw new HttpError(404, "offer not found");

  const [claimsRes, configRes, researchRes, variantRes, voiceRes, promptVersions] = await Promise.all([
    db.from("offer_claims").select("*").eq("offer_id", offerId).order("created_at", { ascending: true }),
    db.from("offer_config").select("*").eq("offer_id", offerId).maybeSingle(),
    db.from("offer_research").select("*").eq("offer_id", offerId).eq("active", true).maybeSingle(),
    db.from("offer_variants").select("*").eq("offer_id", offerId).eq("status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("voice_profiles").select("*").eq("offer_id", offerId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    loadPromptVersions(db),
  ]);
  for (const r of [claimsRes, configRes, researchRes, variantRes, voiceRes]) if (r.error) throw new HttpError(500, r.error.message);

  const brief = OfferBrief.safeParse(offer.brief);
  const dossier = researchRes.data ? Dossier.safeParse(researchRes.data.dossier) : null;
  const generation = syntheticGeneration(offer, format, purpose);

  const ctx: StepContext = {
    db,
    generation,
    offer,
    brief: brief.success ? brief.data : null,
    claims: claimsRes.data ?? [],
    config: configRes.data ?? null,
    variant: variantRes.data ?? null,
    dossier: dossier?.success ? dossier.data : null,
    voice: voiceRes.data ?? null,
    format: getFormat(format),
    angles: [],
    winningAngle: null,
    drafts: [],
    latestDraft: null,
    stepOutputs: {},
    revisionCycles: 0,
    attempt: 1,
    promptVersions,
    progress: async () => {},
    partial: null,
    savePartial: async () => {},
    timeBudgetMs: 300_000,
    startedAt: Date.now(),
  };
  return { ctx, offer, generationId: generation.id };
}

// ---------- claims ledger writes ----------

type ClaimInsert = Database["public"]["Tables"]["offer_claims"]["Insert"];
/** jsonb columns declared NOT NULL take this. */
export type JsonValue = NonNullable<Json>;

export function claimInputToRow(offer: Pick<OfferRow, "id" | "workspace_id">, c: ClaimRowInput): ClaimInsert {
  return {
    offer_id: offer.id,
    workspace_id: offer.workspace_id,
    claim_text: c.claim_text,
    claim_type: c.claim_type,
    role: c.role,
    evidence_grade: c.evidence_grade,
    evidence: c.evidence as unknown as JsonValue,
    precision: c.precision,
    typical_result: c.typical_result,
    earnings_context: c.earnings_context as unknown as Json,
    material_connection: c.material_connection,
    guarantee_terms: c.guarantee_terms as unknown as Json,
    former_price: c.former_price as unknown as Json,
    scarcity: c.scarcity as unknown as Json,
    deadline: c.deadline as unknown as Json,
    trial_terms: c.trial_terms as unknown as Json,
    story_claim: c.story_claim,
    establishment_signal: c.establishment_signal,
    status: c.status,
    flag: c.flag as unknown as Json,
    created_by: "system",
  };
}

/** Inserts ledger rows produced by a step. Unknown shapes are skipped with a log line, never guessed. */
export async function insertClaims(db: Db, offer: Pick<OfferRow, "id" | "workspace_id">, claims: unknown[]): Promise<ClaimRow[]> {
  const rows: ClaimInsert[] = [];
  const Schema = IntakeOutput.shape.claims.element;
  for (const c of claims) {
    const p = Schema.safeParse(c);
    if (p.success) rows.push(claimInputToRow(offer, p.data));
    else console.error("claim skipped (invalid shape)", p.error.issues[0]?.message);
  }
  if (rows.length === 0) return [];
  const { data, error } = await db.from("offer_claims").insert(rows).select("*");
  if (error) throw new Error(`offer_claims insert failed: ${error.message}`);
  return data ?? [];
}

// ---------- intake (shared by extract-offer and ingest-source) ----------

export interface IntakeRunResult {
  offer_id: string;
  status: "needs_review" | "ready";
  brief: OfferBrief;
  claims: number;
  questions: { id: string; question: string; why: string | null; blocking: boolean }[];
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  model: string | null;
}

/**
 * Runs STEPS.intake for an offer and persists its output: offers.brief and summary columns, the system
 * claims (replacing earlier system claims the user has not ruled on), offer_config, open questions, status.
 * The offer never stays in status 'extracting': on failure it goes to 'needs_review' with the error recorded in
 * brief.unknowns when a brief was produced, else back to 'draft'.
 */
export async function runIntake(db: Db, offerId: string): Promise<IntakeRunResult> {
  await db.from("offers").update({ status: "extracting" }).eq("id", offerId);
  let output: IntakeOutput | null = null;
  try {
    const { ctx, offer, generationId } = await loadOfferContext(db, offerId, "intake");
    const result = await STEPS.intake(ctx);
    const parsed = IntakeOutput.safeParse(result.output);
    if (!parsed.success) throw new Error(`intake output failed validation: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    output = parsed.data;
    return await persistIntake(db, offer, generationId, output);
  } catch (e) {
    await leaveExtracting(db, offerId, output, e);
    throw e;
  }
}

/** Moves an offer off 'extracting' after a failure. Exported so callers that fail before runIntake can do the same. */
export async function leaveExtracting(db: Db, offerId: string, output: IntakeOutput | null, e: unknown): Promise<void> {
  try {
    const msg = errorMessage(e).slice(0, 500);
    if (output) {
      const brief = { ...output.brief, unknowns: [...output.brief.unknowns, `Extraction error: ${msg}`] };
      await db.from("offers").update({ status: "needs_review", brief: brief as unknown as JsonValue }).eq("id", offerId);
    } else {
      await db.from("offers").update({ status: "draft" }).eq("id", offerId);
    }
  } catch (err) {
    console.error(`offer ${offerId}: could not leave 'extracting'`, err);
  }
}

async function persistIntake(db: Db, offer: OfferRow, generationId: string, output: IntakeOutput): Promise<IntakeRunResult> {
  const offerId = offer.id;
  const b = output.brief;
  // Brief and summary columns
  const { error: offerErr } = await db.from("offers").update({
    brief: b as unknown as JsonValue,
    audience: b.audience.who || null,
    price: b.price.text || null,
    guarantee: b.guarantee.text,
    positioning: b.positioning,
  }).eq("id", offerId);
  if (offerErr) throw new Error(`offers update failed: ${offerErr.message}`);

  // Ledger: replace system rows the user has not decided on; keep user rows and decided rows (keep/rewrite/drop)
  const { error: delErr } = await db.from("offer_claims").delete().eq("offer_id", offerId).eq("created_by", "system").is("user_decision", null);
  if (delErr) throw new Error(`offer_claims cleanup failed: ${delErr.message}`);
  const inserted = await insertClaims(db, offer, output.claims);

  // Per-offer config
  const cfg = output.config;
  const { error: cfgErr } = await db.from("offer_config").upsert({
    offer_id: offerId,
    workspace_id: offer.workspace_id,
    vertical: cfg.vertical,
    business_opportunity: cfg.business_opportunity,
    notice_recipient: cfg.notice_recipient,
    humor_policy: cfg.humor_policy as unknown as JsonValue,
    greeting: cfg.greeting,
    edge_tolerance: cfg.edge_tolerance,
    refund_window_days: cfg.refund_window_days,
    first_week_experience: cfg.first_week_experience,
  }, { onConflict: "offer_id" });
  if (cfgErr) throw new Error(`offer_config upsert failed: ${cfgErr.message}`);

  // Open questions: replace the unanswered ones
  await db.from("offer_questions").delete().eq("offer_id", offerId).is("answer", null);
  const questions: IntakeRunResult["questions"] = [];
  if (output.questions.length) {
    const { data: qs, error: qErr } = await db.from("offer_questions").insert(
      output.questions.map((q) => ({ offer_id: offerId, workspace_id: offer.workspace_id, question: q.question, why: `${q.blocking ? "[blocking] " : ""}${q.why}` })),
    ).select("id, question, why");
    if (qErr) throw new Error(`offer_questions insert failed: ${qErr.message}`);
    for (const [i, q] of (qs ?? []).entries()) questions.push({ id: q.id, question: q.question, why: q.why, blocking: output.questions[i]?.blocking ?? false });
  }

  const blocking = output.questions.some((q) => q.blocking);
  const status = blocking ? "needs_review" : "ready";
  const { error: stErr } = await db.from("offers").update({ status }).eq("id", offerId);
  if (stErr) throw new Error(`offers status update failed: ${stErr.message}`);

  const totals = await sumLlmCalls(db, { generationId });
  await recordUsageSafe(db, { workspaceId: offer.workspace_id, kind: "ingest", tokens: totals.input_tokens + totals.output_tokens, cost: totals.cost_usd });

  return { offer_id: offerId, status, brief: b, claims: inserted.length, questions, cost_usd: totals.cost_usd, input_tokens: totals.input_tokens, output_tokens: totals.output_tokens, model: totals.model };
}

// ---------- misc ----------

export const FormatIdSchema = FormatId;
export const UuidSchema = z.uuid();

/** Collapses whitespace and trims; used before storing extracted text and comparing exemplars. */
export function normalizeWhitespace(s: string): string {
  return s.replace(/\r\n?/g, "\n").replace(/[ \t\f\v]+/g, " ").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
