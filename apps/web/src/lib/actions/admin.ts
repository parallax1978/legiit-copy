"use server";
/**
 * Admin server actions. Every action re-checks app_admins through requireAdmin() and goes through the
 * normal RLS client. Edge functions (embed, judge, eval-run, baseline-generate) are invoked with the
 * admin's JWT via supabase.functions.invoke.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, getUser } from "@/lib/auth";
import type { Json } from "@/lib/supabase/database.types";
import {
  type ActionResult,
  EXAMPLE_STATUSES,
  RIGHTS_STATUSES,
  SECTION_TYPES,
  EFFORTS,
  SETTING_KEYS,
  type SettingKey,
  allowsFullText,
  extractRecords,
  mapCritiqueRecord,
  mapControlRecord,
  mapSplitTestRecord,
  mapExampleRecord,
  mapEvalBriefRecord,
  getActivePromptVersions,
} from "@/lib/data/admin";
import { STEP_NAMES } from "@engine/config.ts";

export type FormState = { ok?: boolean; error?: string; message?: string; id?: string };

// ---------------------------------------------------------------------------------------------
// helpers (not exported: a "use server" module may only export async functions)
// ---------------------------------------------------------------------------------------------

async function admin() {
  await requireAdmin();
  const user = await getUser();
  const supabase = await createClient();
  return { supabase, user: user! };
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e));
const fail = (e: unknown): ActionResult<never> => ({ ok: false, error: errorMessage(e) });

function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}
function lines(fd: FormData, key: string): string[] {
  return (text(fd, key) ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
function checkbox(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}
function jsonField(fd: FormData, key: string, kind: "object" | "array" | "any", fallback: Json): Json {
  const raw = text(fd, key);
  if (!raw) return fallback;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`${key}: invalid JSON (${(e as Error).message})`);
  }
  if (kind === "object" && (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))) throw new Error(`${key}: must be a JSON object`);
  if (kind === "array" && !Array.isArray(parsed)) throw new Error(`${key}: must be a JSON array`);
  return parsed as Json;
}
function oneOf<T extends readonly string[]>(value: string | null, allowed: T, label: string, fallback?: T[number]): T[number] {
  if (value && (allowed as readonly string[]).includes(value)) return value as T[number];
  if (value === null && fallback !== undefined) return fallback;
  throw new Error(`${label}: must be one of ${allowed.join(", ")}`);
}

async function invokeFunction<T = unknown>(name: string, body: Record<string, unknown>): Promise<ActionResult<T>> {
  const { supabase } = await admin();
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let detail = error.message;
    const ctx = (error as { context?: unknown }).context;
    if (ctx instanceof Response) {
      try {
        const txt = await ctx.text();
        if (txt) detail = `${detail}: ${txt.slice(0, 400)}`;
      } catch {
        /* ignore */
      }
    }
    return { ok: false, error: `${name}: ${detail}` };
  }
  const payload = data as { error?: string } | null;
  if (payload && typeof payload === "object" && typeof payload.error === "string") return { ok: false, error: `${name}: ${payload.error}` };
  return { ok: true, data: data as T };
}

type UpsertSummary = { inserted: number; updated: number; skipped: number; errors: string[] };

/** Upsert rows that carry an external_id (dedupe) and plain-insert the rest. */
async function importRows<TRow extends { external_id?: string | null }>(
  table: "critiques" | "controls" | "split_test_pairs" | "eval_briefs",
  rows: TRow[],
  errors: string[],
): Promise<UpsertSummary> {
  const { supabase } = await admin();
  const summary: UpsertSummary = { inserted: 0, updated: 0, skipped: 0, errors };
  const withId = rows.filter((r) => r.external_id);
  const withoutId = rows.filter((r) => !r.external_id);
  if (withId.length) {
    const ids = withId.map((r) => r.external_id as string);
    const { data: existing } = await supabase.from(table).select("external_id").in("external_id", ids);
    const existingIds = new Set((existing ?? []).map((e) => e.external_id));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from(table).upsert(withId as any, { onConflict: "external_id" });
    if (error) summary.errors.push(error.message);
    else {
      summary.updated += withId.filter((r) => existingIds.has(r.external_id as string)).length;
      summary.inserted += withId.filter((r) => !existingIds.has(r.external_id as string)).length;
    }
  }
  if (withoutId.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from(table).insert(withoutId as any);
    if (error) summary.errors.push(error.message);
    else summary.inserted += withoutId.length;
  }
  return summary;
}

