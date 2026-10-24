/**
 * refresh-research: runs the research step for an offer and replaces the active dossier.
 *   POST { offer_id }
 *   → { research_id, offer_id, version, cost_usd, model, sources, verbatims, themes, summary }
 * Editor of the offer's workspace only. The previous dossier is kept (active = false) for comparison.
 */
import { z } from "zod";
import { HttpError, json, requireUser, serviceClient } from "shared/supabase.ts";
import { assertEditor, insertClaims, type JsonValue, loadOfferContext, parseBody, recordUsageSafe, serve, sumLlmCalls } from "shared/http.ts";
import { STEPS } from "engine/steps/index.ts";
import { Dossier } from "engine/schemas/research.ts";

const Body = z.object({ offer_id: z.uuid() });

serve(async (req) => {
  const { client } = await requireUser(req);
  const { offer_id } = await parseBody(req, Body);

  const { data: visible, error } = await client.from("offers").select("id, workspace_id").eq("id", offer_id).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!visible) throw new HttpError(404, "offer not found");
  await assertEditor(client, visible.workspace_id);

  const db = serviceClient();
  const { ctx, offer, generationId } = await loadOfferContext(db, offer_id, "research");
  if (!ctx.brief) throw new HttpError(409, "the offer has no brief yet; run extraction first");

  const result = await STEPS.research(ctx);
  const parsed = Dossier.safeParse(result.effects?.research?.dossier ?? result.output);
  if (!parsed.success) {
    throw new HttpError(502, `research output failed validation: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  const dossier = parsed.data;
  const sources = (result.effects?.research?.sources ?? dossier.sources) as JsonValue;
  const totals = await sumLlmCalls(db, { generationId });

  const { data: prev } = await db.from("offer_research").select("id, version").eq("offer_id", offer_id).order("version", { ascending: false }).limit(1).maybeSingle();
  const { data: previousActive } = await db.from("offer_research").select("id").eq("offer_id", offer_id).eq("active", true);
  await db.from("offer_research").update({ active: false }).eq("offer_id", offer_id).eq("active", true);

  const { data: row, error: insErr } = await db
    .from("offer_research")
    .insert({
      offer_id,
      workspace_id: offer.workspace_id,
      version: (prev?.version ?? 0) + 1,
      dossier: dossier as unknown as JsonValue,
      sources,
      active: true,
      model: result.model ?? totals.model,
      cost_usd: totals.cost_usd,
    })
    .select("id, version, created_at")
    .single();
  if (insErr || !row) {
    // restore the previous active row so the offer is never left without research
    for (const p of previousActive ?? []) await db.from("offer_research").update({ active: true }).eq("id", p.id);
    throw new HttpError(500, `offer_research insert failed: ${insErr?.message ?? "no row"}`);
  }

  if (result.effects?.claimsToAdd?.length) await insertClaims(db, offer, result.effects.claimsToAdd);
  if (result.effects?.questions?.length) {
    await db.from("offer_questions").insert(result.effects.questions.map((q) => ({ offer_id, workspace_id: offer.workspace_id, question: q.question, why: q.why })));
  }
  await recordUsageSafe(db, { workspaceId: offer.workspace_id, kind: "research", tokens: totals.input_tokens + totals.output_tokens, cost: totals.cost_usd });

  return json({
    research_id: row.id,
    offer_id,
    version: row.version,
    created_at: row.created_at,
    cost_usd: totals.cost_usd,
    model: result.model ?? totals.model,
    sources: Array.isArray(sources) ? sources.length : dossier.sources.length,
    verbatims: dossier.verbatims.length,
    themes: dossier.themes.length,
    summary: result.summary,
  });
});
