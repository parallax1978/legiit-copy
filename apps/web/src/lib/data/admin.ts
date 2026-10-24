/**
 * Admin data layer: reads for the internal admin screens plus the pure mappers the JSON importers use.
 * Mutations live in src/lib/actions/admin.ts. RLS gives admins full access through the normal client.
 */
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AWARENESS_LEVELS, EFFORTS, EXAMPLE_STATUSES, FULL_TEXT_RIGHTS, LEAD_TYPES, RIGHTS_STATUSES, SECTION_TYPES, SELLING_SITUATIONS, SOPHISTICATION_LEVELS, allowsFullText } from "@/lib/constants";
export { AWARENESS_LEVELS, EFFORTS, EXAMPLE_STATUSES, FULL_TEXT_RIGHTS, LEAD_TYPES, RIGHTS_STATUSES, SECTION_TYPES, SELLING_SITUATIONS, SOPHISTICATION_LEVELS, allowsFullText };
import type { Database, Json } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
export type ExampleRow = Tables["examples"]["Row"];
export type ExampleSectionRow = Tables["example_sections"]["Row"];
export type CritiqueRow = Tables["critiques"]["Row"];
export type ControlRow = Tables["controls"]["Row"];
export type SplitTestPairRow = Tables["split_test_pairs"]["Row"];
export type PromptVersionRow = Tables["prompt_versions"]["Row"];
export type EvalBriefRow = Tables["eval_briefs"]["Row"];
export type EvalRunRow = Tables["eval_runs"]["Row"];
export type EvalOutputRow = Tables["eval_outputs"]["Row"];
export type EvalComparisonRow = Tables["eval_comparisons"]["Row"];
export type JudgeCalibrationRow = Tables["judge_calibrations"]["Row"];
export type GenerationRow = Tables["generations"]["Row"];
export type GenerationStepRow = Tables["generation_steps"]["Row"];
export type LlmCostByStepRow = Database["public"]["Views"]["llm_cost_by_step"]["Row"];

export type ActionResult<T = undefined> = { ok: true; message?: string; data?: T } | { ok: false; error: string };

export const STUCK_AFTER_MS = 30 * 60 * 1000;
export const SETTING_KEYS = ["functions_url", "eval_workspace_id", "pipeline_shared_secret"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];


// ---------------------------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------------------------

