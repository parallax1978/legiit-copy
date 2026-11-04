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

/** A page that gave back fewer words than this was not read (a JavaScript app, a login wall, a blocked fetch); its copy is pasted instead. */
export const MIN_PAGE_WORDS = 80;

const StartInput = z.object({ url: z.string().trim().default(""), text: z.string().trim().max(400_000).default("") });

/** Step 1: create the offer for this page and start reading it, from its address or from its copy pasted. Returns the offer id to poll. */
export async function startRewrite(raw: { url?: string; text?: string }): Promise<ActionResult<{ offerId: string }>> {
  const parsed = StartInput.safeParse(raw);
  if (!parsed.success) return fail("Paste the page's address, or its copy.");
  const { url, text } = parsed.data;
  const pasted = pageWords(text) >= MIN_PAGE_WORDS;
  if (!pasted && !url) return fail(text ? `The pasted copy is under ${MIN_PAGE_WORDS} words. Paste the whole page.` : "Paste the page's full address, starting with http:// or https://, or paste its copy.");
  if (!pasted && !/^https?:\/\/\S+$/i.test(url)) return fail("The address has to start with http:// or https://.");
  const { role } = await requireWorkspace();
  if (!canEdit(role)) return fail("Only owners and editors can rewrite pages.");
  const name = url ? `${hostOf(url)} page` : "Pasted page";
  const created = await createOffer({ firstUrl: url || undefined, name });
  if (!created.ok) return created;
  // the pasted copy is the source when it is given: a page the fetch cannot read is read from the paste
  const added = await addOfferSources({ offerId: created.data.offerId, urls: pasted ? [] : [url], files: [], text: pasted ? text : "" });
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
  /** the brief built from the page holds something to write from (an empty page builds an empty brief) */
  briefReady: boolean;
  /** the page gave back fewer words than a page has: paste its copy instead */
  tooShort: boolean;
}

function briefHolds(brief: unknown): boolean {
  return !!brief && typeof brief === "object" && Object.keys(brief as object).length > 0;
}

/** Step 2: what has been read so far. Polled while the page is read and the brief built. */
export async function getRewriteStatus(offerId: string): Promise<ActionResult<RewriteStatus>> {
  const { workspace } = await requireWorkspace();
  const supabase = await createClient();
  const [{ data: offer }, { data: source }, { count }] = await Promise.all([
    supabase.from("offers").select("id, status, brief").eq("id", offerId).eq("workspace_id", workspace.id).maybeSingle(),
    supabase.from("offer_sources").select("url, title, extraction_status, error, extracted_text").eq("offer_id", offerId).order("created_at", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("offer_questions").select("id", { count: "exact", head: true }).eq("offer_id", offerId).is("answer", null),
  ]);
  if (!offer) return fail("That page is not in this workspace.");
  const text = source?.extracted_text ?? "";
  const words = pageWords(text);
  return {
    ok: true,
    data: {
      briefReady: offer.status !== "extracting" && briefHolds(offer.brief),
      tooShort: source?.extraction_status === "done" && words < MIN_PAGE_WORDS,
      status: offer.status,
      sourceStatus: source?.extraction_status ?? "pending",
      url: source?.url ?? null,
      title: source?.title ?? null,
      words,
      guess: words >= MIN_PAGE_WORDS ? guessPageFormat(text, source?.url ?? "") : null,
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
    supabase.from("offers").select("id, status, brief").eq("id", input.offerId).eq("workspace_id", workspace.id).maybeSingle(),
    supabase.from("offer_sources").select("url, extracted_text, extraction_status").eq("offer_id", input.offerId).order("created_at", { ascending: true }).limit(1).maybeSingle(),
  ]);
  if (!offer) return fail("That page is not in this workspace.");
  if (offer.status === "extracting") return fail("The page is still being read. Give it a moment.");
  if (!source || source.extraction_status !== "done" || !source.extracted_text?.trim()) return fail("The page could not be read, so there is nothing to rewrite. Paste its copy instead.");
  const words = pageWords(source.extracted_text);
  if (words < MIN_PAGE_WORDS) return fail(`The page gave back only ${words} word${words === 1 ? "" : "s"}, so there is nothing to write from. It is probably a JavaScript app or behind a login. Paste its copy instead.`);
  if (!briefHolds(offer.brief)) return fail("The reader could not build a brief from that page. Paste its copy instead, or add sources on the offer page.");
  const url = source.url ?? "the page you pasted";
  return createGeneration({
    offer_id: input.offerId,
    format: input.format,
    purpose: input.purpose || `Rewrite the page at ${url} so it beats the page that is there now: the same offer, to the same reader, doing the same job. The original is the control.`,
    control_text: source.extracted_text.trim().slice(0, CONTROL_MAX),
    manner: input.manner,
    skip_offer: true,
  });
}
