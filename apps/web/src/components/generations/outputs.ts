import type { StepName } from "@engine/config.ts";
import type { ArgumentOutput, ColdRead, EditorialVerdict, FactualOutput, MechanicalReport, ShipOutput, RevisionOutput, DraftOutput, OfferConstruction, Dossier, TellEditOutput } from "@engine/schemas/mod.ts";
import type { StepRow, GenerationRow, GenerationStatus } from "@/lib/data/generations";

export type { StepName };

export const STEP_LABELS: Record<StepName, string> = {
  intake: "Intake",
  research: "Research",
  offer: "Offer construction",
  argument: "Argument selection",
  draft: "Draft",
  tell_edit: "AI tell cleanup",
  cold_read: "Cold read",
  editorial: "Editorial review",
  mechanical: "Mechanical passes",
  factual: "Factual and compliance review",
  revise: "Revise",
  ship: "Ship and log",
};

export const STEP_BLURBS: Record<StepName, string> = {
  intake: "Reading the offer into a brief and a claims ledger.",
  research: "Collecting the market's own words, competitors and proof. Runs once per offer.",
  offer: "Designing what is sold before deciding how to say it. Needs your approval.",
  argument: "Twenty candidate arguments, gated and scored; one thesis wins.",
  draft: "Offer block first, bullets and proof, body, leads, headline last.",
  tell_edit: "Your editing rules: strips the patterns that make copy read as AI (em dashes, windups, buzzwords and the rest) and keeps every fact.",
  cold_read: "A different model reads the skim path cold and reports what it believes it was sold.",
  editorial: "The copy chief runs the gates in order and predicts beat, lose or unsure.",
  mechanical: "Tell detector, readability, cadence and format gates. Code, not a model.",
  factual: "Every number, name, quote, price and deadline checked against the ledger; anything the engine invented is cut. Compliance notes come to you as line, rule and rewritten line, and you decide.",
  revise: "Changes only the referenced lines and honours the do-not-touch list.",
  ship: "The verdict and a short list of what to check before you use it.",
};

export const REVIEW_LOOP: StepName[] = ["tell_edit", "cold_read", "editorial", "mechanical", "factual", "revise"];

export function stepOrder(generation: GenerationRow, steps: Pick<StepRow, "step">[] = []): StepName[] {
  const raw = Array.isArray(generation.step_order) ? (generation.step_order as unknown[]) : [];
  const order = raw.filter((s): s is StepName => typeof s === "string" && s in STEP_LABELS);
  const base = order.length ? order : (["argument", "draft", "tell_edit", "cold_read", "editorial", "mechanical", "factual", "revise", "ship"] as StepName[]);
  // generations started before the tell edit existed show it once it has run for them (a retry from the draft)
  if (!base.includes("tell_edit") && base.includes("draft") && steps.some((s) => s.step === "tell_edit")) base.splice(base.indexOf("draft") + 1, 0, "tell_edit");
  return base;
}

/** When a step row finished (when it was created, if it never did): the order the latest run is picked by. */
const finishedAt = (s: StepRow) => s.finished_at ?? s.created_at;

/** Latest completed row for a step that stored an output. */
function latestRow(steps: StepRow[], step: StepName): StepRow | null {
  const rows = steps.filter((s) => s.step === step && s.status === "completed" && s.output != null);
  if (!rows.length) return null;
  rows.sort((a, b) => finishedAt(a).localeCompare(finishedAt(b)));
  return rows[rows.length - 1];
}

/** Latest completed output for a step, as a loosely typed value. */
export function latestOutput<T>(steps: StepRow[], step: StepName): T | null {
  const row = latestRow(steps, step);
  return row ? (row.output as unknown as T) : null;
}

export const getArgument = (steps: StepRow[]) => latestOutput<ArgumentOutput>(steps, "argument");
export const getEditorial = (steps: StepRow[]) => latestOutput<EditorialVerdict>(steps, "editorial");
export const getColdRead = (steps: StepRow[]) => latestOutput<ColdRead>(steps, "cold_read");
export const getMechanical = (steps: StepRow[]) => latestOutput<MechanicalReport>(steps, "mechanical");
export const getFactual = (steps: StepRow[]) => latestOutput<FactualOutput>(steps, "factual");
export const getShip = (steps: StepRow[]) => latestOutput<ShipOutput>(steps, "ship");
export const getOffer = (steps: StepRow[]) => latestOutput<OfferConstruction>(steps, "offer");
export const getTellEdit = (steps: StepRow[]) => latestOutput<TellEditOutput>(steps, "tell_edit");

/**
 * The completed tell edits of the current piece, oldest first: one runs after the draft and after each revision.
 * A Retry or Try another angle drafts again and keeps the old rows, so only the runs after the latest draft count.
 */