function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
function startOfToday() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function startOfMonth() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export interface OverviewStats {
  generationsToday: number;
  generations7d: number;
  costToday: number;
  cost7d: number;
  cost30d: number;
  failedJobs: number;
  runningJobs: number;
  queuedJobs: number;
  library: { examples: number; curated: number; critiques: number; controls: number; splitTests: number; holdout: number; briefs: number };
  latestJudge: JudgeCalibrationRow | null;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const supabase = await createClient();
  const today = startOfToday().toISOString();
  const d7 = daysAgo(7).toISOString();
  const d30 = daysAgo(30).toISOString();
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);

  const [genToday, gen7, failed, running, queued, examples, curated, critiques, controls, splitTests, holdout, briefs, costRows, judge] = await Promise.all([
    count(supabase.from("generations").select("id", { count: "exact", head: true }).gte("created_at", today)),
    count(supabase.from("generations").select("id", { count: "exact", head: true }).gte("created_at", d7)),
    count(supabase.from("generations").select("id", { count: "exact", head: true }).eq("status", "failed")),
    count(supabase.from("generations").select("id", { count: "exact", head: true }).eq("status", "running")),
    count(supabase.from("generations").select("id", { count: "exact", head: true }).eq("status", "queued")),
    count(supabase.from("examples").select("id", { count: "exact", head: true })),
    count(supabase.from("examples").select("id", { count: "exact", head: true }).eq("status", "curated")),
    count(supabase.from("critiques").select("id", { count: "exact", head: true })),
    count(supabase.from("controls").select("id", { count: "exact", head: true })),
    count(supabase.from("split_test_pairs").select("id", { count: "exact", head: true })),
    count(supabase.from("split_test_pairs").select("id", { count: "exact", head: true }).eq("holdout", true)),
    count(supabase.from("eval_briefs").select("id", { count: "exact", head: true })),
    supabase.from("llm_cost_by_step").select("day, cost_usd").gte("day", d30),
    supabase.from("judge_calibrations").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  let costToday = 0;
  let cost7d = 0;
  let cost30d = 0;
  for (const row of costRows.data ?? []) {
    if (!row.day) continue;
    const cost = Number(row.cost_usd ?? 0);
    cost30d += cost;
    if (row.day >= d7) cost7d += cost;
    if (row.day >= today) costToday += cost;
  }

  return {
    generationsToday: genToday,
    generations7d: gen7,
    costToday,
    cost7d,
    cost30d,
    failedJobs: failed,
    runningJobs: running,
    queuedJobs: queued,
    library: { examples, curated, critiques, controls, splitTests, holdout, briefs },
    latestJudge: judge.data ?? null,
  };
}

export type FailedStep = GenerationStepRow & { generations: Pick<GenerationRow, "format" | "status" | "workspace_id" | "current_step"> | null };

export async function getRecentFailedSteps(limit = 25): Promise<FailedStep[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("generation_steps")
    .select("*, generations(format, status, workspace_id, current_step)")
    .in("status", ["failed", "interrupted"])
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as FailedStep[];
}

// ---------------------------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------------------------

export interface ExampleFilters {
  q?: string;
  format?: string;
  status?: string;
  awareness?: string;
  lead_type?: string;
  loser?: string; // "yes" | "no"
  rights?: string;
  embedded?: string; // "yes" | "no"
}

export type ExampleListRow = Omit<ExampleRow, "embedding" | "full_text" | "annotations"> & { has_embedding: boolean };

export async function listExamples(filters: ExampleFilters, limit = 200): Promise<ExampleListRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("examples")
    .select(
      "id, title, author, format, market, selling_situation, awareness, sophistication, lead_type, argument_sentence, hook, mechanism_type, proof_placement, offer_devices, voice_profile, funnel_position, documented_result, is_loser, rights_status, source_url, excerpt, lessons, status, created_by, created_at, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (filters.format) q = q.eq("format", filters.format);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.awareness) q = q.eq("awareness", filters.awareness);
  if (filters.lead_type) q = q.eq("lead_type", filters.lead_type);
  if (filters.rights) q = q.eq("rights_status", filters.rights);
  if (filters.loser === "yes") q = q.eq("is_loser", true);
  if (filters.loser === "no") q = q.eq("is_loser", false);
  if (filters.embedded === "yes") q = q.not("embedding", "is", null);
  if (filters.embedded === "no") q = q.is("embedding", null);
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_,]/g, " ").trim()}%`;
    q = q.or(`title.ilike.${term},author.ilike.${term},market.ilike.${term}`);
  }
  const { data } = await q;
  const rows = data ?? [];
  const embedded = await embeddedIds("examples", rows.map((r) => r.id));
  return rows.map((row) => ({ ...row, has_embedding: embedded.has(row.id) }) as ExampleListRow);
}

/** Which of these rows carry an embedding, without transferring the vectors. */
async function embeddedIds(table: "examples" | "critiques", ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from(table).select("id").in("id", ids).not("embedding", "is", null);
  return new Set((data ?? []).map((r) => r.id));
}

export async function getExample(id: string) {
  const supabase = await createClient();
  const [example, sections] = await Promise.all([
    supabase.from("examples").select("*").eq("id", id).maybeSingle(),
    supabase.from("example_sections").select("*").eq("example_id", id).order("created_at"),
  ]);
  return { example: example.data ?? null, sections: sections.data ?? [] };
}

export async function countMissingEmbeddings(table: "examples" | "critiques" | "controls") {
  const supabase = await createClient();
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).is("embedding", null);
  return count ?? 0;
}

// ---------------------------------------------------------------------------------------------
// Critiques
// ---------------------------------------------------------------------------------------------

export interface CritiqueFilters {
  q?: string;
  format?: string;
  status?: string;
  confidence?: string;
  embedded?: string;
}
export type CritiqueListRow = Omit<CritiqueRow, "embedding"> & { has_embedding: boolean };

export async function listCritiques(filters: CritiqueFilters, limit = 300): Promise<CritiqueListRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("critiques")
    .select(
      "id, external_id, source, source_url, chief, format, brief, weak_draft, strong_revision, quote_status, defect, defect_named, principle, reason, tested, evidence, confidence, ai_failure_map, tags, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (filters.format) q = q.eq("format", filters.format);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.confidence) q = q.eq("confidence", filters.confidence);
  if (filters.embedded === "yes") q = q.not("embedding", "is", null);
  if (filters.embedded === "no") q = q.is("embedding", null);
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_,]/g, " ").trim()}%`;
    q = q.or(`chief.ilike.${term},defect.ilike.${term},defect_named.ilike.${term},principle.ilike.${term},external_id.ilike.${term}`);
  }
  const { data } = await q;
  const rows = data ?? [];
  const embedded = await embeddedIds("critiques", rows.map((r) => r.id));
  return rows.map((row) => ({ ...row, has_embedding: embedded.has(row.id) }));
}

