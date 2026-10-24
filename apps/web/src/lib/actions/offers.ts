"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace, getUser, canEdit } from "@/lib/auth";
import type { Json, Database } from "@/lib/supabase/database.types";

type J = NonNullable<Json>;
type ClaimUpdate = Database["public"]["Tables"]["offer_claims"]["Update"];
import { OfferBrief as OfferBriefSchema } from "@engine/schemas/brief.ts";
import { ClaimType } from "@engine/schemas/common.ts";
import { type ActionResult, normalizeBrief, chosenFromBrief, hostOf } from "@/components/offers/normalize";
import { CLAIM_ROLES, EVIDENCE_GRADES, CLAIM_STATUSES, EDGE_TOLERANCES } from "@/components/offers/constants";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Ctx = { supabase: Supabase; workspaceId: string; userId: string };

const fail = (error: string): ActionResult<never> => ({ ok: false, error });
const done = <T>(data: T): ActionResult<T> => ({ ok: true, data });

/** Editors and owners only. requireWorkspace redirects when signed out; the read-only case returns an error for a toast. */
async function editor(): Promise<{ ok: true; ctx: Ctx } | { ok: false; error: string }> {
  const { role, workspace } = await requireWorkspace();
  if (!canEdit(role)) return { ok: false, error: "You have read-only access to this workspace." };
  const user = await getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const supabase = await createClient();
  return { ok: true, ctx: { supabase, workspaceId: workspace.id, userId: user.id } };
}

async function loadOffer(ctx: Ctx, offerId: string) {
  const { data, error } = await ctx.supabase.from("offers").select("*").eq("id", offerId).eq("workspace_id", ctx.workspaceId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function invokeFn(supabase: Supabase, name: string, body: Record<string, unknown>): Promise<string | null> {
  const { error } = await supabase.functions.invoke(name, { body });
  if (!error) return null;
  if (error instanceof FunctionsHttpError) {
    try {
      const j = (await error.context.json()) as { error?: string; message?: string };
      return `${name}: ${j.error ?? j.message ?? error.message}`;
    } catch {
      return `${name}: ${error.message}`;
    }
  }
  return `${name}: ${error instanceof Error ? error.message : String(error)}`;
}

function revalidateOffer(offerId: string) {
  revalidatePath("/app/offers");
  revalidatePath(`/app/offers/${offerId}`, "layout");
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ---------------------------------------------------------------- create + sources

const SourceFile = z.object({ name: z.string().min(1), storage_path: z.string().min(1), mime_type: z.string().nullable() });
const SourcesInput = z.object({
  offerId: z.string().uuid(),
  urls: z.array(z.string().url()).default([]),
  text: z.string().trim().default(""),
  files: z.array(SourceFile).default([]),
});
export type SourcesInput = z.input<typeof SourcesInput>;

/** Step 1 of the new-offer flow: create the shell so files can be uploaded under its id. */
export async function createOffer(input: { name?: string; firstUrl?: string; firstFile?: string; description?: string }): Promise<ActionResult<{ offerId: string; workspaceId: string }>> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const { supabase, workspaceId, userId } = g.ctx;
  let name = (input.name ?? "").trim();
  if (!name && input.firstUrl) name = hostOf(input.firstUrl);
  if (!name && input.firstFile) name = input.firstFile.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ");
  if (!name && input.description) name = input.description.trim().split(/\s+/).slice(0, 6).join(" ");
  if (!name) name = "Untitled offer";
  const { data, error } = await supabase
    .from("offers")
    .insert({ workspace_id: workspaceId, name: name.slice(0, 120), status: "draft", created_by: userId })
    .select("id")
    .single();
  if (error) return fail(error.message);
  revalidatePath("/app/offers");
  return done({ offerId: data.id, workspaceId });
}

async function insertAndIngest(ctx: Ctx, input: z.output<typeof SourcesInput>): Promise<ActionResult<{ count: number }>> {
  const { supabase, workspaceId } = ctx;
  const offer = await loadOffer(ctx, input.offerId);
  if (!offer) return fail("Offer not found.");
  const rows = [
    ...input.urls.map((url) => ({ offer_id: offer.id, workspace_id: workspaceId, kind: "url", url, title: hostOf(url) })),
    ...input.files.map((f) => ({ offer_id: offer.id, workspace_id: workspaceId, kind: "file", storage_path: f.storage_path, title: f.name, mime_type: f.mime_type })),
    ...(input.text ? [{ offer_id: offer.id, workspace_id: workspaceId, kind: "text", title: "Typed description", extracted_text: input.text }] : []),
  ];
  if (rows.length === 0) return fail("Add at least one source: a URL, a file or a description.");
  const { data: inserted, error } = await supabase.from("offer_sources").insert(rows).select("id");
  if (error) return fail(error.message);
  await supabase.from("offers").update({ status: "extracting" }).eq("id", offer.id);
  const ids = (inserted ?? []).map((r) => r.id);
  const errors: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    const err = await invokeFn(supabase, "ingest-source", { source_id: ids[i], run_extraction: i === ids.length - 1 });
    if (err) errors.push(err);
  }
  revalidateOffer(offer.id);
  if (errors.length === ids.length) return fail(`Sources saved but ingestion could not start: ${errors[0]}`);
  return done({ count: ids.length });
}

/** Step 2 of the new-offer flow: attach sources, start ingestion and go to the offer. */
export async function submitOfferSources(raw: SourcesInput): Promise<ActionResult<{ count: number }>> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const parsed = SourcesInput.safeParse(raw);
  if (!parsed.success) return fail("Check the URLs: each line must be a full address starting with http:// or https://.");
  let result: ActionResult<{ count: number }>;
  try {
    result = await insertAndIngest(g.ctx, parsed.data);
  } catch (e) {
    return fail(msg(e));
  }
  if (!result.ok) return result;
  redirect(`/app/offers/${parsed.data.offerId}`);
}

