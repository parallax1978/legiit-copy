import { describe, expect, it } from "vitest";
import type { GenerationRow, StepRow } from "@/lib/data/generations";
import { buildTimeline, summarize, timelineStatus } from "./outputs";

const T0 = "2026-10-24T10:00:00.000Z";
const T1 = "2026-10-24T10:05:00.000Z";
const T2 = "2026-10-24T10:10:00.000Z";

function generation(over: Partial<GenerationRow>): GenerationRow {
  return {
    id: "g1",
    workspace_id: "w1",
    offer_id: "o1",
    campaign_id: null,
    format: "sales_letter",
    purpose: null,
    options: {},
    status: "running",
    current_step: "draft",
    progress_message: null,
    step_order: ["argument", "draft", "cold_read", "editorial", "mechanical", "factual", "revise", "ship"],
    research_id: null,
    variant_id: null,
    voice_profile_id: null,
    selected_angle_id: null,
    requeued_at: null,
    prompt_version_set: {},
    model_set: {},
    cost_usd: 0,
    input_tokens: 0,
    output_tokens: 0,
    error: null,
    created_by: null,
    created_at: T0,
    updated_at: T0,
    completed_at: null,
    ...over,
  };
}

function step(over: Partial<StepRow> & Pick<StepRow, "step" | "status" | "created_at">): StepRow {
  return {
    id: `${over.step}-${over.attempt ?? 1}`,
    generation_id: "g1",
    workspace_id: "w1",
    attempt: 1,
    input_hash: null,
    output: null,
    model: null,
    input_tokens: 0,
    output_tokens: 0,
    cost_usd: 0,
    duration_ms: null,
    error: null,
    started_at: over.created_at,
    finished_at: over.created_at,
    ...over,
  };
}

describe("timeline statuses from generation_steps rows", () => {
  it("maps the resumable step's 'continued' row to running and never crashes on an unknown status", () => {
    expect(timelineStatus("continued")).toBe("running");
    expect(timelineStatus("completed")).toBe("completed");
    expect(timelineStatus("something_new")).toBe("pending");
  });

  it("shows a draft that checkpointed between invocations as running while the generation runs", () => {
    const steps = [
      step({ step: "argument", status: "completed", created_at: T0 }),
      step({ step: "draft", status: "continued", created_at: T1, output: { partial: { kind: "draft_partial" } } }),
    ];
    const entries = buildTimeline(generation({ status: "running", current_step: "draft" }), steps);
    const draft = entries.find((e) => e.step === "draft")!;
    expect(draft.status).toBe("running");
    expect(draft.error).toBeNull();
    expect(entries.find((e) => e.step === "argument")!.status).toBe("completed");
  });

  it("shows the same row as failed once the generation failed at that step, and interrupted when cancelled", () => {
    const steps = [step({ step: "draft", status: "continued", created_at: T1 })];
    expect(buildTimeline(generation({ status: "failed", current_step: "draft" }), steps).find((e) => e.step === "draft")!.status).toBe("failed");
    expect(buildTimeline(generation({ status: "cancelled", current_step: "draft" }), steps).find((e) => e.step === "draft")!.status).toBe("interrupted");
  });

  it("marks whichever step paused the pipeline as waiting on the user", () => {
    const offerSteps = [step({ step: "offer", status: "completed", created_at: T0 })];
    const offerGen = generation({ status: "needs_input", current_step: "offer", step_order: ["offer", "argument", "draft", "ship"] });
    expect(buildTimeline(offerGen, offerSteps).find((e) => e.step === "offer")!.status).toBe("paused");

    const argSteps = [step({ step: "argument", status: "completed", created_at: T2, output: { paused: true, reason: "no candidate passed both gates" } })];
    const argGen = generation({ status: "needs_input", current_step: "argument" });
    const arg = buildTimeline(argGen, argSteps).find((e) => e.step === "argument")!;
    expect(arg.status).toBe("paused");
    expect(arg.summary).toBe("Paused: no candidate passed both gates");
  });

  it("summarizes a paused step output instead of dumping its JSON", () => {
    expect(summarize("draft", { paused: true, reason: "no proof on the winner" })).toBe("Paused: no proof on the winner");
    expect(summarize("draft", { word_count: 1200, leads: [{}, {}, {}], needs_source: [] })).toBe("1,200 words, 3 leads");
  });
});

describe("the tell edit on the timeline", () => {
  it("appears after the draft for a generation started before it existed, once it has run", () => {
    const before = buildTimeline(generation({ status: "completed", current_step: "ship" }), [step({ step: "draft", status: "completed", created_at: T0 })]);
    expect(before.map((e) => e.step)).not.toContain("tell_edit");
    const steps = [
      step({ step: "draft", status: "completed", created_at: T0 }),
      step({ step: "tell_edit", status: "completed", created_at: T1, output: { what_changed: ["Cut a windup"], edits: [{ ref: "a", before: "x", after: "y", tell: "windup", by: "editor" }], rejected: [], owner_tells_before: 3, owner_tells_after: 0, already_clean: false, new_version: true } }),
    ];
    const entries = buildTimeline(generation({ status: "running", current_step: "cold_read" }), steps);
    const order = entries.map((e) => e.step);
    expect(order.indexOf("tell_edit")).toBe(order.indexOf("draft") + 1);
    expect(entries.find((e) => e.step === "tell_edit")!.summary).toBe("1 change; AI tells 3 to 0");
  });

  it("reads an unchanged tell edit in plain words", () => {
    expect(summarize("tell_edit", { what_changed: [], edits: [], rejected: [], owner_tells_before: 0, owner_tells_after: 0, already_clean: true, new_version: false })).toBe("No AI tells found; the copy is unchanged");
  });
});