export function getTellEdits(steps: StepRow[]): TellEditOutput[] {
  const draft = latestRow(steps, "draft");
  return steps
    .filter((s) => s.step === "tell_edit" && s.status === "completed" && s.output != null && typeof s.output === "object" && "what_changed" in (s.output as object))
    .filter((s) => !draft || finishedAt(s).localeCompare(finishedAt(draft)) > 0)
    .sort((a, b) => finishedAt(a).localeCompare(finishedAt(b)))
    .map((s) => s.output as unknown as TellEditOutput);
}

/**
 * The Review panel's line when no tell edit of the piece changed a line. It says no tells were found only when the
 * checker counted none in every run; the count it gives is the latest run's that found any.
 */
export function tellEditNote(runs: Pick<TellEditOutput, "owner_tells_before" | "new_version">[]): string {
  const found = runs.reduce((n, r) => (r.owner_tells_before > 0 ? r.owner_tells_before : n), 0);
  const tells = found ? `${found} AI tell${found === 1 ? "" : "s"} found, but none could be removed safely.` : "No AI tells found.";
  // a new version with no line edits means the rebuild only tidied the layout
  return `${tells} ${runs.some((r) => r.new_version) ? "Only the layout was tidied." : "The copy was left as written."}`;
}

export type TimelineStatus = "completed" | "running" | "pending" | "failed" | "queued" | "skipped" | "interrupted" | "paused";
const TIMELINE_STATUSES: readonly TimelineStatus[] = ["completed", "running", "pending", "failed", "queued", "skipped", "interrupted", "paused"];

/**
 * generation_steps.status → timeline status. 'continued' is a resumable step (the draft) checkpointing between
 * invocations: the step is still running, never failed. Anything unknown renders as pending rather than crashing.
 */
export function timelineStatus(raw: string): TimelineStatus {
  if (raw === "continued") return "running";
  return (TIMELINE_STATUSES as readonly string[]).includes(raw) ? (raw as TimelineStatus) : "pending";
}

export interface TimelineEntry {
  step: StepName;
  label: string;
  status: TimelineStatus;
  attempts: number;
  cycles: number;
  latest: StepRow | null;
  summary: string | null;
  error: string | null;
  cost: number;
  durationMs: number | null;
}

export function buildTimeline(generation: GenerationRow, steps: StepRow[]): TimelineEntry[] {
  const order = stepOrder(generation, steps);
  const gStatus = generation.status as GenerationStatus;
  const currentIdx = generation.current_step ? order.indexOf(generation.current_step as StepName) : -1;
  return order.map((step, idx) => {
    const rows = steps.filter((s) => s.step === step).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const latest = rows[rows.length - 1] ?? null;
    const completedRows = rows.filter((r) => r.status === "completed");
    let status: TimelineStatus = "pending";
    if (latest) {
      status = timelineStatus(latest.status);
      if (status === "completed" && generation.current_step === step && (gStatus === "running" || gStatus === "queued") && REVIEW_LOOP.includes(step)) status = "running";
    } else if (generation.current_step === step) {
      status = gStatus === "running" ? "running" : gStatus === "queued" ? "queued" : gStatus === "failed" ? "failed" : gStatus === "needs_input" ? "paused" : "pending";
    } else if (currentIdx >= 0 && idx < currentIdx) {
      status = "completed";
    }
    // a step that completed with a pause (offer approval, no surviving argument, drafting blocked) is waiting on the user
    if (gStatus === "needs_input" && generation.current_step === step && status === "completed") status = "paused";
    if (gStatus === "failed" && generation.current_step === step && status !== "completed") status = "failed";
    if (gStatus === "cancelled" && status === "running") status = "interrupted";
    if (gStatus === "completed" && status === "running") status = "completed";
    const cycles = REVIEW_LOOP.includes(step) ? completedRows.length : 0;
    const cost = rows.reduce((n, r) => n + Number(r.cost_usd ?? 0), 0);
    return {
      step,
      label: STEP_LABELS[step],
      status,
      attempts: rows.filter((r) => r.status !== "continued").length,
      cycles,
      latest,
      summary: completedRows.length ? summarize(step, completedRows[completedRows.length - 1].output) : null,
      error: latest?.status === "failed" || latest?.status === "interrupted" ? plainStepError(latest.error) : null,
      cost,
      durationMs: latest?.duration_ms ?? null,
    };
  });
}