/** Add sources to an existing offer (no redirect). */
export async function addOfferSources(raw: SourcesInput): Promise<ActionResult<{ count: number }>> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const parsed = SourcesInput.safeParse(raw);
  if (!parsed.success) return fail("Check the URLs: each line must be a full address starting with http:// or https://.");
  try {
    return await insertAndIngest(g.ctx, parsed.data);
  } catch (e) {
    return fail(msg(e));
  }
}

export async function retrySource(sourceId: string): Promise<ActionResult> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const { supabase, workspaceId } = g.ctx;
  const { data: src } = await supabase.from("offer_sources").select("id, offer_id").eq("id", sourceId).eq("workspace_id", workspaceId).maybeSingle();
  if (!src) return fail("Source not found.");
  await supabase.from("offer_sources").update({ extraction_status: "pending", error: null }).eq("id", src.id);
  await supabase.from("offers").update({ status: "extracting" }).eq("id", src.offer_id);
  const err = await invokeFn(supabase, "ingest-source", { source_id: src.id, run_extraction: true });
  revalidateOffer(src.offer_id);
  return err ? fail(err) : done(undefined);
}

export async function deleteSource(sourceId: string): Promise<ActionResult> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const { supabase, workspaceId } = g.ctx;
  const { data: src } = await supabase.from("offer_sources").select("id, offer_id, storage_path").eq("id", sourceId).eq("workspace_id", workspaceId).maybeSingle();
  if (!src) return fail("Source not found.");
  if (src.storage_path) await supabase.storage.from("offer-sources").remove([src.storage_path]);
  const { error } = await supabase.from("offer_sources").delete().eq("id", src.id);
  if (error) return fail(error.message);
  revalidateOffer(src.offer_id);
  return done(undefined);
}

/** Re-run the brief + ledger extraction over the sources already ingested. */
export async function reextractOffer(offerId: string): Promise<ActionResult> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const offer = await loadOffer(g.ctx, offerId);
  if (!offer) return fail("Offer not found.");
  await g.ctx.supabase.from("offers").update({ status: "extracting" }).eq("id", offer.id);
  const err = await invokeFn(g.ctx.supabase, "extract-offer", { offer_id: offer.id });
  if (err) await g.ctx.supabase.from("offers").update({ status: offer.status === "extracting" ? "draft" : offer.status }).eq("id", offer.id);
  revalidateOffer(offer.id);
  return err ? fail(err) : done(undefined);
}

