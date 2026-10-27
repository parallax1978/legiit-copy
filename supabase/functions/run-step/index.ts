/**
 * run-step: the pipeline worker. app.dispatch_pipeline (pg_cron → pg_net) POSTs one pgmq message here:
 *   headers: x-pipeline-secret, x-msg-id
 *   body:    { msg_id, read_ct, message: { generation_id, step } }
 * The function verifies the shared secret, answers 202 at once, and runs exactly one engine step in the
 * background (EdgeRuntime.waitUntil). It is idempotent per (generation, step, pass): a redelivered message
 * for a step that already completed in the current pass is acked and dropped; a message for a dead
 * generation is archived; a failed attempt is left unacked so the queue redelivers it after the visibility
 * timeout, until MAX_STEP_ATTEMPTS, when the generation is marked failed and the message archived.
 * Resumable steps: a step may checkpoint with ctx.savePartial and return `continueLater` when its time budget is
 * spent; the attempt is marked 'continued', the same step is enqueued again and the next attempt receives the
 * checkpoint as ctx.partial. Interrupted and failed attempts that saved a checkpoint resume the same way.
 */
import { z } from "zod";
import { type Db, serviceClient } from "shared/supabase.ts";
import { background, errorMessage, recordUsageSafe, stepTimeBudgetMs, sumLlmCalls, secretMatches } from "shared/http.ts";
import type { Database, Json } from "shared/database.types.ts";
import { MAX_GENERATION_COST_USD, MAX_STEP_ATTEMPTS, STEP_NAMES, type StepName } from "engine/config.ts";
import { inFinalPass, nextSteps, passBoundary, STEP_PREDECESSORS, type PipelineState } from "engine/pipeline.ts";
import { STEPS } from "engine/steps/index.ts";
import type { GenerationRow, StepContext, StepResult } from "engine/steps/types.ts";
import { RefusalError, TruncatedError } from "engine/llm.ts";
import { type AppliedEffects, applyEffects, buildContext } from "engine/context.ts";

/** pgmq visibility timeout used by app.dispatch_pipeline; a running row older than this is presumed dead. */
const VISIBILITY_MS = 450_000;
/** A failed attempt is re-enqueued this soon; the dispatcher polls every five seconds. */
const RETRY_DELAY_SECONDS = 15;

const Body = z.object({
  msg_id: z.coerce.number().int(),
  read_ct: z.coerce.number().int().min(1).default(1),
  message: z.object({ generation_id: z.uuid(), step: z.enum(STEP_NAMES) }).loose(),
});
type Body = z.infer<typeof Body>;

/** Which steps a given step enqueues (pipeline.ts STEP_PREDECESSORS, inverted). */
const SUCCESSORS: Record<StepName, StepName[]> = Object.fromEntries(
  STEP_NAMES.map((s) => [s, STEP_NAMES.filter((t) => STEP_PREDECESSORS[t].includes(s))]),
) as Record<StepName, StepName[]>;

const LABELS: Record<StepName, string> = {
  intake: "Intake",
  research: "Research",
  offer: "Offer construction",
  argument: "Argument selection",
  draft: "Drafting",
  tell_edit: "AI tell cleanup",
  cold_read: "Cold read",
  editorial: "Editorial review",
  mechanical: "Mechanical passes",
  factual: "Factual and compliance review",
  revise: "Revision",
  ship: "Ship and log",
};
const label = (s: StepName) => LABELS[s] ?? s;

