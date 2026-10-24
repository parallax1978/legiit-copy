/**
 * Local engine harness. Runs the same STEPS functions as the run-step Edge Function, against a real Supabase project,
 * with a StepContext built from the database. See README.md next to this file.
 *
 *   deno task -c supabase/functions engine run --brief briefs/x.json --format sales_letter --out out/x
 *   deno task -c supabase/functions engine baseline --brief briefs/x.json --format sales_letter --out out/x
 *   deno task -c supabase/functions engine plan --format sales_letter
 *   deno task -c supabase/functions engine formats
 *   deno task -c supabase/functions engine eval        (TODO)
 */
import { parseArgs } from "@std/cli/parse-args";
import { join } from "@std/path";
import { z } from "zod";
import { serviceClient, type Db } from "../../supabase/functions/_shared/supabase.ts";
import type { Json } from "../../supabase/functions/_shared/database.types.ts";
import { STEPS } from "../../supabase/functions/_shared/engine/steps/index.ts";
import type { StepResult } from "../../supabase/functions/_shared/engine/steps/types.ts";
import { applyEffects, buildContext } from "../../supabase/functions/_shared/engine/context.ts";
import { initialSteps, nextSteps, type PipelineState } from "../../supabase/functions/_shared/engine/pipeline.ts";
import { MAX_STEP_ATTEMPTS, STEP_DEFAULTS, STEP_NAMES, type StepName } from "../../supabase/functions/_shared/engine/config.ts";
import { FormatId } from "../../supabase/functions/_shared/engine/schemas/common.ts";
import { ClaimRowInput, OfferBrief, OfferConfigInput } from "../../supabase/functions/_shared/engine/schemas/brief.ts";
import { Dossier } from "../../supabase/functions/_shared/engine/schemas/research.ts";
import { ChosenOffer } from "../../supabase/functions/_shared/engine/schemas/offer.ts";
import { getFormat, listFormats } from "../../supabase/functions/_shared/engine/formats/index.ts";
import { describePlan, planDraft } from "../../supabase/functions/_shared/engine/draft/plan.ts";
import { callModel } from "../../supabase/functions/_shared/engine/llm.ts";

// ---------------------------------------------------------------- brief file

const VoiceInput = z.object({
  name: z.string().default("CLI voice"),
  parameters: z.record(z.string(), z.unknown()).default({}),
  idiom_bank: z.array(z.string()).default([]),
  dead_words: z.array(z.string()).default([]),
  exemplar_paragraphs: z.array(z.string()).default([]),
  story_inventory: z.array(z.unknown()).default([]),
  greeting: z.string().nullable().default(null),
  readability_band: z.string().nullable().default(null),
});

/** A brief file is either a bare OfferBrief or this envelope. Everything but `brief` is optional. */
const BriefFile = z.object({
  brief: OfferBrief,
  claims: z.array(ClaimRowInput).default([]),
  config: OfferConfigInput.nullable().default(null),
  dossier: Dossier.nullable().default(null),
  /** a pre-approved offer construction; when present the offer step is skipped */
  offer: z.object({ chosen: ChosenOffer, options_sheet: z.array(z.unknown()).default([]), reasons: z.string().default(""), gap_note: z.string().default("") }).nullable().default(null),
  voice: VoiceInput.nullable().default(null),
  options: z.record(z.string(), z.unknown()).default({}),
});
type BriefFile = z.infer<typeof BriefFile>;