// ---------------------------------------------------------------- brief + questions

export async function saveBrief(offerId: string, input: { name: string; brief: unknown }): Promise<ActionResult> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const parsed = OfferBriefSchema.safeParse(input.brief);
  if (!parsed.success) return fail(`Brief is incomplete: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`);
  const brief = parsed.data;
  const name = input.name.trim() || brief.product_name || "Untitled offer";
  const { error } = await g.ctx.supabase
    .from("offers")
    .update({
      name: name.slice(0, 120),
      brief: brief as unknown as J,
      audience: brief.audience.who || null,
      price: brief.price.text || null,
      guarantee: brief.guarantee.text,
      positioning: brief.positioning,
    })
    .eq("id", offerId)
    .eq("workspace_id", g.ctx.workspaceId);
  if (error) return fail(error.message);
  revalidateOffer(offerId);
  return done(undefined);
}

export async function setOfferStatus(offerId: string, status: "draft" | "ready" | "archived" | "needs_review"): Promise<ActionResult> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const { error } = await g.ctx.supabase.from("offers").update({ status }).eq("id", offerId).eq("workspace_id", g.ctx.workspaceId);
  if (error) return fail(error.message);
  revalidateOffer(offerId);
  return done(undefined);
}

export async function addQuestion(offerId: string, question: string, why: string | null): Promise<ActionResult> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const q = question.trim();
  if (!q) return fail("Write the question first.");
  const { error } = await g.ctx.supabase.from("offer_questions").insert({ offer_id: offerId, workspace_id: g.ctx.workspaceId, question: q, why });
  if (error) return fail(error.message);
  revalidateOffer(offerId);
  return done(undefined);
}

/**
 * Save answers to open questions. With reextract, the answers become a text source
 * (kind 'text', extracted_text holds the Q&A) and ingest-source runs with run_extraction so the brief is rebuilt.
 */
export async function answerQuestions(
  offerId: string,
  input: { answers: { id: string; answer: string }[]; note: string; reextract: boolean },
): Promise<ActionResult<{ reextracted: boolean }>> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const { supabase, workspaceId } = g.ctx;
  const offer = await loadOffer(g.ctx, offerId);
  if (!offer) return fail("Offer not found.");
  const { data: questions } = await supabase.from("offer_questions").select("id, question").eq("offer_id", offer.id);
  const byId = new Map((questions ?? []).map((q) => [q.id, q.question]));
  const answered: { q: string; a: string }[] = [];
  for (const { id, answer } of input.answers) {
    if (!byId.has(id)) continue;
    const a = answer.trim();
    const { error } = await supabase.from("offer_questions").update({ answer: a || null, answered_at: a ? new Date().toISOString() : null }).eq("id", id);
    if (error) return fail(error.message);
    if (a) answered.push({ q: byId.get(id)!, a });
  }
  const note = input.note.trim();
  if (!input.reextract) {
    revalidateOffer(offer.id);
    return done({ reextracted: false });
  }
  if (answered.length === 0 && !note) {
    const err = await invokeFn(supabase, "extract-offer", { offer_id: offer.id });
    if (!err) await supabase.from("offers").update({ status: "extracting" }).eq("id", offer.id);
    revalidateOffer(offer.id);
    return err ? fail(err) : done({ reextracted: true });
  }
  const text = [
    "Answers to open questions, supplied by the offer owner.",
    ...answered.map(({ q, a }) => `Q: ${q}\nA: ${a}`),
    ...(note ? [`Additional notes:\n${note}`] : []),
  ].join("\n\n");
  const { data: src, error } = await supabase
    .from("offer_sources")
    .insert({ offer_id: offer.id, workspace_id: workspaceId, kind: "text", title: `Answers to open questions (${new Date().toLocaleDateString("en-US")})`, extracted_text: text })
    .select("id")
    .single();
  if (error) return fail(error.message);
  await supabase.from("offers").update({ status: "extracting" }).eq("id", offer.id);
  const err = await invokeFn(supabase, "ingest-source", { source_id: src.id, run_extraction: true });
  revalidateOffer(offer.id);
  return err ? fail(err) : done({ reextracted: true });
}

