import { assert, assertEquals } from "@std/assert";
import { inFinalPass, nextSteps, passBoundary, reviewsStalled, type PipelineState } from "../pipeline.ts";
import { MAX_REVISION_CYCLES, type StepName } from "../config.ts";

interface Row {
  step: StepName;
  status: string;
  created_at: string;
  finished_at: string | null;
}

/** A step history in order, one minute apart: what run-step's gate and pipelineState read. */
function history(steps: (StepName | [StepName, string])[]): Row[] {
  const t0 = Date.parse("2026-10-27T12:00:00Z");
  return steps.map((s, i) => {
    const [step, status] = Array.isArray(s) ? s : [s, "completed"];
    const at = new Date(t0 + i * 60_000).toISOString();
    return { step, status, created_at: at, finished_at: status === "completed" ? new Date(t0 + i * 60_000 + 30_000).toISOString() : null };
  });
}

/** run-step's "done this pass" test: a completed row of the step newer than the pass boundary. */
function doneThisPass(step: StepName, rows: Row[], requeuedAt: string | null = null): boolean {
  const b = [passBoundary(step, rows), requeuedAt].filter(Boolean).sort().at(-1) ?? null;
  const pass = rows.filter((r) => r.step === step && (!b || Date.parse(r.created_at) > Date.parse(b)));
  return pass.at(-1)?.status === "completed";
}

const REVIEWS: StepName[] = ["editorial", "mechanical", "factual"];
const cycle = (): StepName[] => ["tell_edit", "cold_read", ...REVIEWS];

/** Three reviewed revisions, the fourth review, then the final revision and its tell edit. */
function toFinalTellEdit(): Row[] {
  return history(["argument", "draft", ...cycle(), "revise", ...cycle(), "revise", ...cycle(), "revise", ...cycle(), "revise", "tell_edit"]);
}

function state(rows: Row[], over: Partial<PipelineState> = {}): PipelineState {
  const completedRows = rows.filter((r) => r.status === "completed");
  const cycleStart = completedRows.filter((r) => ["draft", "revise", "tell_edit", "cold_read"].includes(r.step)).at(-1)?.finished_at ?? null;
  const completed = Array.from(new Set(completedRows.filter((r) => !cycleStart || Date.parse(r.finished_at ?? r.created_at) > Date.parse(cycleStart)).map((r) => r.step)));
  return { hasActiveResearch: true, hasApprovedOffer: true, completed, revisionCycles: completedRows.filter((r) => r.step === "revise").length, finalPass: inFinalPass(completedRows), ...over };
}

Deno.test("final pass: the checks the final tell edit enqueues run, then the piece ships", () => {
  const rows = toFinalTellEdit();
  assertEquals(state(rows).revisionCycles, MAX_REVISION_CYCLES + 1);
  assertEquals(nextSteps("tell_edit", state(rows)), ["mechanical", "factual"]);
  // the fourth review's mechanical and factual rows belong to the previous pass: the new messages run
  assertEquals(doneThisPass("mechanical", rows), false);
  assertEquals(doneThisPass("factual", rows), false);
  const checked = [...rows, ...history(["mechanical", "factual"]).map((r, i) => ({ ...r, created_at: new Date(Date.parse(rows.at(-1)!.finished_at!) + (i + 1) * 60_000).toISOString(), finished_at: new Date(Date.parse(rows.at(-1)!.finished_at!) + (i + 1) * 60_000 + 30_000).toISOString() }))];
  assert(inFinalPass(checked));
  assertEquals(nextSteps("factual", state(checked)), ["ship"]);
  // a duplicate delivery after the checks completed is recognised as done
  assertEquals(doneThisPass("mechanical", checked), true);
});