async function readBriefFile(path: string): Promise<BriefFile> {
  const raw = JSON.parse(await Deno.readTextFile(path));
  const envelope = raw && typeof raw === "object" && "brief" in raw ? raw : { brief: raw };
  const parsed = BriefFile.safeParse(envelope);
  if (!parsed.success) {
    throw new Error(`brief file invalid:\n${parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
  }
  return parsed.data;
}

// ---------------------------------------------------------------- helpers

function requireEnv(keys: string[]) {
  const missing = keys.filter((k) => !Deno.env.get(k));
  if (missing.length) throw new Error(`missing env: ${missing.join(", ")}`);
}

function parseFormat(id: string | undefined): FormatId {
  if (!id) throw new Error("--format is required");
  const r = FormatId.safeParse(id);
  if (!r.success) throw new Error(`unknown format "${id}". Known: ${listFormats().map((f) => f.id).join(", ")}`);
  getFormat(r.data); // throws when the spec is missing
  return r.data;
}

async function writeOut(dir: string, name: string, content: string) {
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(join(dir, name), content);
}

const pretty = (v: unknown) => JSON.stringify(v, null, 2);
const log = (...a: unknown[]) => console.error(...a);

function must<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error || r.data === null) throw new Error(`${what}: ${r.error?.message ?? "no row"}`);
  return r.data;
}

// ---------------------------------------------------------------- setup rows

async function resolveWorkspace(db: Db, wanted: string | undefined): Promise<string> {
  const id = wanted ?? Deno.env.get("ENGINE_WORKSPACE_ID");
  if (id) {
    must(await db.from("workspaces").select("id").eq("id", id).maybeSingle(), `workspace ${id}`);
    return id;
  }
  const first = await db.from("workspaces").select("id,name").order("created_at", { ascending: true }).limit(1);
  if (first.error) throw new Error(`workspaces: ${first.error.message}`);
  if (first.data?.[0]) {
    log(`using workspace ${first.data[0].id} (${first.data[0].name}); pass --workspace to choose another`);
    return first.data[0].id;
  }
  const slug = `engine-cli-${Date.now().toString(36)}`;
  const created = must(await db.from("workspaces").insert({ name: "engine-cli", slug }).select("id").single(), "create workspace");
  log(`created workspace ${created.id} (${slug})`);
  return created.id;
}

async function createOffer(db: Db, ws: string, file: BriefFile): Promise<{ offerId: string; hasActiveResearch: boolean; hasApprovedOffer: boolean; variantId: string | null; voiceId: string | null }> {
  const b = file.brief;
  const offer = must(
    await db.from("offers").insert({ workspace_id: ws, name: b.product_name, status: "ready", brief: b as unknown as Json, audience: b.audience.who, price: b.price.text, guarantee: b.guarantee.text, positioning: b.positioning }).select("id").single(),
    "create offer",
  );
  if (file.claims.length) {
    const rows = file.claims.map((c) => ({
      offer_id: offer.id,
      workspace_id: ws,
      claim_text: c.claim_text,
      claim_type: c.claim_type,
      role: c.role,
      evidence_grade: c.evidence_grade,
      evidence: c.evidence as Json,
      precision: c.precision,
      typical_result: c.typical_result,
      earnings_context: c.earnings_context as Json,
      material_connection: c.material_connection,
      guarantee_terms: c.guarantee_terms as Json,
      former_price: c.former_price as Json,
      scarcity: c.scarcity as Json,
      deadline: c.deadline as Json,
      trial_terms: c.trial_terms as Json,
      story_claim: c.story_claim,
      establishment_signal: c.establishment_signal,
      status: c.status,
      flag: c.flag as Json,
      created_by: "user",
    }));
    const ins = await db.from("offer_claims").insert(rows);
    if (ins.error) throw new Error(`offer_claims: ${ins.error.message}`);
  }
  if (file.config) {
    const c = file.config;
    const ins = await db.from("offer_config").insert({ offer_id: offer.id, workspace_id: ws, vertical: c.vertical, business_opportunity: c.business_opportunity, notice_recipient: c.notice_recipient, humor_policy: c.humor_policy as Json, greeting: c.greeting, edge_tolerance: c.edge_tolerance, refund_window_days: c.refund_window_days, first_week_experience: c.first_week_experience });
    if (ins.error) throw new Error(`offer_config: ${ins.error.message}`);
  }
  let hasActiveResearch = false;
  if (file.dossier) {
    const ins = await db.from("offer_research").insert({ offer_id: offer.id, workspace_id: ws, version: 1, dossier: file.dossier as unknown as Json, sources: file.dossier.sources as unknown as Json, active: true, model: "cli-supplied" });
    if (ins.error) throw new Error(`offer_research: ${ins.error.message}`);
    hasActiveResearch = true;
  }
  let variantId: string | null = null;
  if (file.offer) {
    const o = file.offer;
    const v = must(
      await db.from("offer_variants").insert({ offer_id: offer.id, workspace_id: ws, options_sheet: o.options_sheet as Json, chosen: o.chosen as unknown as Json, reasons: o.reasons, guarantee: o.chosen.guarantee as unknown as Json, deadline: o.chosen.deadline as unknown as Json, gap_note: o.gap_note, status: "approved", approved_at: new Date().toISOString() }).select("id").single(),
      "offer_variants",
    );
    variantId = v.id;
  }
  let voiceId: string | null = null;
  if (file.voice) {
    const v = file.voice;
    const row = must(
      await db.from("voice_profiles").insert({ workspace_id: ws, offer_id: offer.id, name: v.name, parameters: v.parameters as Json, idiom_bank: v.idiom_bank as Json, dead_words: v.dead_words as Json, exemplar_paragraphs: v.exemplar_paragraphs as Json, story_inventory: v.story_inventory as Json, greeting: v.greeting, readability_band: v.readability_band }).select("id").single(),
      "voice_profiles",
    );
    voiceId = row.id;
  }
  return { offerId: offer.id, hasActiveResearch, hasApprovedOffer: !!variantId, variantId, voiceId };
}

// ---------------------------------------------------------------- the runner (mirrors run-step)

interface RunOpts {
  out: string;
  autoApprove: boolean;
}

async function runStepOnce(db: Db, generationId: string, step: StepName, opts: RunOpts, index: number): Promise<{ result: StepResult; applied: Awaited<ReturnType<typeof applyEffects>> }> {
  const existing = await db.from("generation_steps").select("attempt").eq("generation_id", generationId).eq("step", step).order("attempt", { ascending: false }).limit(1);
  const attempt = (existing.data?.[0]?.attempt ?? 0) + 1;
  if (attempt > MAX_STEP_ATTEMPTS) throw new Error(`${step}: ${MAX_STEP_ATTEMPTS} attempts used`);

  const progress = async (m: string) => {
    log(`  [${step}] ${m}`);
    await db.from("generations").update({ progress_message: m, current_step: step }).eq("id", generationId);
  };
  const ctx = await buildContext(db, generationId, attempt, progress);
  const row = must(
    await db.from("generation_steps").insert({ generation_id: generationId, workspace_id: ctx.generation.workspace_id, step, attempt, status: "running", started_at: new Date().toISOString() }).select("id").single(),
    "generation_steps insert",
  );
  const started = Date.now();
  let result: StepResult;
  try {
    result = await STEPS[step](ctx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.from("generation_steps").update({ status: "failed", error: msg, finished_at: new Date().toISOString(), duration_ms: Date.now() - started }).eq("id", row.id);
    throw e;
  }
  const applied = await applyEffects(db, ctx, step, result);
  await db.from("generation_steps").update({ status: "completed", output: result.output as Json, model: result.model ?? null, finished_at: new Date().toISOString(), duration_ms: Date.now() - started }).eq("id", row.id);
  await db.from("generations").update({ current_step: step, progress_message: result.summary }).eq("id", generationId);

  const prefix = String(index).padStart(2, "0");
  await writeOut(opts.out, `${prefix}-${step}.json`, pretty({ step, attempt, model: result.model ?? null, summary: result.summary, pause: result.pause ?? null, applied, output: result.output }));
  if (result.effects?.newDraft && applied.draftVersion) {
    await writeOut(opts.out, `draft-v${applied.draftVersion}.md`, result.effects.newDraft.markdown);
    await writeOut(opts.out, `draft-v${applied.draftVersion}.json`, pretty(result.effects.newDraft.blocks));
  }
  log(`  [${step}] done: ${result.summary}`);
  return { result, applied };
}

async function runPipeline(db: Db, generationId: string, first: StepName[], state: PipelineState, opts: RunOpts) {
  const queue: StepName[] = [...first];
  let index = 1;
  let cycleCompleted: StepName[] = [];
  while (queue.length) {
    const step = queue.shift()!;
    log(`\n== ${step} (${index}) ==`);
    const { result, applied } = await runStepOnce(db, generationId, step, opts, index++);
    state.completed.push(step);
    cycleCompleted.push(step);
    const fx = result.effects;
    if (fx?.editorialVerdict) state.editorialVerdict = fx.editorialVerdict;
    if (fx?.mechanicalHardFail !== undefined) state.mechanicalHardFail = fx.mechanicalHardFail;
    if (fx?.factualFatal !== undefined) state.factualFatal = fx.factualFatal;
    if (step === "revise") {
      state.revisionCycles += 1;
      cycleCompleted = [];
      state.editorialVerdict = null;
      state.mechanicalHardFail = false;
      state.factualFatal = false;
    }
    if (step === "research") state.hasActiveResearch = true;

    if (result.pause) {
      if (step === "offer" && opts.autoApprove && applied.variantId) {
        log(`  [offer] --auto-approve: approving variant ${applied.variantId}`);
        await db.from("offer_variants").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", applied.variantId);
        await db.from("generations").update({ variant_id: applied.variantId }).eq("id", generationId);
        state.hasApprovedOffer = true;
        queue.push("argument");
        continue;
      }
      await db.from("generations").update({ status: "needs_input", progress_message: result.pause.reason }).eq("id", generationId);
      log(`\nPAUSED (needs input): ${result.pause.reason}`);
      log(step === "offer" ? `Approve the proposed offer variant in the app (or re-run with --auto-approve), then: engine run --generation ${generationId} --from argument` : `Resolve it, then: engine run --generation ${generationId} --from ${step}`);
      return "paused" as const;
    }
    const next = nextSteps(step, { ...state, completed: cycleCompleted.length ? [...state.completed.filter((s) => !["editorial", "mechanical", "factual"].includes(s)), ...cycleCompleted] : state.completed });
    for (const n of next) if (!queue.includes(n)) queue.push(n);
  }
  await db.from("generations").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", generationId);
  return "completed" as const;
}

async function printCost(db: Db, generationId: string) {
  const calls = await db.from("llm_calls").select("step,model,input_tokens,output_tokens,cache_read_tokens,cost_usd,latency_ms").eq("generation_id", generationId);
  if (calls.error || !calls.data) return;
  const byStep = new Map<string, { calls: number; cost: number; inTok: number; outTok: number; ms: number }>();
  for (const c of calls.data) {
    const k = c.step ?? "?";
    const cur = byStep.get(k) ?? { calls: 0, cost: 0, inTok: 0, outTok: 0, ms: 0 };
    cur.calls++;
    cur.cost += Number(c.cost_usd);
    cur.inTok += c.input_tokens;
    cur.outTok += c.output_tokens;
    cur.ms += c.latency_ms ?? 0;
    byStep.set(k, cur);
  }
  log("\nCost by step:");
  let total = 0;
  for (const [step, v] of byStep) {
    total += v.cost;
    log(`  ${step.padEnd(10)} ${String(v.calls).padStart(2)} call(s)  $${v.cost.toFixed(4)}  in ${v.inTok}  out ${v.outTok}  ${(v.ms / 1000).toFixed(0)}s`);
  }
  log(`  total      $${total.toFixed(4)}`);
  await db.from("generations").update({ cost_usd: total }).eq("id", generationId);
}

// ---------------------------------------------------------------- commands

async function cmdRun(args: ReturnType<typeof parseArgs>) {
  requireEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"]);
  const db = serviceClient();
  const opts: RunOpts = { out: String(args.out ?? `engine-out/${new Date().toISOString().replace(/[:.]/g, "-")}`), autoApprove: !!args["auto-approve"] };

  let generationId: string;
  let first: StepName[];
  const state: PipelineState = { hasActiveResearch: false, hasApprovedOffer: false, completed: [], revisionCycles: 0, editorialVerdict: null, mechanicalHardFail: false, factualFatal: false };

  if (args.generation) {
    // resume an existing generation from a step
    generationId = String(args.generation);
    const g = must(await db.from("generations").select("*").eq("id", generationId).single(), "generation");
    const from = String(args.from ?? g.current_step ?? "research");
    if (!(STEP_NAMES as readonly string[]).includes(from)) throw new Error(`--from must be one of ${STEP_NAMES.join(", ")}`);
    const research = await db.from("offer_research").select("id").eq("offer_id", g.offer_id).eq("active", true).maybeSingle();
    const variant = await db.from("offer_variants").select("id").eq("offer_id", g.offer_id).eq("status", "approved").limit(1);
    state.hasActiveResearch = !!research.data;
    state.hasApprovedOffer = !!g.variant_id || !!variant.data?.length;
    const done = await db.from("generation_steps").select("step").eq("generation_id", generationId).eq("status", "completed");
    state.completed = (done.data ?? []).map((r) => r.step as StepName);
    state.revisionCycles = state.completed.filter((s) => s === "revise").length;
    first = [from as StepName];
    await db.from("generations").update({ status: "running", error: null, completed_at: null }).eq("id", generationId);
    log(`resuming generation ${generationId} from ${from}`);
  } else {
    const format = parseFormat(args.format ? String(args.format) : undefined);
    if (!args.brief) throw new Error("--brief <file.json> is required");
    const file = await readBriefFile(String(args.brief));
    const ws = await resolveWorkspace(db, args.workspace ? String(args.workspace) : undefined);
    const setup = await createOffer(db, ws, file);
    const skipOffer = !!args["skip-offer"] || file.options.skip_offer === true;
    state.hasActiveResearch = setup.hasActiveResearch;
    state.hasApprovedOffer = setup.hasApprovedOffer;
    state.skipOffer = skipOffer;
    const stepOrder = initialSteps(state);
    const gen = must(
      await db
        .from("generations")
        .insert({ workspace_id: ws, offer_id: setup.offerId, format, status: "running", options: { ...file.options, ...(skipOffer ? { skip_offer: true } : {}) } as Json, step_order: stepOrder as unknown as Json, variant_id: setup.variantId, voice_profile_id: setup.voiceId, model_set: Object.fromEntries(Object.entries(STEP_DEFAULTS).map(([k, v]) => [k, v.model])) as Json })
        .select("id")
        .single(),
      "create generation",
    );
    generationId = gen.id;
    first = [stepOrder[0]];
    log(`offer ${setup.offerId}, generation ${generationId}, format ${format}, steps: ${stepOrder.join(" → ")}`);
    log(`draft plan: ${describePlan(planDraft(getFormat(format), { itemCount: typeof file.options.item_count === "number" ? file.options.item_count : undefined })).join(" | ")}`);
    await writeOut(opts.out, "00-setup.json", pretty({ offerId: setup.offerId, generationId, format, stepOrder, workspace: ws }));
  }

  let status: "completed" | "paused" | "failed" = "failed";
  try {
    status = await runPipeline(db, generationId, first, state, opts);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.from("generations").update({ status: "failed", error: msg }).eq("id", generationId);
    log(`\nFAILED: ${msg}`);
    log(`retry with: engine run --generation ${generationId} --from <step>`);
  }
  await printCost(db, generationId);
  const final = await db.from("drafts").select("version,markdown,word_count").eq("generation_id", generationId).order("version", { ascending: false }).limit(1);
  if (final.data?.[0]) {
    await writeOut(opts.out, "final.md", final.data[0].markdown);
    log(`\nfinal draft v${final.data[0].version} (${final.data[0].word_count} words) → ${join(opts.out, "final.md")}`);
  }
  log(`status: ${status}; outputs in ${opts.out}`);
  if (status === "failed") Deno.exit(1);
}

async function cmdBaseline(args: ReturnType<typeof parseArgs>) {
  requireEnv(["ANTHROPIC_API_KEY"]);
  const format = parseFormat(args.format ? String(args.format) : undefined);
  if (!args.brief) throw new Error("--brief <file.json> is required");
  const file = await readBriefFile(String(args.brief));
  const spec = getFormat(format);
  const out = String(args.out ?? `engine-out/baseline-${Date.now().toString(36)}`);
  const model = String(args.model ?? STEP_DEFAULTS.draft.model);
  log(`baseline: one plain prompt on ${model} for a ${spec.name}`);
  const res = await callModel({
    model,
    effort: "high",
    maxTokens: 12000,
    system: "You are an expert direct response copywriter.",
    user: `Write a ${spec.name.toLowerCase()} for this offer.\n\n${pretty(file.brief)}${file.claims.length ? `\n\nFacts you may use:\n${file.claims.map((c) => `- ${c.claim_text}`).join("\n")}` : ""}`,
    log: { purpose: "baseline" },
  });
  await writeOut(out, "baseline.md", res.text);
  await writeOut(out, "baseline.json", pretty({ model: res.model, usage: res.usage, costUsd: res.costUsd, latencyMs: res.latencyMs, stopReason: res.stopReason, format }));
  log(`wrote ${join(out, "baseline.md")} ($${res.costUsd.toFixed(4)}, ${res.usage.output_tokens} output tokens)`);
}

function cmdPlan(args: ReturnType<typeof parseArgs>) {
  const format = parseFormat(args.format ? String(args.format) : undefined);
  const spec = getFormat(format);
  const plan = planDraft(spec, { itemCount: args.items ? Number(args.items) : undefined });
  console.log(`${spec.name} (${spec.id}): ${plan.calls.length} draft call(s)${plan.multiItem ? `, ${plan.itemCount} items` : ""}`);
  for (const line of describePlan(plan)) console.log("  " + line);
  console.log(`lead section: ${plan.leadSectionId ?? "none"}; headline section: ${plan.headlineSectionId ?? "none"}; lead variants: ${spec.lead_variants}`);
}

function cmdFormats() {
  for (const f of listFormats()) console.log(`${f.id.padEnd(22)} ${f.name} [${f.family}] ${f.length_band_words[0]}-${f.length_band_words[1]} words, ${f.sections.length} sections, ${f.lead_variants} lead variants`);
}

function cmdEval() {
  log("engine eval: not implemented yet.");
  log("Plan (docs/02-plan.md 1.12): run a prompt-version set across eval_briefs into eval_runs/eval_outputs, optionally with the baseline, then judge pairs blind.");
  log("Until then: `engine run` and `engine baseline` on the same brief write comparable markdown for a manual blind read.");
  Deno.exit(2);
}

function usage() {
  console.log(`engine <command> [options]

  run       --brief <file.json> --format <id> [--out dir] [--workspace id] [--auto-approve] [--skip-offer]
            --generation <id> [--from <step>]            resume an existing generation
  baseline  --brief <file.json> --format <id> [--out dir] [--model id]
  plan      --format <id> [--items n]
  formats
  eval      (TODO)

Env for run: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY [ENGINE_WORKSPACE_ID, ENGINE_DEFAULT_MODEL, ENGINE_COLD_READ_MODEL]`);
}

if (import.meta.main) {
  const args = parseArgs(Deno.args, {
    string: ["brief", "format", "out", "workspace", "generation", "from", "model", "items"],
    boolean: ["auto-approve", "skip-offer", "help"],
  });
  const cmd = String(args._[0] ?? "");
  try {
    if (args.help || !cmd) usage();
    else if (cmd === "run") await cmdRun(args);
    else if (cmd === "baseline") await cmdBaseline(args);
    else if (cmd === "plan") cmdPlan(args);
    else if (cmd === "formats") cmdFormats();
    else if (cmd === "eval") cmdEval();
    else {
      usage();
      Deno.exit(1);
    }
  } catch (e) {
    log(`error: ${e instanceof Error ? e.message : String(e)}`);
    Deno.exit(1);
  }
}
