/**
 * Build a StepContext from the database and apply a step's side effects. Shared by the run-step Edge Function and
 * the local CLI so both execute the same STEPS functions on the same inputs.
 */
import type { Db } from "../supabase.ts";
import type { Json } from "../database.types.ts";
import type { StepName } from "./config.ts";
import { getFormat } from "./formats/index.ts";
import { FormatId } from "./schemas/common.ts";
import { OfferBrief, ClaimRowInput } from "./schemas/brief.ts";
import { Dossier } from "./schemas/research.ts";
import type { AngleRow, DraftRow, OfferVariantRow, StepContext, StepResult, VoiceProfileRow } from "./steps/types.ts";
import { parseOptions } from "./draft/options.ts";

/** jsonb columns declared NOT NULL take NonNullable<Json>; our values are validated objects, so the cast is a type shim only. */
const J = (v: unknown) => v as NonNullable<Json>;

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "not found"}`);
}

export async function buildContext(db: Db, generationId: string, attempt: number, progress: (m: string) => Promise<void>): Promise<StepContext> {
  const gen = await db.from("generations").select("*").eq("id", generationId).single();
  if (gen.error || !gen.data) fail(`generation ${generationId}`, gen.error);
  const generation = gen.data;

  const off = await db.from("offers").select("*").eq("id", generation.offer_id).single();
  if (off.error || !off.data) fail(`offer ${generation.offer_id}`, off.error);
  const offer = off.data;

  const fmt = FormatId.safeParse(generation.format);
  if (!fmt.success) throw new Error(`generation ${generationId} has an unknown format: ${generation.format}`);
  const format = getFormat(fmt.data);

  const [claims, config, variant, research, voice, angles, drafts, steps, prompts] = await Promise.all([
    db.from("offer_claims").select("*").eq("offer_id", offer.id).order("created_at", { ascending: true }),
    db.from("offer_config").select("*").eq("offer_id", offer.id).maybeSingle(),
    loadVariant(db, offer.id, generation.variant_id),
    loadResearch(db, offer.id, generation.research_id),
    loadVoice(db, offer.id, offer.workspace_id, generation.voice_profile_id),
    db.from("angles").select("*").eq("generation_id", generationId).order("rank", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true }),
    db.from("drafts").select("*").eq("generation_id", generationId).order("version", { ascending: true }),
    db.from("generation_steps").select("step,output,finished_at,created_at").eq("generation_id", generationId).eq("status", "completed").order("finished_at", { ascending: true, nullsFirst: true }).order("created_at", { ascending: true }),
    db.from("prompt_versions").select("id,step,version,template,model,effort,max_tokens").eq("active", true),
  ]);
  if (claims.error) fail("offer_claims", claims.error);
  if (config.error) fail("offer_config", config.error);
  if (angles.error) fail("angles", angles.error);
  if (drafts.error) fail("drafts", drafts.error);
  if (steps.error) fail("generation_steps", steps.error);
  if (prompts.error) fail("prompt_versions", prompts.error);

  const brief = (() => {
    const r = OfferBrief.safeParse(offer.brief);
    return r.success ? r.data : null;
  })();

  const stepOutputs: Partial<Record<StepName, unknown>> = {};
  let revisionCycles = 0;
  for (const s of steps.data ?? []) {
    stepOutputs[s.step as StepName] = s.output;
    if (s.step === "revise") revisionCycles += 1;
  }

  const promptVersions: StepContext["promptVersions"] = {};
  for (const p of prompts.data ?? []) promptVersions[p.step] = { id: p.id, version: p.version, template: p.template, model: p.model, effort: p.effort, max_tokens: p.max_tokens };

  const angleRows: AngleRow[] = angles.data ?? [];
  const winningAngle = angleRows.find((a) => a.id === generation.selected_angle_id) ?? angleRows.find((a) => a.is_winner) ?? null;
  const draftRows: DraftRow[] = drafts.data ?? [];

  return {
    db,
    generation,
    offer,
    brief,
    claims: claims.data ?? [],
    config: config.data ?? null,
    variant,
    dossier: research,
    voice,
    format,
    angles: angleRows,
    winningAngle,
    drafts: draftRows,
    latestDraft: draftRows.length ? draftRows[draftRows.length - 1] : null,
    stepOutputs,
    revisionCycles,
    attempt,
    promptVersions,
    progress,
  };
}

async function loadVariant(db: Db, offerId: string, variantId: string | null): Promise<OfferVariantRow | null> {
  if (variantId) {
    const r = await db.from("offer_variants").select("*").eq("id", variantId).maybeSingle();
    if (r.error) fail("offer_variants", r.error);
    if (r.data) return r.data;
  }
  const r = await db.from("offer_variants").select("*").eq("offer_id", offerId).eq("status", "approved").order("approved_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(1);
  if (r.error) fail("offer_variants", r.error);
  return r.data?.[0] ?? null;
}

async function loadResearch(db: Db, offerId: string, researchId: string | null): Promise<Dossier | null> {
  let row: { dossier: Json } | null = null;
  if (researchId) {
    const r = await db.from("offer_research").select("dossier").eq("id", researchId).maybeSingle();
    if (r.error) fail("offer_research", r.error);
    row = r.data;
  }
  if (!row) {
    const r = await db.from("offer_research").select("dossier").eq("offer_id", offerId).eq("active", true).maybeSingle();
    if (r.error) fail("offer_research", r.error);
    row = r.data;
  }
  if (!row) return null;
  const parsed = Dossier.safeParse(row.dossier);
  if (!parsed.success) {
    console.warn(`offer_research for ${offerId} did not parse as a Dossier: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    return null;
  }
  return parsed.data;
}