Deno.test("final pass: a Retry inside it restarts the revision count and still ships", () => {
  const rows = toFinalTellEdit();
  const end = Date.parse(rows.at(-1)!.finished_at!);
  const iso = (m: number) => new Date(end + m * 60_000).toISOString();
  const withRetry: Row[] = [
    ...rows,
    { step: "mechanical", status: "completed", created_at: iso(1), finished_at: iso(1.5) },
    { step: "factual", status: "failed", created_at: iso(2), finished_at: null },
    { step: "factual", status: "completed", created_at: iso(10), finished_at: iso(10.5) },
  ];
  // the requeue resets the budget to zero, but the shape of the history still says final pass
  assertEquals(nextSteps("factual", state(withRetry, { revisionCycles: 0 })), ["ship"]);
});

Deno.test("final pass: a normal cycle is unchanged; the cold read still sets the reviews' boundary", () => {
  const rows = history(["argument", "draft", "tell_edit", "cold_read"]);
  assert(!inFinalPass(rows));
  assertEquals(nextSteps("tell_edit", state(rows.slice(0, 3))), ["cold_read"]);
  const reviewed = history(["argument", "draft", "tell_edit", "cold_read", ...REVIEWS]);
  assertEquals(doneThisPass("mechanical", reviewed), true);
  assertEquals(nextSteps("factual", state(reviewed, { editorialVerdict: "REVISE" })), ["revise"]);
  assertEquals(nextSteps("factual", state(reviewed, { editorialVerdict: "APPROVE" })), ["ship"]);
  // a draft's first tell edit, before any cold read, is not a final pass
  assert(!inFinalPass(history(["argument", "draft", "tell_edit"])));
});

Deno.test("a stalled review loop ships: the chief failed the same gate on the same line twice, so a third revision would repeat the note", () => {
  const review = (quote: string, gate: string | null = "B", verdict = "REJECT") => ({ verdict, reject_gate: gate, one_thing: gate ? { quote, fails: "Gate B", do: "cut it" } : null });
  assertEquals(reviewsStalled([review("Command Center by Legiit / Stop guessing."), review("Command Center by Legiit / Stop guessing.")]), true);
  assertEquals(reviewsStalled([review("Command Center by Legiit / Stop guessing [[L:1]]."), review("command center by legiit / stop guessing")]), true, "ledger tags, case and punctuation do not tell the lines apart");
  assertEquals(reviewsStalled([review("one line"), review("another line")]), false);
  assertEquals(reviewsStalled([review("one line", "A"), review("one line", "B")]), false);
  assertEquals(reviewsStalled([review("one line")]), false);
  assertEquals(reviewsStalled([review("one line"), review("one line", null, "APPROVE")]), false);
  const s = { hasActiveResearch: true, hasApprovedOffer: true, completed: ["editorial", "mechanical", "factual"] as StepName[], editorialVerdict: "REJECT" as const, revisionCycles: 1, editorialStalled: true };
  assertEquals(nextSteps("factual", s), ["ship"]);
  assertEquals(nextSteps("factual", { ...s, editorialStalled: false }), ["revise"]);
  assertEquals(nextSteps("factual", { ...s, factualFatal: true }), ["revise"], "a fabrication still gets its revision");
  assertEquals(nextSteps("editorial", { ...s, completed: ["editorial"] }), [], "the checks finish first");
});

Deno.test("a short piece's loop is one round shorter: the cap in the state wins over the default", () => {
  const base = { hasActiveResearch: true, hasApprovedOffer: true, completed: ["tell_edit"] as StepName[], revisionCycles: 3 };
  assertEquals(nextSteps("tell_edit", base), ["cold_read"], "the default loop reviews a third revision");
  assertEquals(nextSteps("tell_edit", { ...base, maxRevisionCycles: 2 }), ["mechanical", "factual"], "a short piece's third revision is the final pass");
  assertEquals(nextSteps("tell_edit", { ...base, revisionCycles: 2, maxRevisionCycles: 2 }), ["cold_read"]);
  const reviewed = { ...base, completed: ["editorial", "mechanical", "factual"] as StepName[], editorialVerdict: "REJECT" as const, revisionCycles: 3, maxRevisionCycles: 2 };
  assertEquals(nextSteps("factual", reviewed), ["ship"], "past the cap, the checks ship");
});