export async function getCritique(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("critiques").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

// ---------------------------------------------------------------------------------------------
// Controls and split tests
// ---------------------------------------------------------------------------------------------

export type ControlListRow = Omit<ControlRow, "embedding" | "full_text">;

export async function listControls(filters: { q?: string; format?: string }, limit = 300): Promise<ControlListRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("controls")
    .select(
      "id, external_id, workspace_id, title, author, format, market, funnel_position, traffic, source_url, rights_status, excerpt, structure, results, losing_variants, lessons, notes, verification, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (filters.format) q = q.eq("format", filters.format);
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_,]/g, " ").trim()}%`;
    q = q.or(`title.ilike.${term},author.ilike.${term},market.ilike.${term},external_id.ilike.${term}`);
  }
  const { data } = await q;
  return (data ?? []) as ControlListRow[];
}

export async function listSplitTestPairs(filters: { q?: string; format?: string; holdout?: string }, limit = 500): Promise<SplitTestPairRow[]> {
  const supabase = await createClient();
  let q = supabase.from("split_test_pairs").select("*").order("created_at", { ascending: false }).limit(limit);
  if (filters.format) q = q.eq("format", filters.format);
  if (filters.holdout === "yes") q = q.eq("holdout", true);
  if (filters.holdout === "no") q = q.eq("holdout", false);
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_,]/g, " ").trim()}%`;
    q = q.or(`element_tested.ilike.${term},source.ilike.${term},principle.ilike.${term},external_id.ilike.${term}`);
  }
  const { data } = await q;
  return data ?? [];
}

// ---------------------------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------------------------

export async function listPromptVersions(step?: string): Promise<PromptVersionRow[]> {
  const supabase = await createClient();
  let q = supabase.from("prompt_versions").select("*").order("step").order("version", { ascending: false });
  if (step) q = q.eq("step", step);
  const { data } = await q;
  return data ?? [];
}

export async function getActivePromptVersions(): Promise<Record<string, PromptVersionRow>> {
  const supabase = await createClient();
  const { data } = await supabase.from("prompt_versions").select("*").eq("active", true);
  const out: Record<string, PromptVersionRow> = {};
  for (const row of data ?? []) out[row.step] = row;
  return out;
}

// ---------------------------------------------------------------------------------------------
// Evals
// ---------------------------------------------------------------------------------------------

