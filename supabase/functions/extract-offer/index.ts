/**
 * extract-offer: runs the intake step for an offer (sources → brief, claims ledger, config, open questions).
 *   POST { offer_id }
 *   → { offer_id, status: "needs_review" | "ready", brief, claims, questions: [{id, question, why, blocking}], cost_usd, input_tokens, output_tokens, model }
 * Editor of the offer's workspace only. The intake step reads the offer's sources itself through ctx.db.
 */
import { z } from "zod";
import { HttpError, json, requireUser, serviceClient } from "shared/supabase.ts";
import { assertEditor, parseBody, runIntake, serve } from "shared/http.ts";

const Body = z.object({ offer_id: z.uuid() });

serve(async (req) => {
  const { client } = await requireUser(req);
  const { offer_id } = await parseBody(req, Body);

  const { data: offer, error } = await client.from("offers").select("id, workspace_id, status").eq("id", offer_id).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!offer) throw new HttpError(404, "offer not found");
  await assertEditor(client, offer.workspace_id);
  if (offer.status === "extracting") throw new HttpError(409, "extraction is already running for this offer");

  const db = serviceClient();
  const { count } = await db.from("offer_sources").select("id", { count: "exact", head: true }).eq("offer_id", offer_id).eq("extraction_status", "done");
  const { data: current } = await db.from("offers").select("brief").eq("id", offer_id).single();
  const hasBrief = !!current?.brief && typeof current.brief === "object" && Object.keys(current.brief as object).length > 0;
  if (!count && !hasBrief) throw new HttpError(422, "add at least one ingested source (or a typed description) before extracting");

  const result = await runIntake(db, offer_id);
  return json(result);
});