async function loadVoice(db: Db, offerId: string, workspaceId: string, voiceId: string | null): Promise<VoiceProfileRow | null> {
  if (voiceId) {
    const r = await db.from("voice_profiles").select("*").eq("id", voiceId).maybeSingle();
    if (r.error) fail("voice_profiles", r.error);
    if (r.data) return r.data;
  }
  const byOffer = await db.from("voice_profiles").select("*").eq("offer_id", offerId).order("updated_at", { ascending: false }).limit(1);
  if (byOffer.error) fail("voice_profiles", byOffer.error);
  if (byOffer.data?.[0]) return byOffer.data[0];
  const byWorkspace = await db.from("voice_profiles").select("*").eq("workspace_id", workspaceId).is("offer_id", null).order("updated_at", { ascending: false }).limit(1);
  if (byWorkspace.error) fail("voice_profiles", byWorkspace.error);
  return byWorkspace.data?.[0] ?? null;
}

export interface AppliedEffects {
  draftVersion?: number;
  draftId?: string;
  researchId?: string;
  variantId?: string;
  selectedAngleId?: string;
}

/**
 * Persist a step's effects. Order matters: research and offer rows first (they are referenced), then angles,
 * then the new draft (flags and the prediction attach to it), then flags, prediction and questions.
 */
