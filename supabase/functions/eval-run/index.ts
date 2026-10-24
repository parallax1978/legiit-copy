/**
 * eval-run: drives an evaluation run through the real pipeline.
 *   POST { run_id, formats?: string[], brief_ids?: uuid[] }
 *     For each eval brief × format: creates an offer in the eval workspace (setting `eval_workspace_id`),
 *     writes its brief and a claims ledger from the brief's proof, and inserts a queued generation with
 *     options { eval_run_id, eval_brief_id, skip_offer: true }. The queue trigger starts it.
 *     → { run_id, status, created: [{generation_id, offer_id, brief_id, format}], skipped: [{brief_id, format, reason}] }
 *   POST { run_id, collect: true }
 *     Copies each completed generation's latest draft into eval_outputs (markdown with ledger tags stripped,
 *     blocks and step log in output/steps) and closes the run when nothing is still running.
 *     → { run_id, status, collected, pending: [...], failed: [...] }
 * Admin only.
 */
import { z } from "zod";
import { type Db, HttpError, json, serviceClient } from "shared/supabase.ts";
import { type JsonValue, parseBody, requireAdmin, serve } from "shared/http.ts";
import type { Database } from "shared/database.types.ts";
import { FORMATS } from "engine/formats/index.ts";
import { initialSteps } from "engine/pipeline.ts";
import { OfferBrief } from "engine/schemas/brief.ts";
import type { ClaimType } from "engine/schemas/common.ts";
import { stripLedger } from "engine/render.ts";

const Body = z.object({
  run_id: z.uuid(),
  collect: z.boolean().optional().default(false),
  formats: z.array(z.string().min(1)).optional(),
  brief_ids: z.array(z.uuid()).optional(),
});

serve(async (req) => {
  const { user } = await requireAdmin(req);
  const body = await parseBody(req, Body);
  const db = serviceClient();

  const { data: run, error } = await db.from("eval_runs").select("*").eq("id", body.run_id).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!run) throw new HttpError(404, "eval run not found");

  return body.collect ? await collect(db, run) : await start(db, run, body, user.id);
});

type EvalRun = Database["public"]["Tables"]["eval_runs"]["Row"];
type ClaimInsert = Database["public"]["Tables"]["offer_claims"]["Insert"];

// ---------- start ----------