function summarize(s: UpsertSummary): ActionResult<UpsertSummary> {
  const msg = `${s.inserted} inserted, ${s.updated} updated, ${s.skipped} skipped${s.errors.length ? `, ${s.errors.length} error(s)` : ""}`;
  if (s.inserted === 0 && s.updated === 0 && s.errors.length) return { ok: false, error: `${msg}: ${s.errors.slice(0, 3).join("; ")}` };
  return { ok: true, message: msg, data: s };
}

// ---------------------------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------------------------

/** Every admin view of customer data writes an audit_log row. Called from server components and actions. */
export async function recordAdminView(targetType: string, targetId: string, workspaceId: string | null, meta: Record<string, Json> = {}): Promise<void> {
  const { supabase, user } = await admin();
  await supabase.from("audit_log").insert({ actor_id: user.id, workspace_id: workspaceId, action: "admin_view", target_type: targetType, target_id: targetId, meta });
}

// ---------------------------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------------------------

export async function retryStep(generationId: string, step: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await admin();
    const { error } = await supabase.rpc("requeue_generation", { p_generation_id: generationId, p_from_step: step });
    if (error) return fail(error.message === "not allowed" ? "not allowed: requeue_generation requires editor membership in the workspace" : error.message);
    await supabase.from("audit_log").insert({ actor_id: user.id, action: "admin_retry", target_type: "generation", target_id: generationId, meta: { step } });
    revalidatePath("/admin");
    revalidatePath("/admin/costs");
    return { ok: true, message: `Re-queued ${step}` };
  } catch (e) {
    return fail(e);
  }
}