export async function applyEffects(db: Db, ctx: StepContext, step: StepName, result: StepResult): Promise<AppliedEffects> {
  const fx = result.effects;
  const out: AppliedEffects = {};
  if (!fx) return out;
  const ws = ctx.generation.workspace_id;
  const gid = ctx.generation.id;
  const oid = ctx.offer.id;

  if (fx.research) {
    const prev = await db.from("offer_research").select("version").eq("offer_id", oid).order("version", { ascending: false }).limit(1);
    if (prev.error) fail("offer_research", prev.error);
    const version = (prev.data?.[0]?.version ?? 0) + 1;
    const off = await db.from("offer_research").update({ active: false }).eq("offer_id", oid).eq("active", true);
    if (off.error) fail("offer_research deactivate", off.error);
    const ins = await db.from("offer_research").insert({ offer_id: oid, workspace_id: ws, version, dossier: J(fx.research.dossier), sources: J(fx.research.sources ?? []), active: true, model: result.model ?? null }).select("id").single();
    if (ins.error || !ins.data) fail("offer_research insert", ins.error);
    out.researchId = ins.data.id;
    const upd = await db.from("generations").update({ research_id: ins.data.id }).eq("id", gid);
    if (upd.error) fail("generations.research_id", upd.error);
  }

  if (fx.offerVariant) {
    const v = fx.offerVariant;
    const ins = await db.from("offer_variants").insert({ offer_id: oid, workspace_id: ws, options_sheet: J(v.optionsSheet), chosen: v.chosen as Json, reasons: v.reasons, guarantee: v.guarantee as Json, deadline: v.deadline as Json, gap_note: v.gapNote, status: "proposed" }).select("id").single();
    if (ins.error || !ins.data) fail("offer_variants insert", ins.error);
    out.variantId = ins.data.id;
  }

  if (fx.claimsToAdd?.length) {
    const rows = fx.claimsToAdd.map((raw, i) => {
      const r = ClaimRowInput.safeParse(raw);
      if (!r.success) throw new Error(`claimsToAdd[${i}] invalid: ${r.error.issues.slice(0, 3).map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`);
      const c = r.data;
      return {
        offer_id: oid,
        workspace_id: ws,
        claim_text: c.claim_text,
        claim_type: c.claim_type,
        role: c.role,
        evidence_grade: c.evidence_grade,
        evidence: J(c.evidence),
        precision: c.precision,
        typical_result: c.typical_result,
        earnings_context: c.earnings_context as Json,
        material_connection: c.material_connection,
        guarantee_terms: c.guarantee_terms as Json,
        former_price: c.former_price as Json,
        scarcity: c.scarcity as Json,
        deadline: c.deadline as Json,
        trial_terms: c.trial_terms as Json,
        story_claim: c.story_claim,
        establishment_signal: c.establishment_signal,
        status: c.status,
        flag: c.flag as Json,
        created_by: "system",
      };
    });
    const ins = await db.from("offer_claims").insert(rows);
    if (ins.error) fail("offer_claims insert", ins.error);
  }

  if (fx.angles?.length) {
    const rows = fx.angles.map((a) => ({
      generation_id: gid,
      workspace_id: ws,
      rank: a.rank,
      candidate: J(a.candidate),
      gates: J(a.gates ?? {}),
      scores: J(a.scores ?? {}),
      total: a.total,
      is_finalist: a.isFinalist,
      is_winner: a.isWinner,
      kept_as_loser: a.keptAsLoser,
      thesis: a.thesis ?? null,
    }));
    const ins = await db.from("angles").insert(rows).select("id,is_winner");
    if (ins.error) fail("angles insert", ins.error);
    const winner = fx.selectedAngleId ?? ins.data?.find((r) => r.is_winner)?.id;
    if (winner) {
      const upd = await db.from("generations").update({ selected_angle_id: winner }).eq("id", gid);
      if (upd.error) fail("generations.selected_angle_id", upd.error);
      out.selectedAngleId = winner;
    }
  } else if (fx.selectedAngleId) {
    const upd = await db.from("generations").update({ selected_angle_id: fx.selectedAngleId }).eq("id", gid);
    if (upd.error) fail("generations.selected_angle_id", upd.error);
    out.selectedAngleId = fx.selectedAngleId;
  }

  let flagDraftId: string | null = ctx.latestDraft?.id ?? null;
  if (fx.newDraft) {
    const prev = await db.from("drafts").select("version").eq("generation_id", gid).order("version", { ascending: false }).limit(1);
    if (prev.error) fail("drafts", prev.error);
    const version = (prev.data?.[0]?.version ?? 0) + 1;
    const d = fx.newDraft;
    const ins = await db
      .from("drafts")
      .insert({ generation_id: gid, workspace_id: ws, version, origin: d.origin, label: d.label ?? step, blocks: J(d.blocks), markdown: d.markdown, skim_path: d.skimPath as Json, ledger_refs: J(d.ledgerRefs), word_count: d.wordCount, created_by: null })
      .select("id,version")
      .single();
    if (ins.error || !ins.data) fail("drafts insert", ins.error);
    out.draftVersion = ins.data.version;
    out.draftId = ins.data.id;
    flagDraftId = ins.data.id;
  }

  if (fx.flags?.length) {
    if (!flagDraftId) {
      const latest = await db.from("drafts").select("id").eq("generation_id", gid).order("version", { ascending: false }).limit(1);
      flagDraftId = latest.data?.[0]?.id ?? null;
    }
    if (!flagDraftId) console.warn(`applyEffects(${step}): ${fx.flags.length} flag(s) dropped, no draft to attach them to`);
    else {
      const known = new Set(ctx.claims.map((c) => c.id));
      const rows = fx.flags.map((f) => ({
        draft_id: flagDraftId!,
        generation_id: gid,
        workspace_id: ws,
        source: f.source,
        kind: f.kind,
        severity: f.severity,
        quote: f.quote,
        rule: f.rule,
        issue: f.issue,
        suggested_rewrite: f.suggestedRewrite,
        claim_id: f.claimId && known.has(f.claimId) ? f.claimId : null,
      }));
      const ins = await db.from("draft_flags").insert(rows);
      if (ins.error) fail("draft_flags insert", ins.error);
    }
  }

  if (fx.prediction) {
    const options = parseOptions(ctx.generation.options);
    const ins = await db.from("generation_predictions").insert({
      generation_id: gid,
      workspace_id: ws,
      draft_id: flagDraftId,
      prediction: fx.prediction.prediction,
      reason: fx.prediction.reason,
      control_ref: options.control_text ? "options.control_text" : "strongest competitor promotion in the dossier",
    });
    if (ins.error) fail("generation_predictions insert", ins.error);
  }

  if (fx.questions?.length) {
    const ins = await db.from("offer_questions").insert(fx.questions.map((q) => ({ offer_id: oid, workspace_id: ws, question: q.question, why: q.why })));
    if (ins.error) fail("offer_questions insert", ins.error);
  }

  return out;
}
