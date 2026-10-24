/**
 * judge: LLM-as-judge with the copy chief rubric. Two modes, admin only.
 *   POST { pair_ids: uuid[] (1-10) }
 *     Judges held-out split_test_pairs blind (variant a vs b, ground truth hidden), writes one eval_comparisons
 *     row per pair (kind split_test_pair, ground_truth set) and one judge_calibrations row with the accuracy.
 *     → { calibration_id, judge_model, pairs_evaluated, correct, accuracy, results: [{pair_id, pick, ground_truth, correct, flipped, reason}] }
 *   POST { brief_id, output_a, output_b }
 *     Judges two eval_outputs for the same brief (kind engine_vs_baseline).
 *     → { comparison_id, winner: "a" | "b", reason, flipped, judge_model, cost_usd }
 * The a/b order shown to the model is randomized per call and mapped back, so position bias cannot leak
 * into the pick. The judge must choose; ties are not allowed.
 */
import { z } from "zod";
import { type Db, HttpError, json, serviceClient } from "shared/supabase.ts";
import { errorMessage, type JsonValue, loadPromptVersions, parseBody, requireAdmin, serve } from "shared/http.ts";
import { callModel } from "engine/llm.ts";
import { DEFAULT_MODEL } from "engine/config.ts";
import { COPY_CHIEF_RUBRIC } from "engine/prompts/standard.ts";

const Body = z.union([
  z.object({ pair_ids: z.array(z.uuid()).min(1).max(10) }),
  z.object({ brief_id: z.uuid(), output_a: z.uuid(), output_b: z.uuid() }),
]);

const Pick = z.object({
  pick: z.enum(["a", "b"]).describe("the copy a skeptical stranger is more likely to respond to"),
  reason: z.string().describe("one reason, one or two sentences, naming the gate or rule that decided it"),
  gate_failed_a: z.string().nullable().describe("first gate A-D copy A fails, or null"),
  gate_failed_b: z.string().nullable().describe("first gate A-D copy B fails, or null"),
});

const JUDGE_SYSTEM = `You are the copy chief. You will see a brief and two pieces of copy, A and B, written for the same offer and the same job. Decide which one a skeptical stranger is more likely to respond to: send money, click, reply, or keep what they bought.

Method: run the rubric below on each piece. Gates in order; stop at the first failure; the piece that fails earlier loses. If both pass the same gates, decide on the argument (one reader, one promise, one reason to believe), then on proof placement, then on the offer and close. Never average. Never reward length, polish, formatting or confidence for their own sake. Hedged claims, invented specifics, assistant register and bold-label-colon bullets count against a piece.

You must pick a or b. There is no tie. Give one reason.

${COPY_CHIEF_RUBRIC}`;

serve(async (req) => {
  await requireAdmin(req);
  const body = await parseBody(req, Body);
  const db = serviceClient();
  const pv = (await loadPromptVersions(db))["judge"];
  const judge: JudgeConfig = { system: pv?.template ?? JUDGE_SYSTEM, model: pv?.model ?? DEFAULT_MODEL, promptVersionId: pv?.id ?? null };

  if ("pair_ids" in body) return await judgePairs(db, judge, body.pair_ids);
  return await judgeOutputs(db, judge, body);
});

interface JudgeConfig {
  system: string;
  model: string;
  promptVersionId: string | null;
}
interface Verdict {
  pick: "a" | "b";
  reason: string;
  flipped: boolean;
  model: string;
  costUsd: number;
}

async function judgeOnce(db: Db, cfg: JudgeConfig, args: { brief: string; a: string; b: string; purpose: string }): Promise<Verdict> {
  const flipped = crypto.getRandomValues(new Uint8Array(1))[0] >= 128;
  const shownA = flipped ? args.b : args.a;
  const shownB = flipped ? args.a : args.b;
  const user = [
    `BRIEF:\n${args.brief}`,
    `\n===== COPY A =====\n${shownA}\n===== END COPY A =====`,
    `\n===== COPY B =====\n${shownB}\n===== END COPY B =====`,
    `\nPick a or b with one reason.`,
  ].join("\n");
  const r = await callModel({
    model: cfg.model,
    effort: "high",
    maxTokens: 2000,
    system: cfg.system,
    user,
    schema: Pick,
    log: { db, purpose: args.purpose, promptVersionId: cfg.promptVersionId },
  });
  const raw = r.output.pick;
  const pick: "a" | "b" = flipped ? (raw === "a" ? "b" : "a") : raw;
  return { pick, reason: r.output.reason, flipped, model: r.model, costUsd: r.costUsd };
}

// ---------- split-test calibration ----------