interface StepRowLite {
  id: string;
  step: string;
  attempt: number;
  status: string;
  output: Json | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

// ---------- shutdown: a running attempt is marked interrupted so the retry is explainable ----------
const running = new Map<string, Db>();
addEventListener("beforeunload", () => {
  for (const [id, db] of running) {
    const p = (async () => {
      const { error } = await db
        .from("generation_steps")
        .update({ status: "interrupted", error: "worker shut down before the step finished", finished_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "running");
      if (error) console.error("interrupt mark failed", error.message);
    })().catch((e) => console.error("interrupt mark threw", e));
    background(p);
  }
  running.clear();
});

// ---------- HTTP ----------
// Deployed with --no-verify-jwt: the shared secret is the only gate. Unset or short means every request is refused.
const SHARED_SECRET = Deno.env.get("PIPELINE_SHARED_SECRET") ?? "";
if (SHARED_SECRET.length < 16) console.error("PIPELINE_SHARED_SECRET is unset or shorter than 16 characters; run-step refuses every request");

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const given = req.headers.get("x-pipeline-secret");
  if (SHARED_SECRET.length < 16 || !given || !(await secretMatches(SHARED_SECRET, given))) return new Response("unauthorized", { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    // A malformed message would be redelivered forever: archive it when we can tell which one it is.
    const fromBody = (raw as { msg_id?: unknown } | null)?.msg_id;
    const n = Number(fromBody ?? req.headers.get("x-msg-id"));
    if (Number.isFinite(n) && n > 0) background(archive(serviceClient(), n).catch((e) => console.error("archive of malformed message failed", e)));
    return new Response(JSON.stringify({ error: "invalid message", issues: parsed.error.issues.slice(0, 3) }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  background(runMessage(parsed.data).catch((e) => console.error(`run-step: unhandled error for msg ${parsed.data.msg_id}`, e)));
  return new Response(JSON.stringify({ accepted: true, msg_id: parsed.data.msg_id, step: parsed.data.message.step }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
});

// ---------- the worker ----------
async function runMessage(body: Body): Promise<void> {
  const db = serviceClient();
  const { msg_id: msgId, read_ct: readCt } = body;
  const generationId = body.message.generation_id;
  const step = body.message.step as StepName;
  const tag = `run-step[${step} gen=${generationId.slice(0, 8)} msg=${msgId} read=${readCt}]`;
  const startedMs = Date.now();

  // 1. the generation
  const { data: gen, error: genErr } = await db.from("generations").select("*").eq("id", generationId).maybeSingle();
  if (genErr) throw new Error(`${tag} generations load failed: ${genErr.message}`);
  if (!gen) {
    console.warn(`${tag} generation missing; archiving message`);
    await archive(db, msgId);
    return;
  }
  if (gen.status === "cancelled" || gen.status === "failed" || gen.status === "completed") {
    console.log(`${tag} generation is ${gen.status}; archiving message`);
    await archive(db, msgId);
    return;
  }

  // 2. history and idempotency
  const history = await loadHistory(db, generationId);
  const forced = gen.status === "queued" && gen.current_step === step; // requeue_generation targets this step on purpose
  // a Retry or Try another angle starts a new pass: attempts before the restart are not counted, not resumed
  const boundary = later(passBoundary(step, history), gen.requeued_at ?? null);
  const thisPass = history.filter((r) => r.step === step && isAfter(r.created_at, boundary));

  if (!forced) {
    // Done only when the newest row of this pass is the completion: a failed or interrupted attempt after it
    // means a retry was in flight (a requeue from this step, or a pause the user resumed), and this delivery is it.
    const newest = thisPass.at(-1);
    const done = newest?.status === "completed" ? newest : undefined;
    if (done) {
      // Completed already (ack lost, or a duplicate enqueue). Re-issue the fan-out when nothing followed it.
      const followed = history.some((r) => SUCCESSORS[step].includes(r.step as StepName) && isAfter(r.created_at, done.finished_at ?? done.created_at));
      if (!followed && step !== "ship") {
        try {
          const state = await pipelineState(db, gen, history, step, null);
          const next = nextSteps(step, state);
          for (const s of next) await enqueue(db, generationId, s);
          if (next.length) console.log(`${tag} already completed; re-enqueued ${next.join(", ")}`);
        } catch (e) {
          console.error(`${tag} re-enqueue after duplicate failed`, e);
        }
      }
      await ack(db, msgId);
      return;
    }
    const live = thisPass.find((r) => r.status === "running" && r.started_at && Date.now() - Date.parse(r.started_at) < VISIBILITY_MS);
    if (live) {
      console.log(`${tag} attempt ${live.attempt} is still running under another message; dropping duplicate`);
      await ack(db, msgId);
      return;
    }
  }

  // a running row older than the visibility timeout belongs to a dead invocation; make that explicit before resuming
  for (const r of thisPass) {
    if (r.status === "running" && (!r.started_at || Date.now() - Date.parse(r.started_at) >= VISIBILITY_MS)) {
      await db.from("generation_steps").update({ status: "interrupted", error: "attempt never finished", finished_at: new Date().toISOString() }).eq("id", r.id).eq("status", "running");
      r.status = "interrupted";
    }
  }

  const attempt = history.filter((r) => r.step === step).reduce((m, r) => Math.max(m, r.attempt), 0) + 1;
  // 'continued' attempts are a step pausing on purpose: never a failure, never a duplicate
  const failedBefore = thisPass.filter((r) => r.status === "failed" || r.status === "interrupted").length;
  const continuedAttempts = thisPass.filter((r) => r.status === "continued").map((r) => r.attempt);
  const resumeFrom = resumePartial(thisPass);

  // Interrupted attempts never reach failAttempt (the worker was shut down), so the cap is enforced here too:
  // otherwise a step that outlives every invocation is redelivered, and billed, forever.
  if (failedBefore >= MAX_STEP_ATTEMPTS) {
    await failGeneration(db, { tag, gen, step, msgId }, `${label(step)} could not finish after ${failedBefore} attempts: each one took too long. Use "Retry" to run it again; if it keeps failing, support can read the details.`);
    return;
  }
  const spent = await sumLlmCalls(db, { generationId }).catch(() => null);
  if (spent && spent.cost_usd >= MAX_GENERATION_COST_USD) {
    console.error(`${tag} cost ceiling: $${spent.cost_usd.toFixed(2)} >= $${MAX_GENERATION_COST_USD}`);
    await failGeneration(db, { tag, gen, step, msgId }, `Stopped before ${label(step)}: this piece has used more writing than one piece is allowed. Support can raise the limit.`);
    return;
  }

  // 3. running row + generation status
  const startedAt = new Date().toISOString();
  const { data: stepRow, error: insErr } = await db
    .from("generation_steps")
    .insert({ generation_id: generationId, workspace_id: gen.workspace_id, step, attempt, status: "running", started_at: startedAt })
    .select("id")
    .single();
  if (insErr || !stepRow) throw new Error(`${tag} generation_steps insert failed: ${insErr?.message}`);
  running.set(stepRow.id, db);

  await db.from("generations").update({ status: "running", current_step: step, progress_message: `${label(step)}…`, error: null }).eq("id", generationId);

  const progress = async (message: string) => {
    const { error } = await db.from("generations").update({ progress_message: message.slice(0, 500) }).eq("id", generationId);
    if (error) console.error(`${tag} progress update failed`, error.message);
  };

  // 4. the step
  let ctx: StepContext;
  let result: StepResult;
  let applied: AppliedEffects = {};
  let savedPartial = false;
  try {
    ctx = await buildContext(db, generationId, attempt, progress);
    ctx.startedAt = startedMs;
    ctx.timeBudgetMs = stepTimeBudgetMs();
    ctx.partial = resumeFrom;
    ctx.savePartial = async (partial: unknown) => {
      const { error } = await db.from("generation_steps").update({ output: { partial } as unknown as Json }).eq("id", stepRow.id);
      if (error) console.error(`${tag} savePartial failed`, error.message);
      savedPartial = !error;
    };
    if (resumeFrom !== null) console.log(`${tag} resuming from the checkpoint of an earlier attempt`);

    result = await STEPS[step](ctx);

    if (result.continueLater) {
      running.delete(stepRow.id);
      await continueLater(db, { tag, gen, step, attempt, msgId, stepRowId: stepRow.id, startedMs }, result, savedPartial);
      return;
    }
    applied = await applyEffects(db, ctx, step, result);
  } catch (e) {
    running.delete(stepRow.id);
    await failAttempt(db, { tag, gen, step, attempt, msgId, readCt, failedBefore, stepRowId: stepRow.id, startedMs }, e);
    return;
  }

  // 5. persist completion (if this fails the attempt is retried; effects may then apply twice, which is why it comes first and alone)
  let totals;
  try {
    totals = await sumLlmCalls(db, { generationId, step, attempt });
    const finishedAt = new Date().toISOString();
    const { error } = await db
      .from("generation_steps")
      .update({
        status: "completed",
        output: (result.output ?? null) as Json,
        model: result.model ?? totals.model,
        input_tokens: totals.input_tokens,
        output_tokens: totals.output_tokens,
        cost_usd: totals.cost_usd,
        duration_ms: Date.now() - startedMs,
        finished_at: finishedAt,
      })
      .eq("id", stepRow.id);
    if (error) throw new Error(`generation_steps completion failed: ${error.message}`);
  } catch (e) {
    running.delete(stepRow.id);
    await failAttempt(db, { tag, gen, step, attempt, msgId, readCt, failedBefore, stepRowId: stepRow.id, startedMs }, e);
    return;
  }
  running.delete(stepRow.id);

  // 6. usage + totals, then routing. Nothing below re-runs the model; errors here are logged and the message still acked
  //    only when routing succeeded (an unacked message re-enters at step 2 and re-issues the fan-out).
  // usage for the step is recorded once, on completion, and covers the 'continued' attempts of this pass too
  const chain = continuedAttempts.length ? await sumLlmCalls(db, { generationId, step, attempts: [...continuedAttempts, attempt] }).catch(() => totals) : totals;
  await recordUsageSafe(db, {
    workspaceId: gen.workspace_id,
    generationId,
    step,
    attempt,
    kind: "step_completed",
    tokens: chain.input_tokens + chain.output_tokens,
    cost: chain.cost_usd,
  });
  const genTotals = await sumLlmCalls(db, { generationId }).catch((e) => {
    console.error(`${tag} generation totals failed`, e);
    return null;
  });
  const genPatch: Database["public"]["Tables"]["generations"]["Update"] = genTotals
    ? { cost_usd: genTotals.cost_usd, input_tokens: genTotals.input_tokens, output_tokens: genTotals.output_tokens }
    : {};
  // The offer step proposes an offer_variants row; the UI finds it through generations.variant_id while the job waits.
  const variantId = await resolveVariantId(db, gen, step, applied);
  if (variantId) genPatch.variant_id = variantId;
  if (applied.researchId) genPatch.research_id = applied.researchId;

  if (result.pause) {
    await db.from("generations").update({ ...genPatch, status: "needs_input", current_step: step, progress_message: result.pause.reason.slice(0, 500) }).eq("id", generationId);
    console.log(`${tag} paused: ${result.pause.reason}`);
    await ack(db, msgId);
    return;
  }

  if (step === "ship") {
    const finishedAt = new Date().toISOString();
    await db
      .from("generations")
      .update({ ...genPatch, status: "completed", current_step: step, completed_at: finishedAt, progress_message: result.summary?.slice(0, 500) ?? "Done" })
      .eq("id", generationId);
    await recordUsageSafe(db, {
      workspaceId: gen.workspace_id,
      generationId,
      step: "generation",
      attempt,
      kind: "generation_completed",
      tokens: (genTotals?.input_tokens ?? 0) + (genTotals?.output_tokens ?? 0),
      cost: genTotals?.cost_usd ?? 0,
    });
    console.log(`${tag} generation completed`);
    await ack(db, msgId);
    return;
  }

  try {
    const fresh = await loadHistory(db, generationId);
    const state = await pipelineState(db, gen, fresh, step, result);
    const next = nextSteps(step, state);
    for (const s of next) await enqueue(db, generationId, s);

    const patch: Database["public"]["Tables"]["generations"]["Update"] = { ...genPatch, current_step: step };
    if (next.length) patch.progress_message = `${label(step)} done. Next: ${next.map(label).join(", ")}`;
    else if (step === "offer") {
      patch.status = "needs_input";
      patch.progress_message = "Offer construction is ready for your approval";
    } else patch.progress_message = `${label(step)} done. Waiting for the other reviews`;
    await db.from("generations").update(patch).eq("id", generationId);
    console.log(`${tag} completed in ${Date.now() - startedMs}ms; next: [${next.join(", ")}]`);
  } catch (e) {
    // step is complete; leave the message unacked so the redelivery (step 2) re-issues the fan-out
    console.error(`${tag} routing failed; message left for redelivery`, e);
    return;
  }
  await ack(db, msgId);
}

// ---------- continuation ----------
interface ContinueArgs {
  tag: string;
  gen: GenerationRow;
  step: StepName;
  attempt: number;
  msgId: number;
  stepRowId: string;
  startedMs: number;
}

/**
 * The step checkpointed and asked for another invocation: mark the attempt 'continued' (its output holds the
 * partial), keep the generation running, enqueue the same step again, then ack. No usage is recorded yet; the
 * completing attempt bills the whole chain. If the enqueue fails the message is left unacked so the redelivery
 * resumes from the checkpoint.
 */
async function continueLater(db: Db, a: ContinueArgs, result: StepResult, savedPartial: boolean): Promise<void> {
  const reason = result.continueLater?.reason ?? "continuing";
  const totals = await sumLlmCalls(db, { generationId: a.gen.id, step: a.step, attempt: a.attempt }).catch(() => null);
  const patch: Database["public"]["Tables"]["generation_steps"]["Update"] = {
    status: "continued",
    error: null,
    model: result.model ?? totals?.model ?? null,
    input_tokens: totals?.input_tokens ?? 0,
    output_tokens: totals?.output_tokens ?? 0,
    cost_usd: totals?.cost_usd ?? 0,
    duration_ms: Date.now() - a.startedMs,
    finished_at: new Date().toISOString(),
  };
  // the step should have checkpointed through savePartial; if it did not, its output is the checkpoint
  if (!savedPartial && result.output !== undefined && result.output !== null) patch.output = { partial: result.output } as unknown as Json;
  const { error } = await db.from("generation_steps").update(patch).eq("id", a.stepRowId);
  if (error) throw new Error(`generation_steps 'continued' update failed: ${error.message}`);

  await db.from("generations").update({ status: "running", current_step: a.step, progress_message: reason.slice(0, 500) }).eq("id", a.gen.id);
  await enqueue(db, a.gen.id, a.step);
  console.log(`${a.tag} continued after ${Date.now() - a.startedMs}ms: ${reason}`);
  await ack(db, a.msgId);
}

/** The checkpoint to resume from: the newest attempt of this pass that stopped (continued, interrupted, failed) with output.partial. */
/**
 * The checkpoint to resume from: the newest continued, interrupted or failed attempt of this pass. A completed
 * attempt ends the search: a checkpoint older than a completion belongs to a finished run of the step, and a
 * requeue after it (Try another angle, Retry on a later step) must start the step afresh, not replay the old
 * candidates with the new exclusions ignored.
 */
function resumePartial(thisPass: StepRowLite[]): unknown | null {
  for (const r of [...thisPass].reverse()) {
    if (r.status === "completed") return null;
    if (r.status !== "continued" && r.status !== "interrupted" && r.status !== "failed") continue;
    const out = asRecord(r.output);
    if (out && "partial" in out && out.partial !== undefined) return out.partial ?? null;
  }
  return null;
}

// ---------- failure ----------
interface FailArgs {
  tag: string;
  gen: GenerationRow;
  step: StepName;
  attempt: number;
  msgId: number;
  readCt: number;
  failedBefore: number;
  stepRowId: string;
  startedMs: number;
}

async function failAttempt(db: Db, a: FailArgs, e: unknown): Promise<void> {
  const message = errorMessage(e).slice(0, 2000);
  console.error(`${a.tag} attempt ${a.attempt} failed: ${message}`);
  try {
    await db
      .from("generation_steps")
      .update({ status: "failed", error: message, finished_at: new Date().toISOString(), duration_ms: Date.now() - a.startedMs })
      .eq("id", a.stepRowId);
  } catch (err) {
    console.error(`${a.tag} could not mark attempt failed`, err);
  }

  const terminal = e instanceof RefusalError; // a refusal is not fixed by retrying
  const exhausted = terminal || a.readCt >= MAX_STEP_ATTEMPTS || a.failedBefore + 1 >= MAX_STEP_ATTEMPTS;
  try {
    if (exhausted) {
      const attemptsUsed = Math.max(a.readCt, a.failedBefore + 1);
      await failGeneration(db, a, `${label(a.step)} could not finish${terminal ? "" : ` after ${attemptsUsed} attempt${attemptsUsed === 1 ? "" : "s"}`}: ${plainReason(e)}. Use "Retry" to run it again; if it keeps failing, support can read the details.`);
    } else {
      // Retry now, not after the 450s visibility timeout: re-enqueue the step with a short delay and ack this
      // delivery. The attempt cap counts rows, so the cap holds across re-enqueues. If the enqueue fails the
      // message is left unacked and the visibility timeout redelivers it.
      await db
        .from("generations")
        .update({ progress_message: `${label(a.step)}: ${plainReason(e)}; starting it again.`.slice(0, 500) })
        .eq("id", a.gen.id);
      await enqueue(db, a.gen.id, a.step, RETRY_DELAY_SECONDS);
      await ack(db, a.msgId);
    }
  } catch (err) {
    console.error(`${a.tag} failure bookkeeping failed`, err);
  }
}

/** What the user is told went wrong: the cause in plain words, never an API error string. */
export function plainReason(e: unknown): string {
  if (e instanceof TruncatedError) return "its answer ran past the length budget";
  if (e instanceof RefusalError) return "the model declined to write this content";
  const msg = errorMessage(e).toLowerCase();
  if (msg.includes("timed out") || msg.includes("timeout")) return "it took too long";
  if (msg.includes("rate") && msg.includes("limit")) return "the writing service was busy";
  if (msg.includes("overloaded") || msg.includes("529")) return "the writing service was busy";
  if (msg.includes("run intake first") || msg.includes("needs the intake brief")) return "the offer has no brief yet";
  return "it hit a problem on our side";
}

/** Marks the generation failed with a message the user can act on and archives the queue message. */
async function failGeneration(db: Db, a: { tag: string; gen: GenerationRow; step: StepName; msgId: number }, message: string): Promise<void> {
  console.error(`${a.tag} generation failed: ${message}`);
  await db
    .from("generations")
    .update({ status: "failed", current_step: a.step, error: message.slice(0, 2000), progress_message: `${label(a.step)} failed` })
    .eq("id", a.gen.id);
  await archive(db, a.msgId);
}


// ---------- pipeline state from the database ----------
async function pipelineState(db: Db, gen: GenerationRow, history: StepRowLite[], step: StepName, result: StepResult | null): Promise<PipelineState> {
  const options = (gen.options ?? {}) as Record<string, unknown>;
  const [researchRes, variantRes] = await Promise.all([
    db.from("offer_research").select("id").eq("offer_id", gen.offer_id).eq("active", true).limit(1),
    db.from("offer_variants").select("id").eq("offer_id", gen.offer_id).eq("status", "approved").limit(1),
  ]);
  const hasActiveResearch = !!gen.research_id || (researchRes.data?.length ?? 0) > 0;
  const hasApprovedOffer = !!gen.variant_id || (variantRes.data?.length ?? 0) > 0;

  const completedRows = history.filter((r) => r.status === "completed");
  const latestDraft = completedRows.filter((r) => r.step === "draft").at(-1);
  // a review cycle starts at the last draft, revision, tell edit or cold read: the reviews of this cycle come after
  // all of them, so a retry from the tell edit or the cold read never counts the previous cycle's reviews
  const cycleStart = completedRows.filter((r) => r.step === "draft" || r.step === "revise" || r.step === "tell_edit" || r.step === "cold_read").reduce<string | null>((m, r) => later(m, r.finished_at ?? r.created_at), null);
  const thisCycle = completedRows.filter((r) => isAfter(r.finished_at ?? r.created_at, cycleStart));
  const completed = Array.from(new Set(thisCycle.map((r) => r.step))) as StepName[];
  // the revision budget counts from the last draft, or from the user's last requeue: a run the user starts again
  // (from the tell edit, the cold read or the revision) gets its own review loop instead of inheriting a spent one
  const loopStart = later(latestDraft?.finished_at ?? null, gen.requeued_at ?? null);
  const revisionCycles = completedRows.filter((r) => r.step === "revise" && isAfter(r.finished_at ?? r.created_at, loopStart)).length;

  const latest = (s: StepName) => thisCycle.filter((r) => r.step === s).at(-1)?.output ?? null;
  const editorialOut = asRecord(latest("editorial"));
  const mechanicalOut = asRecord(latest("mechanical"));
  const factualOut = asRecord(latest("factual"));

  let editorialVerdict: PipelineState["editorialVerdict"] = isVerdict(editorialOut?.verdict) ? editorialOut.verdict : null;
  let mechanicalHardFail = mechanicalOut?.hard_fail === true;
  let factualFatal = Array.isArray(factualOut?.flags) && factualOut.flags.some((f) => asRecord(f)?.fabrication === true || asRecord(f)?.severity === "fatal");

  // the step that just finished may carry the signal in its effects; those win over the stored output
  const fx = result?.effects;
  if (fx) {
    if (step === "editorial" && fx.editorialVerdict) editorialVerdict = fx.editorialVerdict;
    if (step === "mechanical" && typeof fx.mechanicalHardFail === "boolean") mechanicalHardFail = fx.mechanicalHardFail;
    if (step === "factual" && typeof fx.factualFatal === "boolean") factualFatal = fx.factualFatal;
  }

  return {
    hasActiveResearch,
    hasApprovedOffer,
    completed,
    editorialVerdict,
    mechanicalHardFail,
    factualFatal,
    revisionCycles,
    skipOffer: options.skip_offer === true,
    finalPass: inFinalPass(completedRows),
  };
}

// ---------- helpers ----------
/** The variant the offer step just proposed: from applyEffects, else the newest proposed row for the offer. */
async function resolveVariantId(db: Db, gen: GenerationRow, step: StepName, applied: AppliedEffects): Promise<string | null> {
  if (applied.variantId) return applied.variantId;
  if (step !== "offer") return null;
  const { data } = await db.from("offer_variants").select("id").eq("offer_id", gen.offer_id).eq("status", "proposed").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data?.id ?? null;
}

async function loadHistory(db: Db, generationId: string): Promise<StepRowLite[]> {
  const { data, error } = await db
    .from("generation_steps")
    .select("id, step, attempt, status, output, error, started_at, finished_at, created_at")
    .eq("generation_id", generationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`generation_steps load failed: ${error.message}`);
  return (data ?? []) as StepRowLite[];
}

function isAfter(ts: string | null, boundary: string | null): boolean {
  if (!boundary) return true;
  if (!ts) return false;
  return Date.parse(ts) > Date.parse(boundary);
}
function later(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(b) > Date.parse(a) ? b : a;
}
function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function isVerdict(v: unknown): v is "REJECT" | "REVISE" | "APPROVE" {
  return v === "REJECT" || v === "REVISE" || v === "APPROVE";
}

async function enqueue(db: Db, generationId: string, step: StepName, delaySeconds = 0): Promise<void> {
  const { error } = await db.rpc("enqueue_step", { p_generation_id: generationId, p_step: step, p_delay_seconds: delaySeconds });
  if (error) throw new Error(`enqueue_step(${step}) failed: ${error.message}`);
}
async function ack(db: Db, msgId: number): Promise<void> {
  const { error } = await db.rpc("queue_ack", { p_msg_id: msgId });
  if (error) console.error(`queue_ack(${msgId}) failed`, error.message);
}
async function archive(db: Db, msgId: number): Promise<void> {
  const { error } = await db.rpc("queue_archive", { p_msg_id: msgId });
  if (error) console.error(`queue_archive(${msgId}) failed`, error.message);
}