type Loose = Record<string, unknown>;
const obj = (v: unknown): Loose | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** A one-line reading of a step's stored output for the timeline. */
export function summarize(step: StepName, output: unknown): string | null {
  const o = obj(output);
  if (!o) return typeof output === "string" ? output.slice(0, 160) : null;
  if (str(o.summary)) return str(o.summary);
  // a step that paused the pipeline stores { paused: true, reason } instead of its usual output
  if (o.paused === true && str(o.reason)) return `Paused: ${str(o.reason)}`;
  switch (step) {
    case "research": {
      const d = (obj(o.dossier) ?? o) as Partial<Dossier> & Loose;
      const v = arr(d.verbatims).length;
      const s = arr(d.sources).length;
      const c = arr(d.competitor_table).length;
      if (v || s || c) return `${v} verbatims, ${c} competitors, ${s} sources`;
      break;
    }
    case "offer": {
      const chosen = obj(o.chosen) as Partial<OfferConstruction["chosen"]> | null;
      if (chosen?.variant) return `Proposed: ${String(chosen.variant).replace(/_/g, " ")} offer, awaiting your approval`;
      break;
    }
    case "argument": {
      const a = o as Partial<ArgumentOutput>;
      if (a.thesis) return a.thesis;
      if (arr(a.candidates).length) return `${arr(a.candidates).length} candidates scored`;
      break;
    }
    case "draft": {
      const d = o as Partial<DraftOutput>;
      const words = num(d.word_count);
      const leads = arr(d.leads).length;
      const ns = arr(d.needs_source).length;
      const parts = [words != null ? `${words.toLocaleString()} words` : null, leads ? `${leads} leads` : null, ns ? `${ns} need a source` : null].filter(Boolean);
      if (parts.length) return parts.join(", ");
      break;
    }
    case "tell_edit": {
      const t = o as Partial<TellEditOutput>;
      // "no tells" only when the checker counted none; otherwise how many it found that could not be removed
      const found = num(t.owner_tells_before) ?? 0;
      const tells = found ? `${found} AI tell${found === 1 ? "" : "s"} found; none could be removed safely` : "No AI tells found";
      if (t.new_version === false) return `${tells}; the copy is unchanged`;
      const n = arr(t.edits).length;
      if (n) return `${n} change${n === 1 ? "" : "s"}${num(t.owner_tells_before) != null ? `; AI tells ${t.owner_tells_before} to ${t.owner_tells_after}` : ""}`;
      // a new version with no line edits: the rebuild only tidied the layout
      if (t.new_version === true) return `${tells}; the layout was tidied`;
      break;
    }
    case "cold_read": {
      const c = o as Partial<ColdRead>;
      if (c.promise_one_sentence) return `Read as: ${c.promise_one_sentence}`;
      break;
    }
    case "editorial": {
      const e = o as Partial<EditorialVerdict>;
      if (e.verdict) return e.verdict === "APPROVE" ? "Ready to use" : e.verdict === "REVISE" ? "Needs work" : "Not ready";
      break;
    }
    case "mechanical": {
      const m = o as Partial<MechanicalReport>;
      if (num(m.tell_score_per_300) != null) return `Tell score ${m.tell_score_per_300} per 300 words${m.hard_fail ? ", hard fail" : ""}${arr(m.format_gate_failures).length ? `, ${arr(m.format_gate_failures).length} format gate failures` : ""}`;
      break;
    }
    case "factual": {
      const f = o as Partial<FactualOutput>;
      const flags = arr(f.flags) as { fabrication?: boolean; severity?: string }[];
      const fab = flags.filter((x) => x.fabrication).length;
      return `${flags.length} flag${flags.length === 1 ? "" : "s"}${fab ? `, ${fab} fabrication${fab === 1 ? "" : "s"}` : ""}${f.consistency_check && !f.consistency_check.ok ? ", offer mismatch" : ""}`;
    }
    case "revise": {
      const r = o as Partial<RevisionOutput>;
      const n = arr(r.changes).length;
      return `${n} line${n === 1 ? "" : "s"} changed`;
    }
    case "ship": {
      const s = o as Partial<ShipOutput>;
      if (s.prediction) return s.test_variable ? "Done, with an alternative opening to test" : "Done";
      break;
    }
  }
  const json = JSON.stringify(output);
  return json.length <= 240 ? json : null;
}

/** Step errors are written for engineers; the timeline shows the cause in plain words. */
export function plainStepError(error: string | null | undefined): string | null {
  if (!error) return null;
  const e = error.toLowerCase();
  if (e.includes("max_tokens")) return "The answer ran past its length budget; it is being run again.";
  if (e.includes("timed out") || e.includes("timeout") || e.includes("worker shut down") || e.includes("never finished")) return "This step took too long; it is being run again.";
  if (e.includes("refus")) return "The model declined to write this content.";
  if (e.includes("rate limit") || e.includes("overloaded") || e.includes("529")) return "The writing service was busy; it is being run again.";
  if (e.includes("could not finish") || e.includes("stopped before")) return error;
  return "This step hit a problem; it is being run again.";
}

export function formatCost(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (!v) return "$0.00";
  return v < 0.01 ? "<$0.01" : `$${v.toFixed(2)}`;
}

export function formatDuration(ms: number | null | undefined): string | null {
  if (!ms) return null;
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}
