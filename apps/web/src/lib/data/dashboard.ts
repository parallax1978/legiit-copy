import { startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";

/** Human labels for the engine's format ids (see @engine/schemas/common.ts). Unknown ids are humanized. */
export const FORMAT_LABELS: Record<string, string> = {
  sales_letter: "Sales letter",
  landing_page_short: "Short landing page",
  optin: "Opt-in page",
  upsell: "Upsell",
  order_bump: "Order bump",
  order_form: "Order form",
  thank_you: "Thank-you page",
  email_single: "Email",
  email_sequence: "Email sequence",
  webinar_package: "Webinar package",
  vsl_long: "Long VSL",
  vsl_short: "Short VSL",
  meta_ad: "Meta ad",
  youtube_ad: "YouTube ad",
  tiktok_reels: "TikTok / Reels script",
  google_rsa: "Google RSA",
  advertorial: "Advertorial",
  organic_social: "Organic social",
  product_description: "Product description",
  sms: "SMS",
  cold_email: "Cold email",
  pricing_page: "Pricing page",
  podcast_read: "Podcast read",
};

/** Pipeline step ids (see engine/pipeline.ts) rendered as progress copy. */
export const STEP_LABELS: Record<string, string> = {
  research: "Researching the market",
  argument: "Choosing the argument",
  draft: "Drafting",
  cold_read: "Cold read on a second model",
  editorial: "Editorial review",
  mechanical: "Tell detector",
  factual: "Factual review",
  revise: "Revising",
  ship: "Finishing",
};

export function humanize(s: string | null | undefined) {
  if (!s) return "";
  const t = s.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
export function formatLabel(id: string | null | undefined) {
  return (id && FORMAT_LABELS[id]) || humanize(id);
}
export function stepLabel(step: string | null | undefined) {
  return (step && STEP_LABELS[step]) || humanize(step);
}

export type GenerationStatus = "queued" | "running" | "needs_input" | "completed" | "failed" | "cancelled";
export const ACTIVE_STATUSES: GenerationStatus[] = ["queued", "running", "needs_input"];

export function formatUsd(n: number | null | undefined) {
  const v = Number(n ?? 0);
  if (v === 0) return "$0.00";
  if (v < 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function formatInt(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString("en-US");
}

/** PostgREST returns to-one embeds as an object, older type inference may say array; accept both. */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export interface InProgressGeneration {
  id: string;
  format: string;
  status: GenerationStatus;
  currentStep: string | null;
  progressMessage: string | null;
  offerName: string | null;
  updatedAt: string;
}
export interface RecentDraft {
  id: string;
  generationId: string;
  label: string | null;
  version: number;
  wordCount: number | null;
  createdAt: string;
  format: string | null;
  generationStatus: string | null;
  offerName: string | null;
}
export interface DashboardData {
  offers: number;
  piecesThisMonth: number;
  runningNow: number;
  costThisMonth: number;
  inProgress: InProgressGeneration[];
  recentDrafts: RecentDraft[];
  checklist: { hasOffer: boolean; hasReadyOffer: boolean; hasGeneration: boolean };
}

type OfferEmbed = { name: string } | null;
type GenRow = {
  id: string;
  format: string;
  status: string;
  current_step: string | null;
  progress_message: string | null;
  updated_at: string;
  offer: OfferEmbed | OfferEmbed[];
};
type DraftRow = {
  id: string;
  generation_id: string;
  label: string | null;
  version: number;
  word_count: number | null;
  created_at: string;
  generation: { format: string; status: string; offer: OfferEmbed | OfferEmbed[] } | { format: string; status: string; offer: OfferEmbed | OfferEmbed[] }[] | null;
};

export async function getDashboardData(workspaceId: string): Promise<DashboardData> {
  const supabase = await createClient();
  const monthStart = startOfMonth(new Date()).toISOString();

  const [offers, pieces, running, cost, inProgress, drafts, readyOffers, anyGeneration] = await Promise.all([
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).neq("status", "archived"),
    supabase.from("generations").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "completed").gte("completed_at", monthStart),
    supabase.from("generations").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).in("status", ["queued", "running"]),
    supabase.from("usage_events").select("cost_usd").eq("workspace_id", workspaceId).gte("created_at", monthStart),
    supabase
      .from("generations")
      .select("id, format, status, current_step, progress_message, updated_at, offer:offers(name)")
      .eq("workspace_id", workspaceId)
      .in("status", ACTIVE_STATUSES)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("drafts")
      .select("id, generation_id, label, version, word_count, created_at, generation:generations(format, status, offer:offers(name))")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("offers").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "ready"),
    supabase.from("generations").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);

  const costThisMonth = (cost.data ?? []).reduce((sum, r) => sum + Number(r.cost_usd ?? 0), 0);

  const inProgressRows = (inProgress.data ?? []) as unknown as GenRow[];
  const draftRows = (drafts.data ?? []) as unknown as DraftRow[];

  return {
    offers: offers.count ?? 0,
    piecesThisMonth: pieces.count ?? 0,
    runningNow: running.count ?? 0,
    costThisMonth,
    inProgress: inProgressRows.map((g) => ({
      id: g.id,
      format: g.format,
      status: g.status as GenerationStatus,
      currentStep: g.current_step,
      progressMessage: g.progress_message,
      offerName: one(g.offer)?.name ?? null,
      updatedAt: g.updated_at,
    })),
    recentDrafts: draftRows.map((d) => {
      const gen = one(d.generation);
      return {
        id: d.id,
        generationId: d.generation_id,
        label: d.label,
        version: d.version,
        wordCount: d.word_count,
        createdAt: d.created_at,
        format: gen?.format ?? null,
        generationStatus: gen?.status ?? null,
        offerName: one(gen?.offer)?.name ?? null,
      };
    }),
    checklist: {
      hasOffer: (offers.count ?? 0) > 0,
      hasReadyOffer: (readyOffers.count ?? 0) > 0,
      hasGeneration: (anyGeneration.count ?? 0) > 0,
    },
  };
}

/* ---------------- usage ---------------- */

export interface MonthlyUsage {
  month: string;
  generations: number;
  tokens: number;
  costUsd: number;
}
export interface GenerationUsage {
  generationId: string;
  format: string | null;
  status: string | null;
  offerName: string | null;
  steps: number;
  tokens: number;
  costUsd: number;
  lastAt: string;
}
export interface UsageData {
  monthly: MonthlyUsage[];
  perGeneration: GenerationUsage[];
  otherCostUsd: number; // usage not tied to a generation (ingest, rewrite, export)
}

export async function getUsageData(workspaceId: string): Promise<UsageData> {
  const supabase = await createClient();
  const [monthly, events] = await Promise.all([
    supabase.from("workspace_usage_monthly").select("month, generations, tokens, cost_usd").eq("workspace_id", workspaceId).order("month", { ascending: false }).limit(24),
    supabase.from("usage_events").select("generation_id, tokens, cost_usd, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(2000),
  ]);

  const byGen = new Map<string, GenerationUsage>();
  let otherCostUsd = 0;
  for (const e of events.data ?? []) {
    if (!e.generation_id) {
      otherCostUsd += Number(e.cost_usd ?? 0);
      continue;
    }
    const cur = byGen.get(e.generation_id) ?? { generationId: e.generation_id, format: null, status: null, offerName: null, steps: 0, tokens: 0, costUsd: 0, lastAt: e.created_at };
    cur.steps += 1;
    cur.tokens += Number(e.tokens ?? 0);
    cur.costUsd += Number(e.cost_usd ?? 0);
    if (e.created_at > cur.lastAt) cur.lastAt = e.created_at;
    byGen.set(e.generation_id, cur);
  }

  const ids = [...byGen.keys()].slice(0, 200);
  if (ids.length > 0) {
    // usage_events has no FK to generations, so the join is done here
    const { data } = await supabase.from("generations").select("id, format, status, offer:offers(name)").in("id", ids);
    for (const g of (data ?? []) as unknown as { id: string; format: string; status: string; offer: OfferEmbed | OfferEmbed[] }[]) {
      const cur = byGen.get(g.id);
      if (!cur) continue;
      cur.format = g.format;
      cur.status = g.status;
      cur.offerName = one(g.offer)?.name ?? null;
    }
  }

  return {
    monthly: (monthly.data ?? []).map((m) => ({
      month: m.month ?? "",
      generations: Number(m.generations ?? 0),
      tokens: Number(m.tokens ?? 0),
      costUsd: Number(m.cost_usd ?? 0),
    })),
    perGeneration: [...byGen.values()].sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1)).slice(0, 100),
    otherCostUsd,
  };
}

/* ---------------- instruction memory ---------------- */

export interface MemoryItem {
  text: string;
  source: "user" | "learned";
  created_at: string;
}

/** workspaces.instruction_memory is jsonb; accept plain strings or objects and normalize. */
export function parseInstructionMemory(raw: unknown): MemoryItem[] {
  if (!Array.isArray(raw)) return [];
  const out: MemoryItem[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      if (item.trim()) out.push({ text: item.trim(), source: "user", created_at: "" });
      continue;
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const text = String(o.text ?? o.instruction ?? o.rule ?? "").trim();
      if (!text) continue;
      out.push({
        text,
        source: o.source === "learned" ? "learned" : "user",
        created_at: typeof o.created_at === "string" ? o.created_at : "",
      });
    }
  }
  return out;
}