export async function listEvalBriefs(): Promise<EvalBriefRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("eval_briefs").select("*").order("created_at", { ascending: false });
  return data ?? [];
}
export async function getEvalBrief(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("eval_briefs").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export type EvalRunWithCounts = EvalRunRow & { output_count: number };

export async function listEvalRuns(): Promise<EvalRunWithCounts[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("eval_runs").select("*, eval_outputs(count)").order("created_at", { ascending: false });
  return (data ?? []).map((r) => {
    const { eval_outputs, ...rest } = r as EvalRunRow & { eval_outputs: { count: number }[] | null };
    return { ...rest, output_count: eval_outputs?.[0]?.count ?? 0 };
  });
}

export async function getEvalRun(id: string) {
  const supabase = await createClient();
  const [run, outputs, briefs, baselines] = await Promise.all([
    supabase.from("eval_runs").select("*").eq("id", id).maybeSingle(),
    supabase.from("eval_outputs").select("*").eq("run_id", id).order("created_at"),
    supabase.from("eval_briefs").select("id, name, market, formats, external_id"),
    supabase.from("eval_runs").select("id, name, baseline, status, created_at").eq("baseline", true).order("created_at", { ascending: false }),
  ]);
  return { run: run.data ?? null, outputs: outputs.data ?? [], briefs: briefs.data ?? [], baselineRuns: baselines.data ?? [] };
}

export interface ComparePair {
  brief_id: string;
  brief_name: string;
  format: string;
  left: Pick<EvalOutputRow, "id" | "markdown" | "run_id">;
  right: Pick<EvalOutputRow, "id" | "markdown" | "run_id">;
}

/** Pairs of outputs for the same brief and format across two runs, minus the pairs this user already judged. Order is randomized per pair. */
export async function getComparePairs(runId: string, otherRunId: string, userId: string): Promise<{ pairs: ComparePair[]; judged: number }> {
  const supabase = await createClient();
  const [a, b, briefs] = await Promise.all([
    supabase.from("eval_outputs").select("id, brief_id, format, markdown, run_id").eq("run_id", runId),
    supabase.from("eval_outputs").select("id, brief_id, format, markdown, run_id").eq("run_id", otherRunId),
    supabase.from("eval_briefs").select("id, name"),
  ]);
  type OutputLite = Pick<EvalOutputRow, "id" | "brief_id" | "format" | "markdown" | "run_id">;
  const briefName = new Map((briefs.data ?? []).map((x) => [x.id, x.name]));
  const byKey = new Map<string, OutputLite>();
  for (const o of a.data ?? []) byKey.set(`${o.brief_id}:${o.format}`, o);
  const candidates: ComparePair[] = [];
  for (const o of b.data ?? []) {
    const mine = byKey.get(`${o.brief_id}:${o.format}`);
    if (!mine || !mine.markdown || !o.markdown) continue;
    const flip = Math.random() < 0.5;
    candidates.push({
      brief_id: o.brief_id,
      brief_name: briefName.get(o.brief_id) ?? o.brief_id,
      format: o.format,
      left: flip ? o : mine,
      right: flip ? mine : o,
    });
  }
  const ids = candidates.flatMap((p) => [p.left.id, p.right.id]);
  let judged = 0;
  if (ids.length) {
    const { data: done } = await supabase
      .from("eval_comparisons")
      .select("output_a, output_b")
      .eq("judged_by", "human")
      .eq("judge_user", userId)
      .in("output_a", ids);
    const doneKeys = new Set((done ?? []).map((c) => [c.output_a, c.output_b].sort().join("|")));
    const remaining = candidates.filter((p) => !doneKeys.has([p.left.id, p.right.id].sort().join("|")));
    judged = candidates.length - remaining.length;
    return { pairs: remaining, judged };
  }
  return { pairs: candidates, judged };
}

export async function listComparisonsForRun(runId: string): Promise<EvalComparisonRow[]> {
  const supabase = await createClient();
  const { data: outputs } = await supabase.from("eval_outputs").select("id").eq("run_id", runId);
  const ids = (outputs ?? []).map((o) => o.id);
  if (!ids.length) return [];
  const { data } = await supabase
    .from("eval_comparisons")
    .select("*")
    .or(`output_a.in.(${ids.join(",")}),output_b.in.(${ids.join(",")})`)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function listJudgeCalibrations(limit = 50): Promise<JudgeCalibrationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("judge_calibrations").select("*").order("created_at", { ascending: false }).limit(limit);
  return data ?? [];
}

export async function listHoldoutPairs(): Promise<SplitTestPairRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("split_test_pairs").select("*").eq("holdout", true).order("created_at", { ascending: false });
  return data ?? [];
}

export async function listRecentJudgeComparisons(limit = 40): Promise<EvalComparisonRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("eval_comparisons")
    .select("*")
    .eq("judged_by", "judge")
    .eq("kind", "split_test_pair")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ---------------------------------------------------------------------------------------------
// Costs and jobs
// ---------------------------------------------------------------------------------------------

export async function getCostByStep(days = 30): Promise<LlmCostByStepRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("llm_cost_by_step")
    .select("*")
    .gte("day", daysAgo(days).toISOString())
    .order("day", { ascending: false })
    .limit(1000);
  return data ?? [];
}

