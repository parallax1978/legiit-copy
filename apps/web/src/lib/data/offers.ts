import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  OfferRow,
  OfferSourceRow,
  OfferClaimRow,
  OfferConfigRow,
  OfferVariantRow,
  OfferResearchRow,
  OfferQuestionRow,
  VoiceProfileRow,
} from "@/components/offers/normalize";

export type OfferListItem = Pick<OfferRow, "id" | "name" | "status" | "updated_at" | "created_at"> & { claim_count: number; generation_count: number };

function countOf(v: unknown): number {
  if (Array.isArray(v) && v.length > 0) {
    const c = (v[0] as { count?: unknown }).count;
    return typeof c === "number" ? c : 0;
  }
  return 0;
}

export async function listOffers(workspaceId: string, opts: { includeArchived?: boolean } = {}): Promise<OfferListItem[]> {
  const supabase = await createClient();
  let q = supabase
    .from("offers")
    .select("id, name, status, updated_at, created_at, offer_claims(count), generations(count)")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });
  if (!opts.includeArchived) q = q.neq("status", "archived");
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    updated_at: row.updated_at,
    created_at: row.created_at,
    claim_count: countOf(row.offer_claims),
    generation_count: countOf(row.generations),
  }));
}

export const getOffer = cache(async (offerId: string, workspaceId: string): Promise<OfferRow | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("offers").select("*").eq("id", offerId).eq("workspace_id", workspaceId).maybeSingle();
  return data ?? null;
});

export const getOfferSources = cache(async (offerId: string): Promise<OfferSourceRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("offer_sources").select("*").eq("offer_id", offerId).order("created_at");
  return data ?? [];
});

export async function getOfferClaims(offerId: string): Promise<OfferClaimRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("offer_claims").select("*").eq("offer_id", offerId).order("created_at");
  return data ?? [];
}

export async function getOfferQuestions(offerId: string): Promise<OfferQuestionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("offer_questions").select("*").eq("offer_id", offerId).order("created_at");
  return data ?? [];
}

export async function getOfferVariants(offerId: string): Promise<OfferVariantRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("offer_variants").select("*").eq("offer_id", offerId).order("created_at", { ascending: false });
  return data ?? [];
}

export async function getOfferResearch(offerId: string): Promise<OfferResearchRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("offer_research").select("*").eq("offer_id", offerId).order("version", { ascending: false });
  return data ?? [];
}

export async function getOfferConfig(offerId: string): Promise<OfferConfigRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("offer_config").select("*").eq("offer_id", offerId).maybeSingle();
  return data ?? null;
}

/** Profiles attached to this offer plus workspace-wide ones (offer_id null). */
export async function getVoiceProfiles(offerId: string, workspaceId: string): Promise<VoiceProfileRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("voice_profiles")
    .select("*")
    .eq("workspace_id", workspaceId)
    .or(`offer_id.eq.${offerId},offer_id.is.null`)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export type WaitingGeneration = { id: string; format: string; variant_id: string | null; purpose: string | null; created_at: string };
export async function getWaitingGenerations(offerId: string): Promise<WaitingGeneration[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("generations")
    .select("id, format, variant_id, purpose, created_at")
    .eq("offer_id", offerId)
    .eq("status", "needs_input")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export const getOfferCounts = cache(async (offerId: string) => {
  const supabase = await createClient();
  const [claims, flagged, questions, variants, research, voice] = await Promise.all([
    supabase.from("offer_claims").select("id", { count: "exact", head: true }).eq("offer_id", offerId),
    supabase.from("offer_claims").select("id", { count: "exact", head: true }).eq("offer_id", offerId).eq("status", "flagged").is("user_decision", null),
    supabase.from("offer_questions").select("id", { count: "exact", head: true }).eq("offer_id", offerId).is("answer", null),
    supabase.from("offer_variants").select("id", { count: "exact", head: true }).eq("offer_id", offerId).eq("status", "proposed"),
    supabase.from("offer_research").select("id", { count: "exact", head: true }).eq("offer_id", offerId),
    supabase.from("voice_profiles").select("id", { count: "exact", head: true }).eq("offer_id", offerId),
  ]);
  return {
    claims: claims.count ?? 0,
    flagged: flagged.count ?? 0,
    openQuestions: questions.count ?? 0,
    proposedVariants: variants.count ?? 0,
    research: research.count ?? 0,
    voice: voice.count ?? 0,
  };
});
