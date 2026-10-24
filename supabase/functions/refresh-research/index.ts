/**
 * refresh-research: runs the research step for an offer and replaces the active dossier.
 *   POST { offer_id }
 *   → 202 { accepted: true, offer_id, current_version, next_version }
 * The call validates and returns at once; the work runs in EdgeRuntime.waitUntil. When it finishes, a new
 * offer_research row exists with version = max + 1 and active = true and the previous active row is kept with
 * active = false, so the UI can poll the version count. A failed run inserts nothing (see function logs).
 * Editor of the offer's workspace only; 409 until the offer has a brief.
 */
import { z } from "zod";
import { type Db, HttpError, json, requireUser, serviceClient } from "shared/supabase.ts";
import { assertEditor, background, errorMessage, insertClaims, type JsonValue, loadOfferContext, parseBody, recordUsageSafe, serve, sumLlmCalls } from "shared/http.ts";
import { STEPS } from "engine/steps/index.ts";
import { Dossier } from "engine/schemas/research.ts";
import { OfferBrief } from "engine/schemas/brief.ts";

const Body = z.object({ offer_id: z.uuid() });

serve(async (req) => {
  const { client } = await requireUser(req);
  const { offer_id } = await parseBody(req, Body);

  const { data: visible, error } = await client.from("offers").select("id, workspace_id, brief").eq("id", offer_id).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!visible) throw new HttpError(404, "offer not found");
  await assertEditor(client, visible.workspace_id);
  if (!OfferBrief.safeParse(visible.brief).success) throw new HttpError(409, "the offer has no brief yet; run extraction first");

  const db = serviceClient();
  const { data: latest } = await db.from("offer_research").select("version").eq("offer_id", offer_id).order("version", { ascending: false }).limit(1).maybeSingle();
  const currentVersion = latest?.version ?? 0;

  background(runResearch(db, offer_id).catch((e) => console.error(`refresh-research[${offer_id}] failed: ${errorMessage(e)}`, e)));
  return json({ accepted: true, offer_id, current_version: currentVersion, next_version: currentVersion + 1 }, 202);
});

async function runResearch(db: Db, offerId: string): Promise<void> {
  const { ctx, offer, generationId } = await loadOfferContext(db, offerId, "research");
  const result = await STEPS.research(ctx);

  const parsed = Dossier.safeParse(result.effects?.research?.dossier ?? result.output);
  if (!parsed.success) {
    throw new Error(`research output failed validation: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  const dossier = parsed.data;
  const sources = (result.effects?.research?.sources ?? dossier.sources) as JsonValue;
  const totals = await sumLlmCalls(db, { generationId });

  // version = max + 1, computed at insert time; the old active row is kept with active = false
  const { data: prev } = await db.from("offer_research").select("version").eq("offer_id", offerId).order("version", { ascending: false }).limit(1).maybeSingle();
  const { data: previousActive } = await db.from("offer_research").select("id").eq("offer_id", offerId).eq("active", true);
  await db.from("offer_research").update({ active: false }).eq("offer_id", offerId).eq("active", true);

  const { data: row, error: insErr } = await db
    .from("offer_research")
    .insert({
      offer_id: offerId,
      workspace_id: offer.workspace_id,
      version: (prev?.version ?? 0) + 1,
      dossier: dossier as unknown as JsonValue,
      sources,
      active: true,
      model: result.model ?? totals.model,
      cost_usd: totals.cost_usd,
    })
    .select("id, version")
    .single();
  if (insErr || !row) {
    // restore the previous active row so the offer is never left without research
    for (const p of previousActive ?? []) await db.from("offer_research").update({ active: true }).eq("id", p.id);
    throw new Error(`offer_research insert failed: ${insErr?.message ?? "no row"}`);
  }

  if (result.effects?.claimsToAdd?.length) await insertClaims(db, offer, result.effects.claimsToAdd);
  if (result.effects?.questions?.length) {
    await db.from("offer_questions").insert(result.effects.questions.map((q) => ({ offer_id: offerId, workspace_id: offer.workspace_id, question: q.question, why: q.why })));
  }
  await recordUsageSafe(db, { workspaceId: offer.workspace_id, kind: "research", tokens: totals.input_tokens + totals.output_tokens, cost: totals.cost_usd });
  console.log(`refresh-research[${offerId}] version ${row.version} active (${dossier.verbatims.length} verbatims, ${dossier.themes.length} themes, $${totals.cost_usd})`);
}
