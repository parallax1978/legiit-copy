/**
 * baseline-generate: the comparison generator for evals. One plain prompt, no standard, no ledger, no review:
 * "Write a <format> for this offer: <brief json>" on the default model. Stores the result in eval_outputs.
 *   POST { run_id, brief_id, format }
 *   → { output_id, run_id, brief_id, format, model, cost_usd, words, truncated }
 * Admin only.
 */
import { z } from "zod";
import { HttpError, json, serviceClient } from "shared/supabase.ts";
import { type JsonValue, parseBody, requireAdmin, serve } from "shared/http.ts";
import { callModel, TruncatedError } from "engine/llm.ts";
import { DEFAULT_MODEL } from "engine/config.ts";
import { FORMATS } from "engine/formats/index.ts";
import { FormatId } from "engine/schemas/common.ts";

const Body = z.object({ run_id: z.uuid(), brief_id: z.uuid(), format: FormatId });

const SYSTEM = "You are an expert direct response copywriter. Write the requested copy in markdown. Output only the copy.";

serve(async (req) => {
  await requireAdmin(req);
  const { run_id, brief_id, format } = await parseBody(req, Body);
  const db = serviceClient();

  const [{ data: run }, { data: brief }] = await Promise.all([
    db.from("eval_runs").select("id, name, cost_usd").eq("id", run_id).maybeSingle(),
    db.from("eval_briefs").select("id, name, brief").eq("id", brief_id).maybeSingle(),
  ]);
  if (!run) throw new HttpError(404, "eval run not found");
  if (!brief) throw new HttpError(404, "eval brief not found");

  const formatName = FORMATS[format]?.name?.toLowerCase() ?? format.replace(/_/g, " ");
  const prompt = `Write a ${formatName} for this offer:\n\n${JSON.stringify(brief.brief, null, 2)}`;

  // the row exists before the call so llm_calls.eval_output_id can point at it
  const { data: created, error: insErr } = await db
    .from("eval_outputs")
    .insert({ run_id, brief_id, format, output: { baseline: true, status: "running", prompt } })
    .select("id")
    .single();
  if (insErr || !created) throw new HttpError(500, `eval_outputs insert failed: ${insErr?.message ?? "no row"}`);

  let text = "";
  let model = DEFAULT_MODEL;
  let truncated = false;
  let stopReason: string | null = null;
  let cost = 0;
  try {
    const r = await callModel({
      model: DEFAULT_MODEL,
      effort: "high",
      maxTokens: 12000,
      system: SYSTEM,
      user: prompt,
      cacheSystem: false,
      log: { db, evalOutputId: created.id, purpose: "baseline_generate" },
    });
    text = r.text;
    model = r.model;
    stopReason = r.stopReason;
    cost = r.costUsd;
  } catch (e) {
    if (e instanceof TruncatedError) {
      text = e.partialText;
      truncated = true;
      stopReason = "max_tokens";
      const { data: calls } = await db.from("llm_calls").select("cost_usd, model").eq("eval_output_id", created.id);
      cost = (calls ?? []).reduce((a, c) => a + Number(c.cost_usd), 0);
      model = calls?.at(-1)?.model ?? model;
    } else {
      await db.from("eval_outputs").update({ output: { baseline: true, status: "failed", prompt, error: e instanceof Error ? e.message : String(e) } }).eq("id", created.id);
      throw e;
    }
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  const output: JsonValue = { baseline: true, status: "done", model, stop_reason: stopReason, truncated, prompt, words };
  const { error: upErr } = await db.from("eval_outputs").update({ markdown: text, output, cost_usd: cost }).eq("id", created.id);
  if (upErr) throw new HttpError(500, `eval_outputs update failed: ${upErr.message}`);
  await db.from("eval_runs").update({ cost_usd: Number(run.cost_usd) + cost, status: "running" }).eq("id", run_id);

  return json({ output_id: created.id, run_id, brief_id, format, model, cost_usd: cost, words, truncated });
});