export interface StepLatency {
  step: string;
  calls: number;
  avg_latency_ms: number;
  cost_usd: number;
}

/** Call-weighted latency per step over the rows of llm_cost_by_step. */
export function latencyByStep(rows: LlmCostByStepRow[]): StepLatency[] {
  const acc = new Map<string, { calls: number; latencySum: number; cost: number }>();
  for (const r of rows) {
    const step = r.step ?? "(none)";
    const calls = Number(r.calls ?? 0);
    const cur = acc.get(step) ?? { calls: 0, latencySum: 0, cost: 0 };
    cur.calls += calls;
    cur.latencySum += Number(r.avg_latency_ms ?? 0) * calls;
    cur.cost += Number(r.cost_usd ?? 0);
    acc.set(step, cur);
  }
  return [...acc.entries()]
    .map(([step, v]) => ({ step, calls: v.calls, avg_latency_ms: v.calls ? Math.round(v.latencySum / v.calls) : 0, cost_usd: v.cost }))
    .sort((x, y) => y.cost_usd - x.cost_usd);
}

export type GenerationWithRefs = GenerationRow & { offers: { name: string } | null; workspaces: { name: string } | null };

export async function getTopGenerationsByCost(limit = 50): Promise<GenerationWithRefs[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("generations")
    .select("*, offers(name), workspaces(name)")
    .order("cost_usd", { ascending: false })
    .limit(limit);
  return (data ?? []) as GenerationWithRefs[];
}

export interface WorkspaceMonthCost {
  workspace_id: string;
  workspace_name: string;
  generations: number;
  tokens: number;
  cost_usd: number;
}

export async function getWorkspaceCostsThisMonth(): Promise<WorkspaceMonthCost[]> {
  const supabase = await createClient();
  const month = startOfMonth().toISOString();
  const { data } = await supabase.from("workspace_usage_monthly").select("*").gte("month", month).order("cost_usd", { ascending: false }).limit(200);
  const ids = [...new Set((data ?? []).map((r) => r.workspace_id))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: ws } = await supabase.from("workspaces").select("id, name").in("id", ids);
    for (const w of ws ?? []) names.set(w.id, w.name);
  }
  return (data ?? []).map((r) => ({
    workspace_id: r.workspace_id,
    workspace_name: names.get(r.workspace_id) ?? r.workspace_id,
    generations: Number(r.generations ?? 0),
    tokens: Number(r.tokens ?? 0),
    cost_usd: Number(r.cost_usd ?? 0),
  }));
}

export async function getActiveJobs(): Promise<GenerationWithRefs[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("generations")
    .select("*, offers(name), workspaces(name)")
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: true })
    .limit(200);
  return (data ?? []) as GenerationWithRefs[];
}

export async function getFailedJobs(limit = 50): Promise<GenerationWithRefs[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("generations")
    .select("*, offers(name), workspaces(name)")
    .eq("status", "failed")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as GenerationWithRefs[];
}

export function isStuck(g: Pick<GenerationRow, "status" | "updated_at">, now = Date.now()) {
  return g.status === "running" && now - new Date(g.updated_at).getTime() > STUCK_AFTER_MS;
}

export async function getGenerationForAdmin(id: string) {
  const supabase = await createClient();
  const [gen, steps, calls] = await Promise.all([
    supabase.from("generations").select("*, offers(name), workspaces(name)").eq("id", id).maybeSingle(),
    supabase.from("generation_steps").select("*").eq("generation_id", id).order("created_at"),
    supabase.from("llm_calls").select("*").eq("generation_id", id).order("created_at"),
  ]);
  return { generation: (gen.data ?? null) as GenerationWithRefs | null, steps: steps.data ?? [], calls: calls.data ?? [] };
}

// ---------------------------------------------------------------------------------------------
// Settings and admins
// ---------------------------------------------------------------------------------------------

