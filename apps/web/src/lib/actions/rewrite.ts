"use server";
/**
 * Rewrite a page from its URL: the page is read into an offer of its own (ingest-source, then intake builds the brief
 * and the claims ledger from it), the user confirms the page type, and the piece is written in that format with the
 * page's own copy as the control the copy chief predicts against. Nothing new in the engine: the same steps a pasted
 * control and a URL source already run, chained.
 */
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace, canEdit } from "@/lib/auth";
import { FORMAT_IDS, MANNER_IDS } from "@/lib/formats";
import { guessPageFormat, pageWords } from "@/lib/page-format";
import { createOffer, addOfferSources } from "./offers";
import { createGeneration } from "./generations";
import type { FormatId } from "@engine/schemas/common.ts";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
type Done = { ok: true } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/** The control the chief reads: the page's own copy, within the option's limit. */
const CONTROL_MAX = 60_000;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const StartInput = z.object({ url: z.string().trim().url() });

/** Step 1: create the offer for this page and start reading it. Returns the offer id to poll. */
export async function startRewrite(raw: { url: string }): Promise<ActionResult<{ offerId: string }>> {
  const parsed = StartInput.safeParse(raw);
  if (!parsed.success) return fail("Paste the page's full address, starting with http:// or https://.");
  const url = parsed.data.url;
  if (!/^https?:\/\//i.test(url)) return fail("The address has to start with http:// or https://.");
  const { role } = await requireWorkspace();
  if (!canEdit(role)) return fail("Only owners and editors can rewrite pages.");
  const created = await createOffer({ firstUrl: url, name: `${hostOf(url)} page` });
  if (!created.ok) return created;
  const added = await addOfferSources({ offerId: created.data.offerId, urls: [url], files: [], text: "" });
  if (!added.ok) return added;
  return { ok: true, data: { offerId: created.data.offerId } };
}

export interface RewriteStatus {
  /** the offer's status: extracting while the page is read and the brief built; ready or needs_review after */
  status: string;
  /** the page's own reading: pending, processing, done or failed */
  sourceStatus: string;
  url: string | null;
  title: string | null;
  words: number;
  guess: FormatId | null;
  excerpt: string | null;
  error: string | null;
  /** questions the reader could not answer from the page; they pause the piece until answered on the offer page */
  openQuestions: number;
}

/** Step 2: what has been read so far. Polled while the page is read and the brief built. */
export async function getRewriteStatus(offerId: string): Promise<ActionResult<RewriteStatus>> {
  const { workspace } = await requireWorkspace();
  const supabase = await createClient();
  const [{ data: offer }, { data: source }, { count }] = await Promise.all([
    supabase.from("offers").select("id, status").eq("id", offerId).eq("workspace_id", workspace.id).maybeSingle(),
    supabase.from("offer_sources").select("url, title, extraction_status, error, extracted_text").eq("offer_id", offerId).eq("kind", "url").order("created_at", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("offer_questions").select("id", { count: "exact", head: true }).eq("offer_id", offerId).is("answer", null),
  ]);
  if (!offer) return fail("That page is not in this workspace.");
  const text = source?.extracted_text ?? "";
  return {
    ok: true,
    data: {
      status: offer.status,
      sourceStatus: source?.extraction_status ?? "pending",
      url: source?.url ?? null,
      title: source?.title ?? null,
      words: pageWords(text),
      guess: text ? guessPageFormat(text, source?.url ?? "") : null,
      excerpt: text ? text.trim().slice(0, 280) : null,
      error: source?.error ?? null,
      openQuestions: count ?? 0,
    },
  };
}

const FinishInput = z.object({
  offerId: z.string().uuid(),
  format: z.enum(FORMAT_IDS),
  manner: z.enum(["", ...MANNER_IDS]).optional().default(""),
  purpose: z.string().trim().max(2000).optional().default(""),
});

/** Step 3: write the page in the chosen format, with the original as the control. Redirects to the piece. */
export async function finishRewrite(raw: z.input<typeof FinishInput>): Promise<Done> {
  const parsed = FinishInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join(", "));
  const input = parsed.data;
  const { workspace, role } = await requireWorkspace();
  if (!canEdit(role)) return fail("Only owners and editors can rewrite pages.");
  const supabase = await createClient();
  const [{ data: offer }, { data: source }] = await Promise.all([
    supabase.from("offers").select("id, status").eq("id", input.offerId).eq("workspace_id", workspace.id).maybeSingle(),
    supabase.from("offer_sources").select("url, extracted_text, extraction_status").eq("offer_id", input.offerId).eq("kind", "url").order("created_at", { ascending: true }).limit(1).maybeSingle(),
  ]);
  if (!offer) return fail("That page is not in this workspace.");
  if (offer.status === "extracting") return fail("The page is still being read. Give it a moment.");
  if (!source || source.extraction_status !== "done" || !source.extracted_text?.trim()) return fail("The page could not be read, so there is nothing to rewrite. Check the address or add the copy as a text source on the offer.");
  const url = source.url ?? "the page";
  return createGeneration({
    offer_id: input.offerId,
    format: input.format,
    purpose: input.purpose || `Rewrite the page at ${url} so it beats the page that is there now: the same offer, to the same reader, doing the same job. The original is the control.`,
    control_text: source.extracted_text.trim().slice(0, CONTROL_MAX),
    manner: input.manner,
    skip_offer: true,
  });
}