export async function retryGeneration(generationId: string): Promise<ActionResult> {
  try {
    const { supabase } = await admin();
    const { data: g, error } = await supabase.from("generations").select("current_step, step_order").eq("id", generationId).maybeSingle();
    if (error || !g) return fail(error?.message ?? "generation not found");
    const order = Array.isArray(g.step_order) ? (g.step_order as string[]) : [];
    const step = g.current_step ?? order[0] ?? "research";
    return retryStep(generationId, step);
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------------------------

type EmbedResponse = { table?: string; embedded?: number; failed?: { id: string; error: string }[]; remaining?: number };
const EMBED_BATCH = 50;
const EMBED_MAX_BATCHES = 40;

/**
 * embed {table, id?}: with an id embeds one row. Without one the function embeds a single batch of rows missing an
 * embedding and reports `remaining`, so this loops until nothing is left (or a batch makes no progress).
 */
export async function embedRows(table: "examples" | "critiques" | "controls" | "example_sections", id?: string): Promise<ActionResult> {
  let embedded = 0;
  let failed = 0;
  let firstError: string | null = null;
  let remaining = 0;
  for (let batch = 0; batch < EMBED_MAX_BATCHES; batch++) {
    const res = await invokeFunction<EmbedResponse>("embed", id ? { table, id } : { table, limit: EMBED_BATCH });
    if (!res.ok) return embedded ? { ok: false, error: `${res.error} (${embedded} row${embedded === 1 ? "" : "s"} embedded before the error)` } : res;
    const d = res.data ?? {};
    embedded += d.embedded ?? 0;
    failed += d.failed?.length ?? 0;
    firstError ??= d.failed?.[0]?.error ?? null;
    remaining = d.remaining ?? 0;
    // rows that fail stay unembedded, so a batch with no progress would loop on the same failures forever
    if (id || remaining === 0 || (d.embedded ?? 0) === 0) break;
  }
  revalidatePath(`/admin/${table === "critiques" ? "critiques" : table === "controls" ? "controls" : "library"}`, "layout");
  if (id) return { ok: true, message: failed ? `Not embedded: ${firstError ?? "unknown error"}` : "Embedded" };
  const parts = [`Embedded ${embedded} ${table.replace(/_/g, " ")} row${embedded === 1 ? "" : "s"}`];
  if (failed) parts.push(`${failed} failed (${firstError})`);
  if (remaining) parts.push(`${remaining} still missing; run again`);
  return { ok: true, message: parts.join("; ") };
}

// ---------------------------------------------------------------------------------------------
// Library: examples and sections
// ---------------------------------------------------------------------------------------------

function parseExampleForm(fd: FormData) {
  const title = text(fd, "title");
  const format = text(fd, "format");
  if (!title) throw new Error("Title is required");
  if (!format) throw new Error("Format is required");
  const rights = oneOf(text(fd, "rights_status"), RIGHTS_STATUSES, "rights_status", "unknown");
  const excerpt = text(fd, "excerpt");
  if (excerpt && excerpt.length > 400) throw new Error(`Excerpt is ${excerpt.length} characters; the limit is 400`);
  const fullText = text(fd, "full_text");
  if (fullText && !allowsFullText(rights)) throw new Error("Full text may only be stored when rights status is public_domain or licensed. Keep an excerpt (≤400 chars) and annotations instead.");
  return {
    title,
    format,
    author: text(fd, "author"),
    market: text(fd, "market"),
    selling_situation: text(fd, "selling_situation"),
    awareness: text(fd, "awareness"),
    sophistication: text(fd, "sophistication"),
    lead_type: text(fd, "lead_type"),
    argument_sentence: text(fd, "argument_sentence"),
    hook: text(fd, "hook"),
    mechanism_type: text(fd, "mechanism_type"),
    proof_placement: lines(fd, "proof_placement") as Json[],
    offer_devices: lines(fd, "offer_devices") as Json[],
    voice_profile: text(fd, "voice_profile"),
    funnel_position: text(fd, "funnel_position"),
    documented_result: text(fd, "documented_result"),
    is_loser: checkbox(fd, "is_loser"),
    rights_status: rights,
    source_url: text(fd, "source_url"),
    excerpt,
    full_text: allowsFullText(rights) ? fullText : null,
    annotations: jsonField(fd, "annotations", "object", {}) as { [key: string]: Json | undefined },
    lessons: lines(fd, "lessons") as Json[],
    status: oneOf(text(fd, "status"), EXAMPLE_STATUSES, "status", "draft"),
  };
}

export async function saveExample(_prev: FormState, fd: FormData): Promise<FormState> {
  let newId: string | null = null;
  try {
    const { supabase, user } = await admin();
    const id = text(fd, "id");
    const row = parseExampleForm(fd);
    if (id) {
      const { error } = await supabase.from("examples").update(row).eq("id", id);
      if (error) return { error: error.message };
      revalidatePath("/admin/library", "layout");
      return { ok: true, message: "Saved", id };
    }
    const { data, error } = await supabase.from("examples").insert({ ...row, created_by: user.id }).select("id").single();
    if (error) return { error: error.message };
    newId = data.id;
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/admin/library", "layout");
  redirect(`/admin/library/${newId}`);
}

export async function setExampleStatus(id: string, status: string): Promise<ActionResult> {
  try {
    const { supabase } = await admin();
    const s = oneOf(status, EXAMPLE_STATUSES, "status");
    const { error } = await supabase.from("examples").update({ status: s }).eq("id", id);
    if (error) return fail(error.message);
    revalidatePath("/admin/library", "layout");
    return { ok: true, message: `Marked ${s}` };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteExample(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await admin();
    const { error } = await supabase.from("examples").delete().eq("id", id);
    if (error) return fail(error.message);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin/library", "layout");
  redirect("/admin/library");
}

export async function addExampleSection(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase } = await admin();
    const exampleId = text(fd, "example_id");
    if (!exampleId) return { error: "Missing example" };
    const annotation = text(fd, "annotation");
    if (!annotation) return { error: "Annotation is required: describe the section's structure in our words" };
    const excerpt = text(fd, "excerpt");
    if (excerpt && excerpt.length > 400) return { error: `Excerpt is ${excerpt.length} characters; the limit is 400` };
    const sectionType = oneOf(text(fd, "section_type"), SECTION_TYPES, "section_type");
    const fullText = text(fd, "text");
    if (fullText) {
      const { data: ex } = await supabase.from("examples").select("rights_status").eq("id", exampleId).maybeSingle();
      if (!allowsFullText(ex?.rights_status)) return { error: "Section text may only be stored when the example's rights status is public_domain or licensed" };
    }
    const { error } = await supabase.from("example_sections").insert({ example_id: exampleId, section_type: sectionType, annotation, excerpt, text: fullText });
    if (error) return { error: error.message };
    revalidatePath(`/admin/library/${exampleId}`);
    return { ok: true, message: "Section added" };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function deleteExampleSection(id: string, exampleId: string): Promise<ActionResult> {
  try {
    const { supabase } = await admin();
    const { error } = await supabase.from("example_sections").delete().eq("id", id);
    if (error) return fail(error.message);
    revalidatePath(`/admin/library/${exampleId}`);
    return { ok: true, message: "Section removed" };
  } catch (e) {
    return fail(e);
  }
}

export async function importExamples(jsonText: string): Promise<ActionResult<UpsertSummary>> {
  try {
    const { supabase, user } = await admin();
    const records = extractRecords(jsonText);
    const errors: string[] = [];
    const rows = [];
    for (const r of records) {
      try {
        rows.push({ ...mapExampleRecord(r), created_by: user.id });
      } catch (e) {
        errors.push(errorMessage(e));
      }
    }
    // examples has no external_id column; dedupe on annotations.external_id when present
    const extIds = rows.map((r) => (r.annotations as { external_id?: string }).external_id).filter((x): x is string => !!x);
    const existing = new Set<string>();
    if (extIds.length) {
      const { data } = await supabase.from("examples").select("annotations").not("annotations->>external_id", "is", null);
      for (const row of data ?? []) {
        const ext = (row.annotations as { external_id?: string } | null)?.external_id;
        if (ext) existing.add(ext);
      }
    }
    const fresh = rows.filter((r) => {
      const ext = (r.annotations as { external_id?: string }).external_id;
      return !ext || !existing.has(ext);
    });
    const skipped = rows.length - fresh.length;
    let inserted = 0;
    if (fresh.length) {
      const { error } = await supabase.from("examples").insert(fresh);
      if (error) errors.push(error.message);
      else inserted = fresh.length;
    }
    revalidatePath("/admin/library", "layout");
    return summarize({ inserted, updated: 0, skipped, errors });
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------------------------
// Critiques
// ---------------------------------------------------------------------------------------------

export async function saveCritique(_prev: FormState, fd: FormData): Promise<FormState> {
  let newId: string | null = null;
  try {
    const { supabase } = await admin();
    const id = text(fd, "id");
    const row = {
      external_id: text(fd, "external_id"),
      source: text(fd, "source"),
      source_url: text(fd, "source_url"),
      chief: text(fd, "chief"),
      format: text(fd, "format"),
      brief: text(fd, "brief"),
      weak_draft: text(fd, "weak_draft"),
      strong_revision: text(fd, "strong_revision"),
      quote_status: text(fd, "quote_status"),
      defect: text(fd, "defect"),
      defect_named: text(fd, "defect_named"),
      principle: text(fd, "principle"),
      reason: text(fd, "reason"),
      tested: jsonField(fd, "tested", "any", null),
      evidence: text(fd, "evidence"),
      confidence: text(fd, "confidence"),
      ai_failure_map: lines(fd, "ai_failure_map") as Json[],
      tags: lines(fd, "tags") as Json[],
      status: oneOf(text(fd, "status"), EXAMPLE_STATUSES, "status", "curated"),
    };
    if (!row.weak_draft || !row.strong_revision) return { error: "Both the before (weak draft) and after (strong revision) are required" };
    if (id) {
      const { error } = await supabase.from("critiques").update(row).eq("id", id);
      if (error) return { error: error.message };
      revalidatePath("/admin/critiques", "layout");
      return { ok: true, message: "Saved", id };
    }
    const { data, error } = await supabase.from("critiques").insert(row).select("id").single();
    if (error) return { error: error.message };
    newId = data.id;
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/admin/critiques", "layout");
  redirect(`/admin/critiques/${newId}`);
}

export async function setCritiqueStatus(id: string, status: string): Promise<ActionResult> {
  try {
    const { supabase } = await admin();
    const s = oneOf(status, EXAMPLE_STATUSES, "status");
    const { error } = await supabase.from("critiques").update({ status: s }).eq("id", id);
    if (error) return fail(error.message);
    revalidatePath("/admin/critiques", "layout");
    return { ok: true, message: `Marked ${s}` };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCritique(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await admin();
    const { error } = await supabase.from("critiques").delete().eq("id", id);
    if (error) return fail(error.message);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin/critiques", "layout");
  redirect("/admin/critiques");
}

export async function importCritiques(jsonText: string): Promise<ActionResult<UpsertSummary>> {
  try {
    const records = extractRecords(jsonText);
    const errors: string[] = [];
    const rows = [];
    for (const r of records) {
      try {
        const row = mapCritiqueRecord(r);
        if (!row.weak_draft || !row.strong_revision) throw new Error(`${row.external_id ?? "record"}: missing before/after`);
        rows.push(row);
      } catch (e) {
        errors.push(errorMessage(e));
      }
    }
    const s = await importRows("critiques", rows, errors);
    revalidatePath("/admin/critiques", "layout");
    return summarize(s);
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------------------------
// Controls and split tests
// ---------------------------------------------------------------------------------------------

export async function importControls(jsonText: string): Promise<ActionResult<UpsertSummary>> {
  try {
    const records = extractRecords(jsonText);
    const errors: string[] = [];
    const rows = [];
    for (const r of records) {
      try {
        rows.push(mapControlRecord(r));
      } catch (e) {
        errors.push(errorMessage(e));
      }
    }
    const s = await importRows("controls", rows, errors);
    revalidatePath("/admin/controls");
    return summarize(s);
  } catch (e) {
    return fail(e);
  }
}

export async function deleteControl(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await admin();
    const { error } = await supabase.from("controls").delete().eq("id", id);
    if (error) return fail(error.message);
    revalidatePath("/admin/controls");
    return { ok: true, message: "Control deleted" };
  } catch (e) {
    return fail(e);
  }
}

export async function importSplitTests(jsonText: string): Promise<ActionResult<UpsertSummary>> {
  try {
    const records = extractRecords(jsonText);
    const errors: string[] = [];
    const rows = [];
    for (const r of records) {
      try {
        const row = mapSplitTestRecord(r);
        if (!row.variant_a || !row.variant_b) throw new Error(`${row.external_id ?? "record"}: missing variants`);
        rows.push(row);
      } catch (e) {
        errors.push(errorMessage(e));
      }
    }
    const s = await importRows("split_test_pairs", rows, errors);
    revalidatePath("/admin/controls");
    revalidatePath("/admin/evals", "layout");
    return summarize(s);
  } catch (e) {
    return fail(e);
  }
}

export async function setHoldout(id: string, holdout: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await admin();
    const { error } = await supabase.from("split_test_pairs").update({ holdout }).eq("id", id);
    if (error) return fail(error.message);
    revalidatePath("/admin/controls");
    revalidatePath("/admin/evals", "layout");
    return { ok: true, message: holdout ? "Reserved for judge calibration" : "Released to prompts" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteSplitTest(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await admin();
    const { error } = await supabase.from("split_test_pairs").delete().eq("id", id);
    if (error) return fail(error.message);
    revalidatePath("/admin/controls");
    return { ok: true, message: "Pair deleted" };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------------------------

export async function createPromptVersion(_prev: FormState, fd: FormData): Promise<FormState> {
  let step: string;
  try {
    const { supabase, user } = await admin();
    step = oneOf(text(fd, "step"), STEP_NAMES, "step");
    const template = text(fd, "template");
    if (!template) return { error: "Template is required" };
    const model = text(fd, "model");
    if (!model) return { error: "Model is required" };
    const effort = oneOf(text(fd, "effort"), EFFORTS, "effort", "high");
    const maxTokens = Number(text(fd, "max_tokens") ?? "12000");
    if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 12000) return { error: "max_tokens must be an integer between 1 and 12000 (the per-call cap)" };
    const notes = text(fd, "notes");
    const activate = checkbox(fd, "activate");
    const { data: latest } = await supabase.from("prompt_versions").select("version").eq("step", step).order("version", { ascending: false }).limit(1).maybeSingle();
    const version = (latest?.version ?? 0) + 1;
    const { data, error } = await supabase
      .from("prompt_versions")
      .insert({ step, version, template, model, effort, max_tokens: maxTokens, notes, created_by: user.id, active: false })
      .select("id")
      .single();
    if (error) return { error: error.message };
    if (activate) {
      const res = await activatePromptVersion(data.id);
      if (!res.ok) return { error: `Version ${version} created but not activated: ${res.error}`, id: data.id };
    }
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/admin/prompts");
  redirect(`/admin/prompts?step=${step}`);
}

export async function activatePromptVersion(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await admin();
    const { data: pv, error: readError } = await supabase.from("prompt_versions").select("id, step, version").eq("id", id).maybeSingle();
    if (readError || !pv) return fail(readError?.message ?? "version not found");
    const { error: offError } = await supabase.from("prompt_versions").update({ active: false }).eq("step", pv.step).eq("active", true).neq("id", id);
    if (offError) return fail(offError.message);
    const { error } = await supabase.from("prompt_versions").update({ active: true }).eq("id", id);
    if (error) {
      if (error.code === "23505") return fail(`Another version of ${pv.step} is still active (unique index prompt_versions_one_active_per_step). Deactivate it, then retry.`);
      return fail(error.message);
    }
    revalidatePath("/admin/prompts");
    revalidatePath("/admin/evals", "layout");
    return { ok: true, message: `${pv.step} v${pv.version} is now active` };
  } catch (e) {
    return fail(e);
  }
}

export async function deactivatePromptVersion(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await admin();
    const { error } = await supabase.from("prompt_versions").update({ active: false }).eq("id", id);
    if (error) return fail(error.message);
    revalidatePath("/admin/prompts");
    revalidatePath("/admin/evals", "layout");
    return { ok: true, message: "Deactivated; the step falls back to the file prompt" };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------------------------
// Evals: briefs
// ---------------------------------------------------------------------------------------------

export async function saveEvalBrief(_prev: FormState, fd: FormData): Promise<FormState> {
  let newId: string | null = null;
  try {
    const { supabase } = await admin();
    const id = text(fd, "id");
    const name = text(fd, "name");
    if (!name) return { error: "Name is required" };
    const row = {
      name,
      external_id: text(fd, "external_id"),
      market: text(fd, "market"),
      formats: lines(fd, "formats") as Json[],
      brief: jsonField(fd, "brief", "object", {}) as NonNullable<Json>,
      notes: text(fd, "notes"),
    };
    if (id) {
      const { error } = await supabase.from("eval_briefs").update(row).eq("id", id);
      if (error) return { error: error.message };
      revalidatePath("/admin/evals", "layout");
      return { ok: true, message: "Saved", id };
    }
    const { data, error } = await supabase.from("eval_briefs").insert(row).select("id").single();
    if (error) return { error: error.message };
    newId = data.id;
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/admin/evals", "layout");
  redirect(`/admin/evals/briefs/${newId}`);
}

export async function deleteEvalBrief(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await admin();
    const { error } = await supabase.from("eval_briefs").delete().eq("id", id);
    if (error) return fail(error.message);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin/evals", "layout");
  redirect("/admin/evals/briefs");
}

export async function importEvalBriefs(jsonText: string): Promise<ActionResult<UpsertSummary>> {
  try {
    const records = extractRecords(jsonText);
    const errors: string[] = [];
    const rows = [];
    for (const r of records) {
      try {
        rows.push(mapEvalBriefRecord(r));
      } catch (e) {
        errors.push(errorMessage(e));
      }
    }
    const s = await importRows("eval_briefs", rows, errors);
    revalidatePath("/admin/evals", "layout");
    return summarize(s);
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------------------------
// Evals: runs
// ---------------------------------------------------------------------------------------------

export async function createEvalRun(_prev: FormState, fd: FormData): Promise<FormState> {
  let newId: string | null = null;
  try {
    const { supabase, user } = await admin();
    const name = text(fd, "name");
    if (!name) return { error: "Name is required" };
    const baseline = checkbox(fd, "baseline");
    const formats = fd.getAll("formats").map(String).filter(Boolean);
    if (!formats.length) return { error: "Pick at least one format" };
    const modelSet = jsonField(fd, "model_set", "object", {}) as { [key: string]: Json | undefined };
    // snapshot of the currently active prompt versions, {step: prompt_version_id}
    const active = await getActivePromptVersions();
    const promptVersionSet: { [key: string]: Json | undefined } = {};
    for (const [step, pv] of Object.entries(active)) promptVersionSet[step] = pv.id;
    const { data, error } = await supabase
      .from("eval_runs")
      .insert({ name, baseline, model_set: { ...modelSet, formats } as NonNullable<Json>, prompt_version_set: promptVersionSet as NonNullable<Json>, status: "queued", created_by: user.id })
      .select("id")
      .single();
    if (error) return { error: error.message };
    newId = data.id;
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/admin/evals", "layout");
  redirect(`/admin/evals/runs/${newId}`);
}

export async function startEvalRun(runId: string): Promise<ActionResult> {
  const res = await invokeFunction("eval-run", { run_id: runId });
  if (!res.ok) return res;
  revalidatePath(`/admin/evals/runs/${runId}`);
  revalidatePath("/admin/evals", "layout");
  return { ok: true, message: "Run started" };
}

export async function collectEvalRun(runId: string): Promise<ActionResult> {
  const res = await invokeFunction("eval-run", { collect: true, run_id: runId });
  if (!res.ok) return res;
  revalidatePath(`/admin/evals/runs/${runId}`);
  revalidatePath("/admin/evals", "layout");
  return { ok: true, message: "Collected outputs" };
}

export async function generateBaseline(runId: string, briefId: string, format: string): Promise<ActionResult> {
  const res = await invokeFunction("baseline-generate", { run_id: runId, brief_id: briefId, format });
  if (!res.ok) return res;
  revalidatePath(`/admin/evals/runs/${runId}`);
  return { ok: true, message: `Baseline generated for ${format}` };
}

export async function deleteEvalRun(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await admin();
    const { error } = await supabase.from("eval_runs").delete().eq("id", id);
    if (error) return fail(error.message);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/admin/evals", "layout");
  redirect("/admin/evals");
}

/** Blind pairwise verdict. output_a/output_b are the outputs as shown (left/right, randomized); winner is the side picked. */
export async function recordHumanComparison(fd: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await admin();
    const leftId = text(fd, "left_id");
    const rightId = text(fd, "right_id");
    const briefId = text(fd, "brief_id");
    const winner = text(fd, "winner");
    const reason = text(fd, "reason");
    if (!leftId || !rightId || !winner) return fail("Missing pair or verdict");
    if (!["a", "b", "tie"].includes(winner)) return fail("Verdict must be a, b or tie");
    if (!reason) return fail("Write one line on why");
    const { error } = await supabase.from("eval_comparisons").insert({
      kind: "engine_vs_baseline",
      brief_id: briefId,
      output_a: leftId,
      output_b: rightId,
      winner,
      reason,
      judged_by: "human",
      judge_user: user.id,
    });
    if (error) return fail(error.message);
    revalidatePath("/admin/evals", "layout");
    return { ok: true, message: "Recorded" };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------------------------
// Evals: judge
// ---------------------------------------------------------------------------------------------

export async function runJudgeOnHoldout(pairIds: string[]): Promise<ActionResult> {
  if (!pairIds.length) return fail("Select at least one holdout pair");
  const res = await invokeFunction<{ accuracy?: number; correct?: number; pairs_evaluated?: number }>("judge", { pair_ids: pairIds });
  if (!res.ok) return res;
  revalidatePath("/admin/evals", "layout");
  revalidatePath("/admin");
  const d = res.data;
  const msg = d && typeof d.accuracy === "number" ? `Judge scored ${d.correct ?? "?"}/${d.pairs_evaluated ?? pairIds.length} (${Math.round(d.accuracy * 100)}%)` : `Judge ran on ${pairIds.length} pair(s)`;
  return { ok: true, message: msg };
}

/** Judges every engine-vs-baseline pair for a run, one judge invocation per pair. */
export async function judgeRunVsBaseline(runId: string, baselineRunId: string, limit = 20): Promise<ActionResult> {
  try {
    const { supabase } = await admin();
    const [a, b] = await Promise.all([
      supabase.from("eval_outputs").select("id, brief_id, format, markdown").eq("run_id", runId),
      supabase.from("eval_outputs").select("id, brief_id, format, markdown").eq("run_id", baselineRunId),
    ]);
    const byKey = new Map((a.data ?? []).map((o) => [`${o.brief_id}:${o.format}`, o]));
    const pairs = (b.data ?? [])
      .map((o) => ({ base: o, engine: byKey.get(`${o.brief_id}:${o.format}`) }))
      .filter((p): p is { base: (typeof p)["base"]; engine: NonNullable<(typeof p)["engine"]> } => !!p.engine && !!p.engine.markdown && !!p.base.markdown);
    if (!pairs.length) return fail("No brief+format pairs exist across the two runs yet");
    const ids = pairs.flatMap((p) => [p.engine.id, p.base.id]);
    const { data: done } = await supabase.from("eval_comparisons").select("output_a, output_b").eq("judged_by", "judge").in("output_a", ids);
    const doneKeys = new Set((done ?? []).map((c) => [c.output_a, c.output_b].sort().join("|")));
    const todo = pairs.filter((p) => !doneKeys.has([p.engine.id, p.base.id].sort().join("|"))).slice(0, limit);
    if (!todo.length) return { ok: true, message: "Every pair is already judged" };
    let okCount = 0;
    const errors: string[] = [];
    for (const p of todo) {
      const flip = Math.random() < 0.5;
      const res = await invokeFunction("judge", { brief_id: p.base.brief_id, output_a: flip ? p.base.id : p.engine.id, output_b: flip ? p.engine.id : p.base.id });
      if (res.ok) okCount++;
      else errors.push(res.error);
    }
    revalidatePath(`/admin/evals/runs/${runId}`);
    revalidatePath("/admin/evals", "layout");
    if (!okCount) return fail(errors[0] ?? "judge failed");
    return { ok: true, message: `Judged ${okCount}/${todo.length} pair(s)${errors.length ? `; ${errors.length} failed: ${errors[0]}` : ""}${pairs.length - doneKeys.size > limit ? ` (run again for the rest)` : ""}` };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------------------------
// Settings and admins
// ---------------------------------------------------------------------------------------------

export async function saveSetting(key: string, value: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await admin();
    if (!(SETTING_KEYS as readonly string[]).includes(key)) return fail(`Unknown setting ${key}`);
    const trimmed = value.trim();
    if (!trimmed) return fail("Value is required");
    if (key === "functions_url" && !/^https?:\/\//.test(trimmed)) return fail("functions_url must start with http:// or https://");
    if (key === "eval_workspace_id" && !/^[0-9a-f-]{36}$/i.test(trimmed)) return fail("eval_workspace_id must be a UUID");
    const { error } = await supabase.rpc("admin_set_setting", { p_key: key as SettingKey, p_value: trimmed });
    if (error) return fail(error.message);
    await supabase.from("audit_log").insert({ actor_id: user.id, action: "admin_setting", target_type: "setting", target_id: key, meta: key === "pipeline_shared_secret" ? { rotated: true } : { value: trimmed } });
    revalidatePath("/admin/settings");
    return { ok: true, message: key === "pipeline_shared_secret" ? "Secret updated" : `${key} saved` };
  } catch (e) {
    return fail(e);
  }
}

export async function addAdminByEmail(_prev: FormState, fd: FormData): Promise<FormState> {
  try {
    const { supabase, user } = await admin();
    const email = text(fd, "email")?.toLowerCase();
    if (!email) return { error: "Email is required" };
    const { data: profile, error: lookupError } = await supabase.from("profiles").select("id, email").ilike("email", email).maybeSingle();
    if (lookupError) return { error: lookupError.message };
    if (!profile) return { error: `No profile with email ${email}. The user must sign in once first.` };
    const { error } = await supabase.from("app_admins").insert({ user_id: profile.id });
    if (error) {
      if (error.code === "23505") return { error: `${email} is already an admin` };
      if (error.code === "42501") return { error: `RLS blocked the insert (${error.message}). app_admins only has a read policy for admins; add an admin manage policy in a migration.` };
      return { error: error.message };
    }
    await supabase.from("audit_log").insert({ actor_id: user.id, action: "admin_grant", target_type: "user", target_id: profile.id, meta: { email } });
    revalidatePath("/admin/settings");
    return { ok: true, message: `${email} is now an admin` };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function removeAdmin(userId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await admin();
    if (userId === user.id) return fail("You cannot remove yourself");
    const { error, count } = await supabase.from("app_admins").delete({ count: "exact" }).eq("user_id", userId);
    if (error) {
      if (error.code === "42501") return fail(`RLS blocked the delete (${error.message}). app_admins only has a read policy for admins; add an admin manage policy in a migration.`);
      return fail(error.message);
    }
    if (!count) return fail("Nothing was removed: app_admins has no delete policy for admins yet (RLS). Add one in a migration.");
    await supabase.from("audit_log").insert({ actor_id: user.id, action: "admin_revoke", target_type: "user", target_id: userId });
    revalidatePath("/admin/settings");
    return { ok: true, message: "Admin removed" };
  } catch (e) {
    return fail(e);
  }
}
