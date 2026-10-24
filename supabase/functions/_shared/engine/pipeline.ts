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
}

/** Steps in a brand-new generation, before any work. */
export function initialSteps(s: Pick<PipelineState, "hasActiveResearch" | "hasApprovedOffer" | "skipOffer">): StepName[] {
  const steps: StepName[] = [];
  if (!s.hasActiveResearch) steps.push("research");
  if (!s.hasApprovedOffer && !s.skipOffer) steps.push("offer");
  steps.push("argument", "draft", "cold_read", "editorial", "mechanical", "factual", "revise", "ship");
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
      return ["cold_read"];
    case "cold_read":
      return ["editorial", "mechanical", "factual"];
    case "editorial":
    case "mechanical":
    case "factual": {
      const all = (["editorial", "mechanical", "factual"] as StepName[]).every((x) => s.completed.includes(x));
      if (!all) return [];
      const clean = s.editorialVerdict === "APPROVE" && !s.mechanicalHardFail && !s.factualFatal;
      if (clean || s.revisionCycles >= MAX_REVISION_CYCLES) return ["ship"];
      return ["revise"];
    }
    case "revise":
      return ["cold_read"];
    case "ship":
      return [];
  }
}

export const REVIEW_STEPS: StepName[] = ["editorial", "mechanical", "factual"];
