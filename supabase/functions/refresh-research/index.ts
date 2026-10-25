/**
 * refresh-research: runs the research step for an offer and replaces the active dossier.
 *   POST { offer_id }                                       signed-in editor of the offer's workspace
 *   → 202 { accepted: true, offer_id, current_version, next_version }
 * Research is several model calls, one per invocation (the engine's continueLater protocol): a pass that stops
 * short hands its checkpoint to the next invocation of this function, which it calls itself with the pipeline's
 * shared secret, until the step completes. Then a new offer_research row exists with version = max + 1 and
 * active = true, the previous active row is kept with active = false (the UI polls the version count), and the
 * ledger rows the dossier yields (speaker, refund terms, every verbatim) are inserted. A failed pass inserts
 * nothing (see function logs). 409 until the offer has a brief.
 */
import { z } from "zod";
import { type Db, HttpError, json, requireUser, serviceClient } from "shared/supabase.ts";
import { assertEditor, background, errorMessage, insertClaims, type JsonValue, loadOfferContext, parseBody, recordUsageSafe, secretMatches, serve, sumLlmCalls } from "shared/http.ts";
import { STEPS } from "engine/steps/index.ts";
import { Dossier } from "engine/schemas/research.ts";
import { OfferBrief } from "engine/schemas/brief.ts";

/** Passes a refresh may take; the pipeline's research finishes in three or four. */
const MAX_PASSES = 8;
const SHARED_SECRET = Deno.env.get("PIPELINE_SHARED_SECRET") ?? "";

const Body = z.object({ offer_id: z.uuid() });
/** A continuation pass, sent by this function to itself: the same synthetic generation id, the step's checkpoint. */
const Continuation = z.object({ offer_id: z.uuid(), generation_id: z.uuid(), pass: z.number().int().min(2).max(MAX_PASSES), partial: z.unknown() });
type Pass = z.output<typeof Continuation>;

serve(async (req) => {
  const given = req.headers.get("x-pipeline-secret");
  if (given !== null) {
    if (SHARED_SECRET.length < 16 || !(await secretMatches(SHARED_SECRET, given))) throw new HttpError(401, "unauthorized");
    const pass = await parseBody(req, Continuation);
    background(runPass(serviceClient(), pass).catch((e) => console.error(`refresh-research[${pass.offer_id}] pass ${pass.pass} failed: ${errorMessage(e)}`, e)));
    return json({ accepted: true, offer_id: pass.offer_id, pass: pass.pass }, 202);
  }
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

  background(runPass(db, { offer_id, generation_id: crypto.randomUUID(), pass: 1, partial: null }).catch((e) => console.error(`refresh-research[${offer_id}] failed: ${errorMessage(e)}`, e)));
  return json({ accepted: true, offer_id, current_version: currentVersion, next_version: currentVersion + 1 }, 202);
});

async function runPass(db: Db, pass: Pass): Promise<void> {
  const offerId = pass.offer_id;
  const { ctx, offer } = await loadOfferContext(db, offerId, "research");
  // one synthetic generation id across the passes, so the llm_calls of every pass sum to the dossier's cost
  const generationId = pass.generation_id;
  ctx.generation.id = generationId;
  ctx.partial = pass.partial ?? null;
  let checkpoint: unknown = pass.partial ?? null;
  ctx.savePartial = (p: unknown) => {
    checkpoint = p;
    return Promise.resolve();
  };
  const result = await STEPS.research(ctx);
  if (result.continueLater) {
    if (pass.pass >= MAX_PASSES) throw new Error(`research did not finish in ${MAX_PASSES} passes (${result.continueLater.reason})`);
    await invokeSelf({ offer_id: offerId, generation_id: generationId, pass: pass.pass + 1, partial: checkpoint });
    console.log(`refresh-research[${offerId}] pass ${pass.pass} continued: ${result.continueLater.reason}`);
    return;
  }

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

/** The next pass, as a fresh invocation: the function limit is per invocation, and each pass is one model call. */
async function invokeSelf(body: Pass): Promise<void> {
  if (SHARED_SECRET.length < 16) throw new Error("PIPELINE_SHARED_SECRET is unset or shorter than 16 characters; research cannot continue past its first pass");
  const base = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is unset");
  const res = await fetch(`${base}/functions/v1/refresh-research`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-pipeline-secret": SHARED_SECRET, Authorization: `Bearer ${key}`, apikey: key },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`continuation call failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
}
