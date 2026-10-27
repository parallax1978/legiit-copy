"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace, canEdit } from "@/lib/auth";
import { FORMAT_IDS } from "@/lib/formats";
import { settingsToInput, type GenerationOptions, type DraftRow } from "@/lib/data/generations";
import type { Json } from "@/lib/supabase/database.types";
import { initialSteps } from "@engine/pipeline.ts";
import { stripNeverTells } from "@engine/draft/never_tells.ts";
import { draftFromMarkdown, draftToMarkdown, readDraftOutput, replaceInDraft, ledgerIdsInDraft, draftWords } from "@/components/editor/markdown-blocks";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };
type J = NonNullable<Json>;

async function editorContext() {
  const current = await requireWorkspace();
  if (!canEdit(current.role)) return { error: "Viewers cannot change copy in this workspace." as const, current: null, supabase: null };
  const supabase = await createClient();
  return { error: null, current, supabase };
}

const CreateInput = z.object({
  offer_id: z.string().uuid(),
  format: z.enum(FORMAT_IDS),
  purpose: z.string().trim().max(2000).optional().default(""),
  length: z.enum(["shorter", "standard", "longer"]).optional().default("standard"),
  cta: z.string().trim().max(500).optional().default(""),
  deadline: z.string().trim().max(300).optional().default(""),
  instructions: z.string().trim().max(4000).optional().default(""),
  sequence_type: z.string().trim().max(60).optional().default(""),
  control_text: z.string().trim().max(60000).optional().default(""),
  skip_offer: z.boolean().optional().default(false),
  voice_profile_id: z.string().uuid().nullable().optional().default(null),
});
export type CreateGenerationInput = z.input<typeof CreateInput>;

/** Write the same piece again with the same settings (after new research, answered questions or ledger changes). Redirects to the new run. */
export async function rewriteGeneration(generationId: string): Promise<ActionResult> {
  const ctx = await editorContext();
  if (ctx.error) return { ok: false, error: ctx.error };
  const { data: g } = await ctx.supabase.from("generations").select("offer_id, format, purpose, options, voice_profile_id").eq("id", generationId).eq("workspace_id", ctx.current.workspace.id).maybeSingle();
  if (!g) return { ok: false, error: "That piece is not in this workspace." };
  // settingsToInput builds the wizard shape; createGeneration validates it (the format enum included) before anything is written.
  return createGeneration(settingsToInput({ offer_id: g.offer_id, format: g.format, purpose: g.purpose ?? "", options: (g.options as GenerationOptions | null) ?? {}, voice_profile_id: g.voice_profile_id ?? null }) as CreateGenerationInput);
}