// ---------------------------------------------------------------- research

export async function refreshResearch(offerId: string): Promise<ActionResult> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const offer = await loadOffer(g.ctx, offerId);
  if (!offer) return fail("Offer not found.");
  const err = await invokeFn(g.ctx.supabase, "refresh-research", { offer_id: offer.id });
  revalidateOffer(offer.id);
  return err ? fail(err) : done(undefined);
}

// ---------------------------------------------------------------- claims ledger

const ClaimInput = z.object({
  claim_text: z.string().trim().min(1, "Write the claim."),
  claim_type: ClaimType,
  role: z.enum(CLAIM_ROLES).nullable(),
  evidence_grade: z.enum(EVIDENCE_GRADES).nullable(),
  evidence: z.object({
    source_ref: z.string().nullable(),
    quote: z.string().nullable(),
    endpoint: z.string().nullable(),
    population: z.string().nullable(),
    dose: z.string().nullable(),
    duration: z.string().nullable(),
    effect_size: z.string().nullable(),
  }),
  precision: z.string().nullable(),
  typical_result: z.string().nullable(),
  status: z.enum(CLAIM_STATUSES),
  material_connection: z.boolean(),
  story_claim: z.boolean(),
  establishment_signal: z.boolean(),
});
export type ClaimInput = z.input<typeof ClaimInput>;

export async function saveClaim(offerId: string, claimId: string | null, raw: ClaimInput): Promise<ActionResult<{ id: string }>> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const parsed = ClaimInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid claim.");
  const { supabase, workspaceId } = g.ctx;
  const v = parsed.data;
  const fields = {
    claim_text: v.claim_text,
    claim_type: v.claim_type,
    role: v.role,
    evidence_grade: v.evidence_grade,
    evidence: v.evidence as unknown as J,
    precision: v.precision,
    typical_result: v.typical_result,
    status: v.status,
    material_connection: v.material_connection,
    story_claim: v.story_claim,
    establishment_signal: v.establishment_signal,
  };
  if (claimId) {
    const { data, error } = await supabase.from("offer_claims").update(fields).eq("id", claimId).eq("workspace_id", workspaceId).select("id").single();
    if (error) return fail(error.message);
    revalidateOffer(offerId);
    return done({ id: data.id });
  }
  const offer = await loadOffer(g.ctx, offerId);
  if (!offer) return fail("Offer not found.");
  const { data, error } = await supabase
    .from("offer_claims")
    .insert({ ...fields, offer_id: offer.id, workspace_id: workspaceId, created_by: "user" })
    .select("id")
    .single();
  if (error) return fail(error.message);
  revalidateOffer(offerId);
  return done({ id: data.id });
}

export async function deleteClaim(offerId: string, claimId: string): Promise<ActionResult> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const { error } = await g.ctx.supabase.from("offer_claims").delete().eq("id", claimId).eq("workspace_id", g.ctx.workspaceId);
  if (error) return fail(error.message);
  revalidateOffer(offerId);
  return done(undefined);
}

/**
 * The user's decision on a flagged claim. The flag stays on the row for the record.
 * keep: the claim stands as written (status unverified unless the user later verifies it).
 * rewrite: suggested_rewrite replaces claim_text.
 * drop: the row stays visible, marked dropped; the engine never uses it.
 */
export async function decideClaim(offerId: string, claimId: string, decision: "keep" | "rewrite" | "drop"): Promise<ActionResult> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const { supabase, workspaceId } = g.ctx;
  const { data: claim } = await supabase.from("offer_claims").select("id, claim_text, flag, evidence_grade").eq("id", claimId).eq("workspace_id", workspaceId).maybeSingle();
  if (!claim) return fail("Claim not found.");
  const flag = (claim.flag ?? {}) as { suggested_rewrite?: string | null };
  const update: ClaimUpdate = { user_decision: decision };
  if (decision === "rewrite") {
    if (!flag.suggested_rewrite) return fail("This flag has no suggested rewrite. Edit the claim instead.");
    update.claim_text = flag.suggested_rewrite;
    update.status = "unverified";
  } else if (decision === "keep") {
    update.status = "unverified";
  } else {
    update.status = "flagged";
  }
  const { error } = await supabase.from("offer_claims").update(update).eq("id", claim.id);
  if (error) return fail(error.message);
  revalidateOffer(offerId);
  return done(undefined);
}

