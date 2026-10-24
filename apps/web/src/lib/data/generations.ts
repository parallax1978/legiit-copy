import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
export type GenerationRow = Tables["generations"]["Row"];
export type StepRow = Tables["generation_steps"]["Row"];
export type AngleRow = Tables["angles"]["Row"];
export type DraftRow = Tables["drafts"]["Row"];
export type FlagRow = Tables["draft_flags"]["Row"];
export type FeedbackRow = Tables["draft_feedback"]["Row"];
export type PredictionRow = Tables["generation_predictions"]["Row"];
export type VoiceProfileRow = Tables["voice_profiles"]["Row"];

export type GenerationStatus = "queued" | "running" | "needs_input" | "completed" | "failed" | "cancelled";
export const GENERATION_STATUSES: GenerationStatus[] = ["queued", "running", "needs_input", "completed", "failed", "cancelled"];

/** generations.options as the web app writes it. */
export interface GenerationOptions {
  purpose?: string;
  length?: "shorter" | "standard" | "longer";
  cta?: string;
  deadline?: string;
  instructions?: string;
  sequence_type?: string;
  control_text?: string;
  skip_offer?: boolean;
  exclude_angle_ids?: string[];
}

export interface GenerationListItem {
  id: string;
  format: string;
  status: GenerationStatus;
  current_step: string | null;
  progress_message: string | null;
  cost_usd: number;
  created_at: string;
  completed_at: string | null;
  purpose: string | null;
  error: string | null;
  offer: { id: string; name: string } | null;
}

export interface GenerationFilters {
  offer?: string;
  status?: string;
  format?: string;
}

export async function listGenerations(workspaceId: string, filters: GenerationFilters = {}): Promise<GenerationListItem[]> {
  const supabase = await createClient();
  let q = supabase
    .from("generations")
    .select("id, format, status, current_step, progress_message, cost_usd, created_at, completed_at, purpose, error, offer:offers(id, name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (filters.offer) q = q.eq("offer_id", filters.offer);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.format) q = q.eq("format", filters.format);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    status: row.status as GenerationStatus,
    cost_usd: Number(row.cost_usd ?? 0),
    offer: (row.offer as unknown as { id: string; name: string } | null) ?? null,
  }));
}

export interface OfferOption {
  id: string;
  name: string;
  status: string;
  hasResearch: boolean;
  hasApprovedOffer: boolean;
}

/** Offers in the workspace with what a new generation would reuse (active research, approved offer construction). */
export async function listOfferOptions(workspaceId: string): Promise<OfferOption[]> {
  const supabase = await createClient();
  const [{ data: offers, error }, { data: research }, { data: variants }] = await Promise.all([
    supabase.from("offers").select("id, name, status").eq("workspace_id", workspaceId).neq("status", "archived").order("updated_at", { ascending: false }),
    supabase.from("offer_research").select("offer_id").eq("workspace_id", workspaceId).eq("active", true),
    supabase.from("offer_variants").select("offer_id").eq("workspace_id", workspaceId).eq("status", "approved"),
  ]);
  if (error) throw new Error(error.message);
  const researched = new Set((research ?? []).map((r) => r.offer_id));
  const approved = new Set((variants ?? []).map((v) => v.offer_id));
  return (offers ?? []).map((o) => ({ ...o, hasResearch: researched.has(o.id), hasApprovedOffer: approved.has(o.id) }));
}

export async function listVoiceProfiles(workspaceId: string): Promise<{ id: string; name: string; offer_id: string | null }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("voice_profiles").select("id, name, offer_id").eq("workspace_id", workspaceId).order("name");
  return data ?? [];
}

export interface ClaimSummary {
  id: string;
  claim_text: string;
  claim_type: string;
  role: string | null;
  status: string;
  evidence_grade: string | null;
  precision: string | null;
}

export interface GenerationDetail {
  generation: GenerationRow;
  options: GenerationOptions;
  offer: { id: string; name: string; status: string } | null;
  steps: StepRow[];
  angles: AngleRow[];
  drafts: DraftRow[];
  flags: FlagRow[];
  feedback: FeedbackRow[];
  predictions: PredictionRow[];
  claims: ClaimSummary[];
  research: { id: string; version: number; sources: Json; dossier: Json } | null;
  voiceProfile: { id: string; name: string } | null;
  openQuestions: { id: string; question: string; why: string | null }[];
  hasApprovedOffer: boolean;
}

export async function getGenerationDetail(generationId: string, workspaceId: string): Promise<GenerationDetail | null> {
  const supabase = await createClient();
  const { data: generation, error } = await supabase.from("generations").select("*").eq("id", generationId).eq("workspace_id", workspaceId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!generation) return null;

  const [steps, angles, drafts, flags, predictions, claims, offer, research, voice, questions, variants] = await Promise.all([
    supabase.from("generation_steps").select("*").eq("generation_id", generationId).order("created_at", { ascending: true }),
    supabase.from("angles").select("*").eq("generation_id", generationId).order("rank", { ascending: true, nullsFirst: false }),
    supabase.from("drafts").select("*").eq("generation_id", generationId).order("version", { ascending: true }),
    supabase.from("draft_flags").select("*").eq("generation_id", generationId).order("created_at", { ascending: true }),
    supabase.from("generation_predictions").select("*").eq("generation_id", generationId).order("created_at", { ascending: true }),
    supabase.from("offer_claims").select("id, claim_text, claim_type, role, status, evidence_grade, precision").eq("offer_id", generation.offer_id),
    supabase.from("offers").select("id, name, status").eq("id", generation.offer_id).maybeSingle(),
    generation.research_id
      ? supabase.from("offer_research").select("id, version, sources, dossier").eq("id", generation.research_id).maybeSingle()
      : supabase.from("offer_research").select("id, version, sources, dossier").eq("offer_id", generation.offer_id).eq("active", true).maybeSingle(),
    generation.voice_profile_id ? supabase.from("voice_profiles").select("id, name").eq("id", generation.voice_profile_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("offer_questions").select("id, question, why").eq("offer_id", generation.offer_id).is("answer", null).order("created_at"),
    supabase.from("offer_variants").select("id").eq("offer_id", generation.offer_id).eq("status", "approved").limit(1),
  ]);

  const draftIds = (drafts.data ?? []).map((d) => d.id);
  const feedbackRows = draftIds.length ? (await supabase.from("draft_feedback").select("*").in("draft_id", draftIds).order("created_at", { ascending: true })).data ?? [] : [];

  return {
    generation,
    options: (generation.options as GenerationOptions | null) ?? {},
    offer: offer.data ?? null,
    steps: steps.data ?? [],
    angles: angles.data ?? [],
    drafts: drafts.data ?? [],
    flags: flags.data ?? [],
    feedback: feedbackRows,
    predictions: predictions.data ?? [],
    claims: (claims.data ?? []) as ClaimSummary[],
    research: research.data ?? null,
    voiceProfile: voice.data ?? null,
    openQuestions: questions.data ?? [],
    hasApprovedOffer: (variants.data ?? []).length > 0,
  };
}