export async function getSettings(): Promise<Record<SettingKey, string | null>> {
  const supabase = await createClient();
  const entries = await Promise.all(
    SETTING_KEYS.map(async (key) => {
      const { data, error } = await supabase.rpc("admin_get_setting", { p_key: key });
      return [key, error ? null : (data ?? null)] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<SettingKey, string | null>;
}

export interface AdminUser {
  user_id: string;
  created_at: string;
  email: string | null;
  full_name: string | null;
}

export async function listAdmins(): Promise<AdminUser[]> {
  const supabase = await createClient();
  const { data: admins } = await supabase.from("app_admins").select("*").order("created_at");
  const ids = (admins ?? []).map((a) => a.user_id);
  const profiles = new Map<string, { email: string | null; full_name: string | null }>();
  if (ids.length) {
    const { data } = await supabase.from("profiles").select("id, email, full_name").in("id", ids);
    for (const p of data ?? []) profiles.set(p.id, { email: p.email, full_name: p.full_name });
  }
  return (admins ?? []).map((a) => ({ user_id: a.user_id, created_at: a.created_at, email: profiles.get(a.user_id)?.email ?? null, full_name: profiles.get(a.user_id)?.full_name ?? null }));
}

// ---------------------------------------------------------------------------------------------
// Import mappers (pure). Each accepts the loose record shapes under research/ and returns an Insert row.
// ---------------------------------------------------------------------------------------------

const Loose = z.record(z.string(), z.unknown());
type LooseRecord = z.infer<typeof Loose>;

/** Accepts an array, or an object whose first array-valued property (or `pairs`/`items`/`records`) holds the rows. */
export function extractRecords(text: string): LooseRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }
  if (Array.isArray(parsed)) return parsed.map((r) => Loose.parse(r));
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    for (const key of ["pairs", "items", "records", "rows", "data"]) {
      if (Array.isArray(obj[key])) return (obj[key] as unknown[]).map((r) => Loose.parse(r));
    }
    const firstArray = Object.values(obj).find((v) => Array.isArray(v));
    if (firstArray) return (firstArray as unknown[]).map((r) => Loose.parse(r));
    return [Loose.parse(parsed)];
  }
  throw new Error("JSON must be an array of records or an object containing one");
}

const str = (v: unknown): string | null => (v === undefined || v === null ? null : typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v));
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : v === undefined || v === null ? [] : typeof v === "string" ? [v] : [v as Json]);
const obj = (v: unknown): { [key: string]: Json | undefined } => (v && typeof v === "object" && !Array.isArray(v) ? (v as { [key: string]: Json | undefined }) : {});
const bool = (v: unknown, fallback = false): boolean => (typeof v === "boolean" ? v : typeof v === "string" ? ["true", "yes", "1"].includes(v.toLowerCase()) : fallback);
const clamp400 = (v: string | null) => (v && v.length > 400 ? v.slice(0, 397) + "..." : v);
const rights = (v: unknown): (typeof RIGHTS_STATUSES)[number] => ((RIGHTS_STATUSES as readonly string[]).includes(String(v)) ? (v as (typeof RIGHTS_STATUSES)[number]) : "unknown");

export function mapCritiqueRecord(r: LooseRecord): Tables["critiques"]["Insert"] {
  return {
    external_id: str(r.external_id ?? r.id),
    source: str(r.source),
    source_url: str(r.source_url ?? r.url),
    chief: str(r.chief),
    format: str(r.format),
    brief: str(r.brief),
    weak_draft: str(r.weak_draft ?? r.before),
    strong_revision: str(r.strong_revision ?? r.after),
    quote_status: str(r.quote_status),
    defect: str(r.defect),
    defect_named: str(r.defect_named),
    principle: str(r.principle),
    reason: str(r.reason),
    tested: (r.tested as Json | undefined) ?? null,
    evidence: str(r.evidence),
    confidence: str(r.confidence),
    ai_failure_map: arr(r.ai_failure_map),
    tags: arr(r.tags),
    status: (EXAMPLE_STATUSES as readonly string[]).includes(String(r.status)) ? String(r.status) : "curated",
  };
}