// ---------------------------------------------------------------- offer variants

async function requeueWaiting(ctx: Ctx, offerId: string, variantIds: string[], newVariantId: string): Promise<string[]> {
  if (variantIds.length === 0) return [];
  const { data: waiting } = await ctx.supabase.from("generations").select("id, variant_id").eq("offer_id", offerId).eq("status", "needs_input").in("variant_id", variantIds);
  const requeued: string[] = [];
  for (const gen of waiting ?? []) {
    if (gen.variant_id !== newVariantId) await ctx.supabase.from("generations").update({ variant_id: newVariantId }).eq("id", gen.id);
    const { error } = await ctx.supabase.rpc("requeue_generation", { p_generation_id: gen.id, p_from_step: "argument" });
    if (!error) requeued.push(gen.id);
  }
  return requeued;
}

export async function approveVariant(offerId: string, variantId: string): Promise<ActionResult<{ requeued: number }>> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const { supabase, workspaceId, userId } = g.ctx;
  const { data: v, error } = await supabase
    .from("offer_variants")
    .update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString() })
    .eq("id", variantId)
    .eq("workspace_id", workspaceId)
    .select("id, offer_id")
    .single();
  if (error) return fail(error.message);
  const requeued = await requeueWaiting(g.ctx, v.offer_id, [v.id], v.id);
  revalidateOffer(offerId);
  revalidatePath("/app/generations");
  return done({ requeued: requeued.length });
}

export async function rejectVariant(offerId: string, variantId: string): Promise<ActionResult> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const { error } = await g.ctx.supabase.from("offer_variants").update({ status: "rejected", approved_by: null, approved_at: null }).eq("id", variantId).eq("workspace_id", g.ctx.workspaceId);
  if (error) return fail(error.message);
  revalidateOffer(offerId);
  return done(undefined);
}

/** Approve a variant copied from the brief: the offer exactly as the sources describe it. */
export async function skipOfferConstruction(offerId: string): Promise<ActionResult<{ requeued: number }>> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const { supabase, workspaceId, userId } = g.ctx;
  const offer = await loadOffer(g.ctx, offerId);
  if (!offer) return fail("Offer not found.");
  const brief = normalizeBrief(offer.brief);
  const chosen = chosenFromBrief(brief);
  const { data: proposed } = await supabase.from("offer_variants").select("id").eq("offer_id", offer.id).eq("status", "proposed");
  const { data: v, error } = await supabase
    .from("offer_variants")
    .insert({
      offer_id: offer.id,
      workspace_id: workspaceId,
      options_sheet: [],
      chosen: chosen as unknown as J,
      reasons: chosen.reasons as string,
      guarantee: chosen.guarantee,
      deadline: null,
      gap_note: "Offer construction skipped: the offer is used as written in the brief.",
      status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return fail(error.message);
  const requeued = await requeueWaiting(g.ctx, offer.id, (proposed ?? []).map((p) => p.id), v.id);
  revalidateOffer(offer.id);
  revalidatePath("/app/generations");
  return done({ requeued: requeued.length });
}

// ---------------------------------------------------------------- voice profiles

const VoiceCreate = z.object({
  offerId: z.string().uuid().nullable(),
  name: z.string().trim().min(1, "Name the voice."),
  samples: z.array(z.object({ title: z.string().nullable(), text: z.string().trim().min(1) })).min(3, "Paste at least three samples.").max(10, "Ten samples at most."),
});
export type VoiceCreateInput = z.input<typeof VoiceCreate>;

export async function createVoiceProfile(raw: VoiceCreateInput, revalidateOfferId: string): Promise<ActionResult<{ id: string }>> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const parsed = VoiceCreate.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid voice profile.");
  const { supabase, workspaceId } = g.ctx;
  const { data, error } = await supabase
    .from("voice_profiles")
    .insert({ workspace_id: workspaceId, offer_id: parsed.data.offerId, name: parsed.data.name, samples: parsed.data.samples as unknown as J })
    .select("id")
    .single();
  if (error) return fail(error.message);
  const err = await invokeFn(supabase, "voice-profile", { voice_profile_id: data.id });
  revalidateOffer(revalidateOfferId);
  if (err) return fail(`Profile saved, but analysis did not start. ${err}`);
  return done({ id: data.id });
}