async function start(db: Db, run: EvalRun, body: z.infer<typeof Body>, userId: string): Promise<Response> {
  const { data: wsSetting, error: setErr } = await db.rpc("get_setting", { p_key: "eval_workspace_id" });
  if (setErr) throw new HttpError(500, `get_setting failed: ${setErr.message}`);
  if (!wsSetting || !z.uuid().safeParse(wsSetting).success) {
    throw new HttpError(400, "setting eval_workspace_id is unset or not a uuid; set it with admin_set_setting('eval_workspace_id', <workspace uuid>)");
  }
  const evalWs = wsSetting;
  const { data: ws } = await db.from("workspaces").select("id").eq("id", evalWs).maybeSingle();
  if (!ws) throw new HttpError(400, `eval workspace ${evalWs} does not exist`);

  let briefsQ = db.from("eval_briefs").select("*").order("created_at", { ascending: true });
  if (body.brief_ids?.length) briefsQ = briefsQ.in("id", body.brief_ids);
  const { data: briefs, error: bErr } = await briefsQ;
  if (bErr) throw new HttpError(500, bErr.message);
  if (!briefs?.length) throw new HttpError(422, "no eval briefs found");

  const { data: existing } = await db.from("generations").select("id, format, options").contains("options", { eval_run_id: run.id });
  const have = new Set((existing ?? []).map((g) => `${(g.options as Record<string, unknown>)?.eval_brief_id}:${g.format}`));

  const created: { generation_id: string; offer_id: string; brief_id: string; format: string }[] = [];
  const skipped: { brief_id: string; format: string; reason: string }[] = [];

  for (const eb of briefs) {
    const formats = body.formats ?? (Array.isArray(eb.formats) ? (eb.formats as unknown[]).filter((f): f is string => typeof f === "string") : []);
    if (!formats.length) {
      skipped.push({ brief_id: eb.id, format: "*", reason: "brief lists no formats and none were given" });
      continue;
    }
    const parsed = OfferBrief.safeParse(eb.brief);
    const b = parsed.success ? parsed.data : null;
    const raw = (eb.brief ?? {}) as Record<string, unknown>;

    for (const format of formats) {
      if (!(format in FORMATS)) {
        skipped.push({ brief_id: eb.id, format, reason: "format spec missing" });
        continue;
      }
      if (have.has(`${eb.id}:${format}`)) {
        skipped.push({ brief_id: eb.id, format, reason: "generation already exists for this run" });
        continue;
      }

      const { data: offer, error: oErr } = await db
        .from("offers")
        .insert({
          workspace_id: evalWs,
          name: `[eval] ${eb.name} · ${format} · ${run.name}`,
          status: "ready",
          brief: (eb.brief ?? {}) as JsonValue,
          audience: b?.audience.who ?? str(raw.audience) ?? null,
          price: b?.price.text ?? str(raw.price) ?? null,
          guarantee: b?.guarantee.text ?? str(raw.guarantee) ?? null,
          positioning: b?.positioning ?? str(raw.positioning) ?? null,
          created_by: userId,
        })
        .select("id")
        .single();
      if (oErr || !offer) throw new HttpError(500, `offer insert failed: ${oErr?.message ?? "no row"}`);

      const claims = claimsFromBrief(offer.id, evalWs, b, raw);
      if (claims.length) {
        const { error: cErr } = await db.from("offer_claims").insert(claims);
        if (cErr) throw new HttpError(500, `offer_claims insert failed: ${cErr.message}`);
      }

      const stepOrder = initialSteps({ hasActiveResearch: false, hasApprovedOffer: false, skipOffer: true });
      const { data: gen, error: gErr } = await db
        .from("generations")
        .insert({
          workspace_id: evalWs,
          offer_id: offer.id,
          format,
          purpose: `eval: ${run.name}`,
          options: { eval_run_id: run.id, eval_brief_id: eb.id, skip_offer: true },
          status: "queued",
          step_order: stepOrder,
          prompt_version_set: run.prompt_version_set,
          model_set: run.model_set,
          created_by: userId,
        })
        .select("id")
        .single();
      if (gErr || !gen) throw new HttpError(500, `generation insert failed: ${gErr?.message ?? "no row"}`);
      created.push({ generation_id: gen.id, offer_id: offer.id, brief_id: eb.id, format });
      have.add(`${eb.id}:${format}`);
    }
  }

  if (created.length) await db.from("eval_runs").update({ status: "running" }).eq("id", run.id);
  return json({ run_id: run.id, status: created.length ? "running" : run.status, eval_workspace_id: evalWs, created, skipped });
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

/** A starter ledger from the brief: proof items, price, guarantee, deliverables. Grades stay null (unverified). */
function claimsFromBrief(offerId: string, workspaceId: string, b: OfferBrief | null, raw: Record<string, unknown>): ClaimInsert[] {
  const out: ClaimInsert[] = [];
  const base = (claim_text: string, claim_type: ClaimType, role: string): ClaimInsert => ({
    offer_id: offerId,
    workspace_id: workspaceId,
    claim_text,
    claim_type,
    role,
    evidence_grade: null,
    evidence: {},
    status: "unverified",
    created_by: "system",
  });

  const proofs = b?.proof_available ?? (Array.isArray(raw.proof_available) ? (raw.proof_available as unknown[]) : []);
  for (const p of proofs) {
    const r = (p ?? {}) as Record<string, unknown>;
    const claim = str(r.claim);
    if (!claim) continue;
    const row = base(claim, guessType(claim), "proof");
    row.evidence = { source_ref: str(r.source), quote: str(r.evidence), endpoint: null, population: null, dose: null, duration: null, effect_size: null };
    row.precision = /\d/.test(claim) ? claim.match(/[\d.,%$]+(?:\s?(?:%|x|days?|weeks?|months?|years?))?/)?.[0] ?? null : null;
    out.push(row);
  }
  if (b) {
    if (b.price.text) out.push({ ...base(`Price: ${b.price.text}${b.price.plan ? ` (${b.price.plan})` : ""}`, "price_discount", "offer_term"), precision: b.price.text });
    if (b.guarantee.text) {
      out.push({
        ...base(`Guarantee: ${b.guarantee.text}`, "guarantee", "offer_term"),
        guarantee_terms: { text: b.guarantee.text, days: b.guarantee.days, conditions: null, approver: null },
      });
    }
    for (const d of b.deliverables) out.push(base(d, "feature", "feature"));
    if (b.terms) out.push(base(`Terms: ${b.terms}`, "other", "offer_term"));
  } else {
    const price = str(raw.price);
    if (price) out.push({ ...base(`Price: ${price}`, "price_discount", "offer_term"), precision: price });
    const guarantee = str(raw.guarantee);
    if (guarantee) out.push({ ...base(`Guarantee: ${guarantee}`, "guarantee", "offer_term"), guarantee_terms: { text: guarantee, days: null, conditions: null, approver: null } });
    if (Array.isArray(raw.deliverables)) for (const d of raw.deliverables) if (typeof d === "string") out.push(base(d, "feature", "feature"));
  }
  return out;
}

function guessType(claim: string): ClaimType {
  const c = claim.toLowerCase();
  if (/\b(study|trial|journal|published|researchers?|clinical)\b/.test(c)) return "statistic";
  if (/\b(earn|revenue|income|made \$|profit|per month|\/mo)\b/.test(c)) return "earnings";
  if (/\b(customers?|users?|members?|clients?|students?)\b.*\d|\d.*\b(customers?|users?|members?|clients?|students?)\b/.test(c)) return "track_record";
  if (/["“].*["”]|\bsaid\b|\btestimonial\b|\breview\b/.test(c)) return "results_testimonial";
  if (/\b(certified|phd|md|award|founded|years? (in|of))\b/.test(c)) return "credential";
  if (/\d/.test(c)) return "statistic";
  return "benefit";
}

// ---------- collect ----------

async function collect(db: Db, run: EvalRun): Promise<Response> {
  const { data: gens, error } = await db.from("generations").select("*").contains("options", { eval_run_id: run.id }).order("created_at", { ascending: true });
  if (error) throw new HttpError(500, error.message);

  const collected: { generation_id: string; output_id: string; brief_id: string; format: string; version: number }[] = [];
  const pending: { generation_id: string; brief_id: string; format: string; status: string; current_step: string | null }[] = [];
  const failed: { generation_id: string; brief_id: string; format: string; error: string | null }[] = [];
  let cost = 0;

  for (const g of gens ?? []) {
    const opts = (g.options ?? {}) as Record<string, unknown>;
    const briefId = typeof opts.eval_brief_id === "string" ? opts.eval_brief_id : null;
    if (!briefId) continue;
    cost += Number(g.cost_usd ?? 0);

    if (g.status === "completed") {
      const [{ data: draft }, { data: steps }] = await Promise.all([
        db.from("drafts").select("id, version, blocks, markdown, skim_path, ledger_refs, word_count, origin, label").eq("generation_id", g.id).order("version", { ascending: false }).limit(1).maybeSingle(),
        db.from("generation_steps").select("step, attempt, status, model, input_tokens, output_tokens, cost_usd, duration_ms, finished_at").eq("generation_id", g.id).eq("status", "completed").order("created_at", { ascending: true }),
      ]);
      if (!draft) {
        failed.push({ generation_id: g.id, brief_id: briefId, format: g.format, error: "completed without a draft" });
        continue;
      }
      const output: JsonValue = {
        status: "done",
        generation_id: g.id,
        offer_id: g.offer_id,
        draft_id: draft.id,
        version: draft.version,
        origin: draft.origin,
        label: draft.label,
        word_count: draft.word_count,
        blocks: draft.blocks,
        skim_path: draft.skim_path,
        ledger_refs: draft.ledger_refs,
        prompt_version_set: g.prompt_version_set,
        model_set: g.model_set,
      };
      const row = { run_id: run.id, brief_id: briefId, format: g.format, markdown: stripLedger(draft.markdown), output, steps: (steps ?? []) as unknown as JsonValue, cost_usd: Number(g.cost_usd ?? 0) };
      const { data: prior } = await db.from("eval_outputs").select("id").eq("run_id", run.id).eq("brief_id", briefId).eq("format", g.format).maybeSingle();
      let outputId: string;
      if (prior) {
        const { error: uErr } = await db.from("eval_outputs").update(row).eq("id", prior.id);
        if (uErr) throw new HttpError(500, `eval_outputs update failed: ${uErr.message}`);
        outputId = prior.id;
      } else {
        const { data: ins, error: iErr } = await db.from("eval_outputs").insert(row).select("id").single();
        if (iErr || !ins) throw new HttpError(500, `eval_outputs insert failed: ${iErr?.message ?? "no row"}`);
        outputId = ins.id;
      }
      collected.push({ generation_id: g.id, output_id: outputId, brief_id: briefId, format: g.format, version: draft.version });
    } else if (g.status === "failed" || g.status === "cancelled") {
      failed.push({ generation_id: g.id, brief_id: briefId, format: g.format, error: g.error });
    } else {
      pending.push({ generation_id: g.id, brief_id: briefId, format: g.format, status: g.status, current_step: g.current_step });
    }
  }

  const done = pending.length === 0 && (gens?.length ?? 0) > 0;
  const status = done ? (collected.length ? "completed" : "failed") : "running";
  await db.from("eval_runs").update({ cost_usd: Math.round(cost * 1e6) / 1e6, status, finished_at: done ? new Date().toISOString() : null }).eq("id", run.id);

  return json({ run_id: run.id, status, collected, pending, failed, cost_usd: cost });
}