/** Insert a queued generation; the database trigger enqueues the first step. Redirects to the generation page. */
export async function createGeneration(raw: CreateGenerationInput): Promise<ActionResult> {
  const parsed = CreateInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  const input = parsed.data;
  const ctx = await editorContext();
  if (ctx.error) return { ok: false, error: ctx.error };
  const { supabase, current } = ctx;
  const workspaceId = current.workspace.id;

  const [{ data: offer }, { data: research }, { data: variant }] = await Promise.all([
    supabase.from("offers").select("id").eq("id", input.offer_id).eq("workspace_id", workspaceId).maybeSingle(),
    supabase.from("offer_research").select("id").eq("offer_id", input.offer_id).eq("active", true).maybeSingle(),
    supabase.from("offer_variants").select("id").eq("offer_id", input.offer_id).eq("status", "approved").order("approved_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!offer) return { ok: false, error: "That offer is not in this workspace." };

  const options: GenerationOptions = {
    purpose: input.purpose || undefined,
    length: input.length,
    cta: input.cta || undefined,
    deadline: input.deadline || undefined,
    instructions: input.instructions || undefined,
    sequence_type: input.format === "email_sequence" ? input.sequence_type || undefined : undefined,
    control_text: input.control_text || undefined,
    skip_offer: input.skip_offer || undefined,
  };
  const step_order = initialSteps({ hasActiveResearch: !!research, hasApprovedOffer: !!variant, skipOffer: input.skip_offer });

  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("generations")
    .insert({
      workspace_id: workspaceId,
      offer_id: input.offer_id,
      format: input.format,
      purpose: input.purpose || null,
      options: options as unknown as J,
      status: "queued",
      current_step: step_order[0],
      step_order: step_order as unknown as J,
      research_id: research?.id ?? null,
      variant_id: variant?.id ?? null,
      voice_profile_id: input.voice_profile_id,
      created_by: user.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/generations");
  redirect(`/app/generations/${data.id}`);
}

export async function cancelGeneration(generationId: string): Promise<ActionResult> {
  const ctx = await editorContext();
  if (ctx.error) return { ok: false, error: ctx.error };
  const { error } = await ctx.supabase.from("generations").update({ status: "cancelled", progress_message: "Cancelled by user" }).eq("id", generationId).in("status", ["queued", "running", "needs_input"]);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/generations/${generationId}`);
  revalidatePath("/app/generations");
  return { ok: true };
}

/** Retry from the step that failed (or the first step when none is recorded). */
export async function retryGeneration(generationId: string): Promise<ActionResult> {
  const ctx = await editorContext();
  if (ctx.error) return { ok: false, error: ctx.error };
  const { data: g } = await ctx.supabase.from("generations").select("current_step, step_order, status").eq("id", generationId).maybeSingle();
  if (!g) return { ok: false, error: "Generation not found." };
  const order = Array.isArray(g.step_order) ? (g.step_order as string[]) : [];
  const from = g.current_step ?? order[0] ?? "argument";
  const { error } = await ctx.supabase.rpc("requeue_generation", { p_generation_id: generationId, p_from_step: from });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/generations/${generationId}`);
  return { ok: true };
}

/** After the offer construction was approved on the offer page, carry on from the argument step. */
export async function continueGeneration(generationId: string): Promise<ActionResult> {
  const ctx = await editorContext();
  if (ctx.error) return { ok: false, error: ctx.error };
  const { data: g } = await ctx.supabase.from("generations").select("offer_id, options").eq("id", generationId).maybeSingle();
  if (!g) return { ok: false, error: "Generation not found." };
  const { data: variant } = await ctx.supabase.from("offer_variants").select("id").eq("offer_id", g.offer_id).eq("status", "approved").order("approved_at", { ascending: false }).limit(1).maybeSingle();
  const opts = (g.options as GenerationOptions | null) ?? {};
  if (!variant && !opts.skip_offer) return { ok: false, error: "The offer construction has not been approved yet. Approve it on the offer page first, or restart with the offer as written." };
  if (variant) await ctx.supabase.from("generations").update({ variant_id: variant.id }).eq("id", generationId);
  const { error } = await ctx.supabase.rpc("requeue_generation", { p_generation_id: generationId, p_from_step: "argument" });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/generations/${generationId}`);
  return { ok: true };
}

/** Skip offer construction for a generation waiting on approval and draft from the offer as written. */
export async function draftWithOfferAsWritten(generationId: string): Promise<ActionResult> {
  const ctx = await editorContext();
  if (ctx.error) return { ok: false, error: ctx.error };
  const { data: g } = await ctx.supabase.from("generations").select("options").eq("id", generationId).maybeSingle();
  if (!g) return { ok: false, error: "Generation not found." };
  const opts = { ...((g.options as GenerationOptions | null) ?? {}), skip_offer: true };
  const { error: upErr } = await ctx.supabase.from("generations").update({ options: opts as unknown as J }).eq("id", generationId);
  if (upErr) return { ok: false, error: upErr.message };
  const { error } = await ctx.supabase.rpc("requeue_generation", { p_generation_id: generationId, p_from_step: "argument" });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/generations/${generationId}`);
  return { ok: true };
}

/** Exclude the current winner and restart from argument selection. */
export async function tryAnotherAngle(generationId: string): Promise<ActionResult> {
  const ctx = await editorContext();
  if (ctx.error) return { ok: false, error: ctx.error };
  const { supabase } = ctx;
  const { data: g } = await supabase.from("generations").select("options, selected_angle_id, status").eq("id", generationId).maybeSingle();
  if (!g) return { ok: false, error: "Generation not found." };
  if (!["completed", "failed", "cancelled", "needs_input"].includes(g.status)) return { ok: false, error: "Wait for the current run to finish or cancel it first." };
  let winnerId = g.selected_angle_id;
  if (!winnerId) {
    const { data: w } = await supabase.from("angles").select("id").eq("generation_id", generationId).eq("is_winner", true).limit(1).maybeSingle();
    winnerId = w?.id ?? null;
  }
  const opts = (g.options as GenerationOptions | null) ?? {};
  const exclude = new Set(opts.exclude_angle_ids ?? []);
  if (winnerId) exclude.add(winnerId);
  const { error: upErr } = await supabase.from("generations").update({ options: { ...opts, exclude_angle_ids: Array.from(exclude) } as unknown as J }).eq("id", generationId);
  if (upErr) return { ok: false, error: upErr.message };
  const { error } = await supabase.rpc("requeue_generation", { p_generation_id: generationId, p_from_step: "argument" });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/generations/${generationId}`);
  return { ok: true };
}

async function latestDraft(supabase: Awaited<ReturnType<typeof createClient>>, generationId: string): Promise<DraftRow | null> {
  const { data } = await supabase.from("drafts").select("*").eq("generation_id", generationId).order("version", { ascending: false }).limit(1).maybeSingle();
  return data ?? null;
}

async function insertVersion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: DraftRow,
  next: { blocks: unknown; markdown: string; origin: "user" | "rewrite"; label: string | null; ledger_refs: string[]; word_count: number; skim_path: Json | null },
): Promise<ActionResult<{ draft_id: string; version: number }>> {
  const { data: user } = await supabase.auth.getUser();
  const latest = await latestDraft(supabase, base.generation_id);
  const version = (latest?.version ?? base.version) + 1;
  const { data, error } = await supabase
    .from("drafts")
    .insert({
      generation_id: base.generation_id,
      workspace_id: base.workspace_id,
      version,
      origin: next.origin,
      label: next.label,
      blocks: next.blocks as J,
      markdown: next.markdown,
      skim_path: next.skim_path,
      ledger_refs: next.ledger_refs as unknown as J,
      word_count: next.word_count,
      created_by: user.user?.id ?? null,
    })
    .select("id, version")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/generations/${base.generation_id}`);
  return { ok: true, draft_id: data.id, version: data.version };
}

/** Save the editor's markdown as a new user version. */
export async function saveDraftVersion(generationId: string, markdown: string, label?: string): Promise<ActionResult<{ draft_id: string; version: number }>> {
  const ctx = await editorContext();
  if (ctx.error) return { ok: false, error: ctx.error };
  const base = await latestDraft(ctx.supabase, generationId);
  if (!base) return { ok: false, error: "There is no draft to edit yet." };
  const md = markdown.replace(/\r\n/g, "\n").trim();
  if (!md) return { ok: false, error: "The draft is empty." };
  if (md === base.markdown.trim()) return { ok: false, error: "No changes to save." };
  const previous = readDraftOutput(base.blocks);
  const draft = draftFromMarkdown(md, previous);
  return insertVersion(ctx.supabase, base, { blocks: draft, markdown: md + "\n", origin: "user", label: label?.trim() || "Edited", ledger_refs: draft.ledger_refs_used, word_count: draft.word_count, skim_path: base.skim_path });
}

const RewriteInput = z.object({
  draft_id: z.string().uuid(),
  block_id: z.string().optional(),
  selected_text: z.string().trim().min(1).max(8000),
  instruction: z.string().trim().min(1).max(2000),
});
export type RewriteInput = z.input<typeof RewriteInput>;

/** Ask the rewrite-passage Edge Function for a new version with the selection rewritten. */
export async function rewritePassage(raw: RewriteInput): Promise<ActionResult<{ draft_id: string | null; version: number | null }>> {
  const parsed = RewriteInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  const ctx = await editorContext();
  if (ctx.error) return { ok: false, error: ctx.error };
  const { data: draft } = await ctx.supabase.from("drafts").select("generation_id").eq("id", parsed.data.draft_id).maybeSingle();
  if (!draft) return { ok: false, error: "Draft not found." };
  const { data, error } = await ctx.supabase.functions.invoke<{ draft_id?: string; version?: number; error?: string }>("rewrite-passage", { body: parsed.data });
  if (error) return { ok: false, error: await describeFunctionError(error, "rewrite-passage") };
  if (data?.error) return { ok: false, error: data.error };
  revalidatePath(`/app/generations/${draft.generation_id}`);
  return { ok: true, draft_id: data?.draft_id ?? null, version: data?.version ?? null };
}

async function describeFunctionError(error: unknown, fn: string): Promise<string> {
  const e = error as { message?: string; context?: Response };
  try {
    if (e.context && typeof e.context.text === "function") {
      const body = await e.context.text();
      if (body) {
        try {
          const j = JSON.parse(body) as { error?: string; message?: string };
          return j.error ?? j.message ?? body.slice(0, 300);
        } catch {
          return body.slice(0, 300);
        }
      }
    }
  } catch {
    /* ignore */
  }
  return e.message ? `${fn}: ${e.message}` : `${fn} failed`;
}

/** Record the user's decision on a flag. "rewrite" also creates a new version with the quote replaced. */
export async function decideFlag(flagId: string, decision: "keep" | "drop" | "rewrite"): Promise<ActionResult<{ version?: number; replaced?: number }>> {
  const ctx = await editorContext();
  if (ctx.error) return { ok: false, error: ctx.error };
  const { supabase } = ctx;
  const { data: flag } = await supabase.from("draft_flags").select("*").eq("id", flagId).maybeSingle();
  if (!flag) return { ok: false, error: "Flag not found." };
  const { data: user } = await supabase.auth.getUser();
  let version: number | undefined;
  let replaced: number | undefined;

  if (decision === "rewrite") {
    if (!flag.quote || !flag.suggested_rewrite) return { ok: false, error: "This flag has no suggested rewrite to apply." };
    // a rewritten line is new copy: no em dash, emoji or hashtag goes in with it (docs/04 §7.1), even on flags written before the reviewers stripped them
    const rewrite = stripNeverTells(flag.suggested_rewrite);
    const base = await latestDraft(supabase, flag.generation_id);
    if (!base) return { ok: false, error: "No draft to rewrite." };
    const parsedDraft = readDraftOutput(base.blocks);
    let nextBlocks: unknown = base.blocks;
    let nextMarkdown = base.markdown;
    let ledger: string[] = Array.isArray(base.ledger_refs) ? (base.ledger_refs as string[]) : [];
    let words = base.word_count ?? 0;
    if (parsedDraft) {
      const r = replaceInDraft(parsedDraft, flag.quote, rewrite);
      replaced = r.count;
      nextBlocks = r.draft;
      nextMarkdown = r.count > 0 ? draftToMarkdown(r.draft) : base.markdown.split(flag.quote).join(rewrite);
      ledger = ledgerIdsInDraft(r.draft);
      words = draftWords(r.draft);
    } else {
      replaced = base.markdown.split(flag.quote).length - 1;
      nextMarkdown = base.markdown.split(flag.quote).join(rewrite);
    }
    if (!replaced) return { ok: false, error: "The quoted line is no longer in the latest version. Edit it by hand instead." };
    const res = await insertVersion(supabase, base, { blocks: nextBlocks, markdown: nextMarkdown, origin: "rewrite", label: `Applied ${flag.source} rewrite`, ledger_refs: ledger, word_count: words, skim_path: base.skim_path });
    if (!res.ok) return res;
    version = res.version;
  }

  const { error } = await supabase.from("draft_flags").update({ decision, decided_by: user.user?.id ?? null, decided_at: new Date().toISOString() }).eq("id", flagId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/generations/${flag.generation_id}`);
  return { ok: true, version, replaced };
}

export async function submitFeedback(draftId: string, rating: -1 | 1, reason?: string): Promise<ActionResult> {
  const current = await requireWorkspace();
  const supabase = await createClient();
  const { data: draft } = await supabase.from("drafts").select("workspace_id, generation_id").eq("id", draftId).maybeSingle();
  if (!draft) return { ok: false, error: "Draft not found." };
  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase.from("draft_feedback").insert({ draft_id: draftId, workspace_id: draft.workspace_id, user_id: user.user?.id ?? null, rating, reason: reason?.trim() || null });
  if (error) return { ok: false, error: canEdit(current.role) ? error.message : "Viewers cannot leave feedback in this workspace." };
  revalidatePath(`/app/generations/${draft.generation_id}`);
  return { ok: true };
}

const ReportInput = z.object({
  generation_id: z.string().uuid(),
  metric: z.string().trim().min(1).max(80),
  value: z.number().finite(),
  control_value: z.number().finite().nullable(),
  refund_rate: z.number().min(0).max(100).nullable(),
  notes: z.string().trim().max(1000).optional().default(""),
});
export type ReportResultInput = z.input<typeof ReportInput>;

/** Store the real-world result against the reviewer's prediction. */
export async function reportResult(raw: ReportResultInput): Promise<ActionResult> {
  const parsed = ReportInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  const input = parsed.data;
  const ctx = await editorContext();
  if (ctx.error) return { ok: false, error: ctx.error };
  const { supabase } = ctx;
  const { data: g } = await supabase.from("generations").select("id, workspace_id").eq("id", input.generation_id).maybeSingle();
  if (!g) return { ok: false, error: "Generation not found." };
  const reported = { metric: input.metric, value: input.value, control_value: input.control_value, notes: input.notes || undefined } as unknown as Json;
  const refund = input.refund_rate == null ? null : input.refund_rate / 100;
  const { data: existing } = await supabase.from("generation_predictions").select("id").eq("generation_id", g.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("generation_predictions").update({ reported_result: reported, refund_rate: refund, reported_at: new Date().toISOString() }).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const latest = await latestDraft(supabase, g.id);
    const { error } = await supabase.from("generation_predictions").insert({ generation_id: g.id, workspace_id: g.workspace_id, draft_id: latest?.id ?? null, prediction: "unsure", reason: "No reviewer prediction was recorded; result reported by the user.", reported_result: reported, refund_rate: refund, reported_at: new Date().toISOString() });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath(`/app/generations/${g.id}`);
  return { ok: true };
}

/** DOCX (and other server-rendered kinds) via the export Edge Function, which returns a signed URL. */
export async function exportDraft(draftId: string, kind: "docx" | "md" | "html" | "txt", sectionIds?: string[]): Promise<ActionResult<{ url: string }>> {
  await requireWorkspace();
  const supabase = await createClient();
  const body: Record<string, unknown> = { draft_id: draftId, kind };
  if (sectionIds?.length) body.section_ids = sectionIds;
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>("export", { body });
  if (error) return { ok: false, error: await describeFunctionError(error, "export") };
  if (!data?.url) return { ok: false, error: data?.error ?? "The export did not return a file." };
  return { ok: true, url: data.url };
}