export function mapControlRecord(r: LooseRecord): Tables["controls"]["Insert"] {
  const title = str(r.title) ?? str(r.name);
  const format = str(r.format);
  if (!title) throw new Error("record is missing title");
  if (!format) throw new Error(`record "${title}" is missing format`);
  const rs = rights(r.rights_status);
  return {
    external_id: str(r.external_id ?? r.id),
    title,
    author: str(r.author),
    format,
    market: str(r.market),
    funnel_position: str(r.funnel_position),
    traffic: str(r.traffic),
    source_url: str(r.source_url ?? r.url),
    rights_status: rs,
    excerpt: clamp400(str(r.excerpt)),
    full_text: allowsFullText(rs) ? str(r.full_text) : null,
    structure: obj(r.structure),
    results: obj(r.results),
    losing_variants: arr(r.losing_variants),
    lessons: arr(r.lessons),
    notes: str(r.notes),
    verification: str(r.verification),
    workspace_id: null,
  };
}

export function mapSplitTestRecord(r: LooseRecord): Tables["split_test_pairs"]["Insert"] {
  const winnerRaw = str(r.winner)?.toLowerCase();
  return {
    external_id: str(r.external_id ?? r.id),
    source: str(r.source),
    source_url: str(r.source_url ?? r.url),
    format: str(r.format),
    element_tested: str(r.element_tested),
    variant_a: str(r.variant_a),
    variant_b: str(r.variant_b),
    winner: winnerRaw === "a" || winnerRaw === "b" ? winnerRaw : null,
    lift: str(r.lift),
    metric: str(r.metric),
    sample_size: str(r.sample_size),
    confidence: str(r.confidence),
    why_it_won: str(r.why_it_won),
    principle: str(r.principle),
    contradicts_standard: bool(r.contradicts_standard),
    verification: str(r.verification ?? r.quote_status),
    holdout: bool(r.holdout),
  };
}

/** Maps either an examples-shaped record or a research/corpus controls-shaped record into an examples insert. */
export function mapExampleRecord(r: LooseRecord): Tables["examples"]["Insert"] {
  const title = str(r.title) ?? str(r.name);
  const format = str(r.format);
  if (!title) throw new Error("record is missing title");
  if (!format) throw new Error(`record "${title}" is missing format`);
  const rs = rights(r.rights_status);
  const annotations: { [key: string]: Json | undefined } = { ...obj(r.annotations) };
  const ext = str(r.external_id ?? r.id);
  if (ext) annotations.external_id = ext;
  if (r.structure !== undefined) annotations.structure = r.structure as Json;
  if (r.losing_variants !== undefined) annotations.losing_variants = r.losing_variants as Json;
  if (r.notes !== undefined && typeof r.notes === "string") annotations.notes = r.notes;
  if (r.verification !== undefined) annotations.verification = r.verification as Json;
  if (r.results !== undefined) annotations.results = r.results as Json;
  const documented = str(r.documented_result) ?? (r.results !== undefined ? str(r.results) : null);
  return {
    title,
    author: str(r.author),
    format,
    market: str(r.market),
    selling_situation: str(r.selling_situation),
    awareness: str(r.awareness),
    sophistication: str(r.sophistication),
    lead_type: str(r.lead_type),
    argument_sentence: str(r.argument_sentence),
    hook: str(r.hook),
    mechanism_type: str(r.mechanism_type),
    proof_placement: arr(r.proof_placement),
    offer_devices: arr(r.offer_devices),
    voice_profile: str(r.voice_profile),
    funnel_position: str(r.funnel_position),
    documented_result: documented,
    is_loser: bool(r.is_loser),
    rights_status: rs,
    source_url: str(r.source_url ?? r.url),
    excerpt: clamp400(str(r.excerpt)),
    full_text: allowsFullText(rs) ? str(r.full_text) : null,
    annotations,
    lessons: arr(r.lessons),
    status: (EXAMPLE_STATUSES as readonly string[]).includes(String(r.status)) ? String(r.status) : "draft",
  };
}

export function mapEvalBriefRecord(r: LooseRecord): Tables["eval_briefs"]["Insert"] {
  const name = str(r.name) ?? str(r.title);
  if (!name) throw new Error("record is missing name");
  const brief = r.brief !== undefined ? (r.brief as Json) : (r as Json);
  return {
    external_id: str(r.external_id ?? r.id),
    name,
    brief: (brief ?? {}) as NonNullable<Json>,
    market: str(r.market),
    formats: arr(r.formats),
    notes: str(r.notes),
  };
}
