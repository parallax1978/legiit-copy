/**
 * extract-offer: runs the intake step for an offer (sources → brief, claims ledger, config, open questions).
 *   POST { offer_id }
 *   → { offer_id, status: "needs_review" | "ready", brief, claims, questions: [{id, question, why, blocking}], cost_usd, input_tokens, output_tokens, model }
 * Editor of the offer's workspace only. The intake step reads the offer's sources itself through ctx.db.
 * The offer never stays in status 'extracting': failure → 'needs_review' (error in brief.unknowns) or 'draft'.
 */
import { z } from "zod";
import { HttpError, json, requireUser, serviceClient } from "shared/supabase.ts";
import { assertEditor, leaveExtracting, parseBody, runIntake, serve } from "shared/http.ts";

const Body = z.object({ offer_id: z.uuid() });

serve(async (req) => {
  const { client } = await requireUser(req);
  const { offer_id } = await parseBody(req, Body);

  const { data: offer, error } = await client.from("offers").select("id, workspace_id, status, brief").eq("id", offer_id).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!offer) throw new HttpError(404, "offer not found");
  await assertEditor(client, offer.workspace_id);

  // The UI sets status 'extracting' before calling; whatever happens, the offer leaves that status here.
  const db = serviceClient();
  const { count } = await db.from("offer_sources").select("id", { count: "exact", head: true }).eq("offer_id", offer_id).eq("extraction_status", "done");
  const hasBrief = !!offer.brief && typeof offer.brief === "object" && Object.keys(offer.brief as object).length > 0;
  if (!count && !hasBrief) {
    const err = new HttpError(422, "add at least one ingested source (or a typed description) before extracting");
    await leaveExtracting(db, offer_id, null, err);
    throw err;
  }

  const result = await runIntake(db, offer_id); // runIntake itself resets the status on failure
  return json(result);
});
