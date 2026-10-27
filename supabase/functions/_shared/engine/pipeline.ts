/**
 * The step graph. Deterministic: given what a generation already has, which steps run next.
 * run-step executes exactly one step per invocation and asks `nextSteps` what to enqueue.
 */
import { MAX_REVISION_CYCLES, type StepName } from "./config.ts";

export interface PipelineState {
  hasActiveResearch: boolean;
  hasApprovedOffer: boolean;
  completed: StepName[];           // steps completed so far, in order
  editorialVerdict?: "REJECT" | "REVISE" | "APPROVE" | null;
  mechanicalHardFail?: boolean;
  factualFatal?: boolean;          // fabrication found
  revisionCycles: number;
  skipOffer?: boolean;             // user chose to keep the offer as-is
  finalPass?: boolean;             // the newest tell edit came after the newest cold read: the checks of the final pass
}

/**
 * The final pass, read from the shape of the history: a completed tell edit that no cold read followed, after a cold
 * read had run. Only the final revision's tell edit goes straight to the checks, so a Retry or Resume inside the
 * final pass (which restarts the revision count) still ships once the checks are done.
 */
export function inFinalPass(rows: { step: string; status?: string; finished_at: string | null; created_at: string }[]): boolean {
  const lastAt = (name: string) => rows.filter((r) => r.step === name && (r.status === undefined || r.status === "completed")).reduce((m, r) => Math.max(m, Date.parse(r.finished_at ?? r.created_at)), -Infinity);
  const tell = lastAt("tell_edit");
  const cold = lastAt("cold_read");
  return Number.isFinite(cold) && tell > cold;
}

/**
 * Which steps enqueue a given step (run-step's idempotency gate): a completed row of the step newer than every
 * predecessor's completion means "done this pass". The final revision's tell edit enqueues the checks itself (no cold
 * read in the final pass); in a normal cycle the cold read finishes after the tell edit, so its boundary holds.
 */
export const STEP_PREDECESSORS: Record<StepName, StepName[]> = {
  intake: [],
  research: [],
  offer: ["research"],
  argument: ["research", "offer"],
  draft: ["argument"],
  tell_edit: ["draft", "revise"],
  // draft and revise stay listed so a cold read a pre-tell-edit revision enqueued still finds its boundary
  cold_read: ["tell_edit", "draft", "revise"],
  editorial: ["cold_read"],
  mechanical: ["cold_read", "tell_edit"],
  factual: ["cold_read", "tell_edit"],
  revise: ["editorial", "mechanical", "factual"],
  ship: ["editorial", "mechanical", "factual"],
};

/** The latest completion among the step's predecessors; rows of the step created before it belong to an earlier pass. */
export function passBoundary(step: StepName, history: { step: string; status: string; finished_at: string | null; created_at: string }[]): string | null {
  let b: string | null = null;
  for (const r of history) {
    if (r.status !== "completed" || !STEP_PREDECESSORS[step].includes(r.step as StepName)) continue;
    const t = r.finished_at ?? r.created_at;
    if (!b || Date.parse(t) > Date.parse(b)) b = t;
  }
  return b;
}

/** Steps in a brand-new generation, before any work. */
export function initialSteps(s: Pick<PipelineState, "hasActiveResearch" | "hasApprovedOffer" | "skipOffer">): StepName[] {
  const steps: StepName[] = [];
  if (!s.hasActiveResearch) steps.push("research");
  if (!s.hasApprovedOffer && !s.skipOffer) steps.push("offer");
  steps.push("argument", "draft", "tell_edit", "cold_read", "editorial", "mechanical", "factual", "revise", "ship");
  return steps;
}

/** Which step(s) to enqueue after `justCompleted`. Reviews fan out in parallel after the cold read. */
export function nextSteps(justCompleted: StepName, s: PipelineState): StepName[] {
  switch (justCompleted) {
    case "intake":
      return [];
    case "research":
      return s.hasApprovedOffer || s.skipOffer ? ["argument"] : ["offer"];
    case "offer":
      // the offer step pauses the pipeline for approval; the web app re-queues with "argument" once approved
      return [];
    case "argument":
      return ["draft"];
    case "draft":
      return ["tell_edit"];
    case "tell_edit":
      // every draft and revision passes the owner's tell edit before the cold read (docs/04 §7.1); the final revision,
      // which applies the last review's notes, is checked for facts and tells instead of reviewed again
      return s.revisionCycles > MAX_REVISION_CYCLES ? ["mechanical", "factual"] : ["cold_read"];
    case "cold_read":
      return ["editorial", "mechanical", "factual"];
    case "editorial":
    case "mechanical":
    case "factual": {
      if (s.finalPass || s.revisionCycles > MAX_REVISION_CYCLES) {
        // the final pass: the last review's notes are in; it ships once the facts and the mechanics are checked
        return (["mechanical", "factual"] as StepName[]).every((x) => s.completed.includes(x)) ? ["ship"] : [];
      }
      const all = (["editorial", "mechanical", "factual"] as StepName[]).every((x) => s.completed.includes(x));
      if (!all) return [];
      const clean = s.editorialVerdict === "APPROVE" && !s.mechanicalHardFail && !s.factualFatal;
      if (clean) return ["ship"];
      // up to three revisions are reviewed again; after the last review one more revision applies its notes, so the
      // copy chief's last objection is never shipped unaddressed
      return ["revise"];
    }
    case "revise":
      return ["tell_edit"];
    case "ship":
      return [];
  }
}

export const REVIEW_STEPS: StepName[] = ["editorial", "mechanical", "factual"];