async function judgePairs(db: Db, cfg: JudgeConfig, pairIds: string[]): Promise<Response> {
  const { data: pairs, error } = await db.from("split_test_pairs").select("*").in("id", pairIds);
  if (error) throw new HttpError(500, error.message);
  if (!pairs?.length) throw new HttpError(404, "no split test pairs found");

  const results: { pair_id: string; pick: "a" | "b" | null; ground_truth: "a" | "b" | null; correct: boolean | null; flipped: boolean | null; reason: string | null; comparison_id: string | null; error?: string }[] = [];
  let judgeModel = cfg.model;
  let cost = 0;

  for (const p of pairs) {
    if (!p.variant_a || !p.variant_b) {
      results.push({ pair_id: p.id, pick: null, ground_truth: p.winner as "a" | "b" | null, correct: null, flipped: null, reason: null, comparison_id: null, error: "pair is missing a variant" });
      continue;
    }
    // the brief never names the winner, the lift or why it won
    const brief = [
      p.format ? `Format: ${p.format}` : "",
      p.element_tested ? `Element tested: ${p.element_tested}` : "",
      p.source ? `Source of the test: ${p.source}` : "",
      "The two variants below were split-tested against each other for the same offer and audience.",
    ].filter(Boolean).join("\n");
    try {
      const v = await judgeOnce(db, cfg, { brief, a: p.variant_a, b: p.variant_b, purpose: "judge_split_test_pair" });
      judgeModel = v.model;
      cost += v.costUsd;
      const { data: cmp, error: cErr } = await db
        .from("eval_comparisons")
        .insert({
          kind: "split_test_pair",
          split_test_pair_id: p.id,
          winner: v.pick,
          reason: v.reason,
          judged_by: "judge",
          judge_model: v.model,
          judge_prompt_version_id: cfg.promptVersionId,
          ground_truth: p.winner,
        })
        .select("id, correct")
        .single();
      if (cErr) throw new Error(`eval_comparisons insert failed: ${cErr.message}`);
      const gt = p.winner as "a" | "b" | null;
      results.push({ pair_id: p.id, pick: v.pick, ground_truth: gt, correct: gt ? v.pick === gt : null, flipped: v.flipped, reason: v.reason, comparison_id: cmp?.id ?? null });
    } catch (e) {
      results.push({ pair_id: p.id, pick: null, ground_truth: p.winner as "a" | "b" | null, correct: null, flipped: null, reason: null, comparison_id: null, error: errorMessage(e) });
    }
  }

  const scored = results.filter((r) => r.correct !== null);
  const correct = scored.filter((r) => r.correct).length;
  const details: JsonValue = {
    pair_ids: pairIds,
    results: results as unknown as JsonValue,
    flipped_share: scored.length ? scored.filter((r) => r.flipped).length / scored.length : null,
    picked_a_share: scored.length ? scored.filter((r) => r.pick === "a").length / scored.length : null,
    cost_usd: cost,
    prompt_version_id: cfg.promptVersionId,
  };
  const { data: cal, error: calErr } = await db
    .from("judge_calibrations")
    .insert({ judge_model: judgeModel, judge_prompt_version_id: cfg.promptVersionId, pairs_evaluated: scored.length, correct, details })
    .select("id, accuracy")
    .single();
  if (calErr) throw new HttpError(500, `judge_calibrations insert failed: ${calErr.message}`);

  return json({
    calibration_id: cal?.id ?? null,
    judge_model: judgeModel,
    pairs_evaluated: scored.length,
    correct,
    accuracy: scored.length ? correct / scored.length : 0,
    cost_usd: cost,
    results,
  });
}

// ---------- engine vs baseline ----------

async function judgeOutputs(db: Db, cfg: JudgeConfig, body: { brief_id: string; output_a: string; output_b: string }): Promise<Response> {
  if (body.output_a === body.output_b) throw new HttpError(400, "output_a and output_b must differ");
  const [{ data: brief }, { data: outs, error }] = await Promise.all([
    db.from("eval_briefs").select("id, name, brief, market").eq("id", body.brief_id).maybeSingle(),
    db.from("eval_outputs").select("id, brief_id, format, markdown").in("id", [body.output_a, body.output_b]),
  ]);
  if (error) throw new HttpError(500, error.message);
  if (!brief) throw new HttpError(404, "eval brief not found");
  const a = outs?.find((o) => o.id === body.output_a);
  const b = outs?.find((o) => o.id === body.output_b);
  if (!a || !b) throw new HttpError(404, "eval output not found");
  if (a.brief_id !== brief.id || b.brief_id !== brief.id) throw new HttpError(400, "both outputs must belong to the brief");
  if (!a.markdown || !b.markdown) throw new HttpError(422, "both outputs need markdown (collect the run first)");

  const briefText = [
    `Offer: ${brief.name}${brief.market ? ` (${brief.market})` : ""}`,
    `Format: ${a.format}${a.format !== b.format ? ` vs ${b.format}` : ""}`,
    `Brief:\n${JSON.stringify(brief.brief, null, 2)}`,
  ].join("\n");
  const v = await judgeOnce(db, cfg, { brief: briefText, a: a.markdown, b: b.markdown, purpose: "judge_engine_vs_baseline" });

  const { data: cmp, error: cErr } = await db
    .from("eval_comparisons")
    .insert({
      kind: "engine_vs_baseline",
      brief_id: brief.id,
      output_a: a.id,
      output_b: b.id,
      winner: v.pick,
      reason: v.reason,
      judged_by: "judge",
      judge_model: v.model,
      judge_prompt_version_id: cfg.promptVersionId,
    })
    .select("id")
    .single();
  if (cErr || !cmp) throw new HttpError(500, `eval_comparisons insert failed: ${cErr?.message ?? "no row"}`);

  return json({ comparison_id: cmp.id, winner: v.pick, reason: v.reason, flipped: v.flipped, judge_model: v.model, cost_usd: v.costUsd });
}