const VoiceUpdate = z.object({
  name: z.string().trim().min(1),
  greeting: z.string().nullable(),
  readability_band: z.string().nullable(),
  idiom_bank: z.array(z.string()),
  dead_words: z.array(z.string()),
  exemplar_paragraphs: z.array(z.object({ label: z.string(), text: z.string() })),
  story_inventory: z.array(z.string()),
  samples: z.array(z.object({ title: z.string().nullable(), text: z.string().trim().min(1) })).max(10),
});
export type VoiceUpdateInput = z.input<typeof VoiceUpdate>;

export async function updateVoiceProfile(id: string, raw: VoiceUpdateInput, revalidateOfferId: string): Promise<ActionResult> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const parsed = VoiceUpdate.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid voice profile.");
  const v = parsed.data;
  const { error } = await g.ctx.supabase
    .from("voice_profiles")
    .update({
      name: v.name,
      greeting: v.greeting,
      readability_band: v.readability_band,
      idiom_bank: v.idiom_bank,
      dead_words: v.dead_words,
      exemplar_paragraphs: v.exemplar_paragraphs as unknown as J,
      story_inventory: v.story_inventory,
      samples: v.samples as unknown as J,
    })
    .eq("id", id)
    .eq("workspace_id", g.ctx.workspaceId);
  if (error) return fail(error.message);
  revalidateOffer(revalidateOfferId);
  return done(undefined);
}

export async function rerunVoiceProfile(id: string, revalidateOfferId: string): Promise<ActionResult> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const { data } = await g.ctx.supabase.from("voice_profiles").select("id").eq("id", id).eq("workspace_id", g.ctx.workspaceId).maybeSingle();
  if (!data) return fail("Voice profile not found.");
  const err = await invokeFn(g.ctx.supabase, "voice-profile", { voice_profile_id: id });
  revalidateOffer(revalidateOfferId);
  return err ? fail(err) : done(undefined);
}

export async function deleteVoiceProfile(id: string, revalidateOfferId: string): Promise<ActionResult> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const { error } = await g.ctx.supabase.from("voice_profiles").delete().eq("id", id).eq("workspace_id", g.ctx.workspaceId);
  if (error) return fail(error.message);
  revalidateOffer(revalidateOfferId);
  return done(undefined);
}

// ---------------------------------------------------------------- per-offer config

const ConfigInput = z.object({
  vertical: z.string().trim().nullable(),
  business_opportunity: z.boolean(),
  notice_recipient: z.boolean(),
  humor_policy: z.object({ allowed: z.boolean(), notes: z.string().nullable() }),
  greeting: z.string().nullable(),
  edge_tolerance: z.enum(EDGE_TOLERANCES).nullable(),
  refund_window_days: z.number().int().min(0).nullable(),
  first_week_experience: z.string().nullable(),
});
export type ConfigInput = z.input<typeof ConfigInput>;

export async function saveOfferConfig(offerId: string, raw: ConfigInput): Promise<ActionResult> {
  const g = await editor();
  if (!g.ok) return fail(g.error);
  const parsed = ConfigInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid settings.");
  const offer = await loadOffer(g.ctx, offerId);
  if (!offer) return fail("Offer not found.");
  const v = parsed.data;
  const { error } = await g.ctx.supabase.from("offer_config").upsert(
    {
      offer_id: offer.id,
      workspace_id: g.ctx.workspaceId,
      vertical: v.vertical || null,
      business_opportunity: v.business_opportunity,
      notice_recipient: v.notice_recipient,
      humor_policy: v.humor_policy as unknown as J,
      greeting: v.greeting,
      edge_tolerance: v.edge_tolerance,
      refund_window_days: v.refund_window_days,
      first_week_experience: v.first_week_experience,
    },
    { onConflict: "offer_id" },
  );
  if (error) return fail(error.message);
  revalidateOffer(offer.id);
  return done(undefined);
}
