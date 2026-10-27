import { describe, expect, it } from "vitest";
import { FORMAT_IDS } from "@engine/schemas/common.ts";
import { initialSteps, nextSteps } from "@engine/pipeline.ts";
import { MAX_REVISION_CYCLES } from "@engine/config.ts";
import { renderMarkdown, stripLedger } from "@engine/render.ts";

describe("engine modules used by the web app", () => {
  it("exposes every format id", () => {
    expect(FORMAT_IDS.length).toBeGreaterThan(20);
    expect(FORMAT_IDS).toContain("sales_letter");
  });
  it("plans a new generation: research and offer only when missing", () => {
    expect(initialSteps({ hasActiveResearch: false, hasApprovedOffer: false })[0]).toBe("research");
    expect(initialSteps({ hasActiveResearch: true, hasApprovedOffer: true })[0]).toBe("argument");
    expect(initialSteps({ hasActiveResearch: true, hasApprovedOffer: false, skipOffer: true })[0]).toBe("argument");
  });
  it("runs the tell edit after the draft and after every revision, before the cold read", () => {
    const s = { hasActiveResearch: true, hasApprovedOffer: true, completed: [], revisionCycles: 0 };
    expect(initialSteps(s)).toEqual(["argument", "draft", "tell_edit", "cold_read", "editorial", "mechanical", "factual", "revise", "ship"]);
    expect(nextSteps("draft", s)).toEqual(["tell_edit"]);
    expect(nextSteps("tell_edit", s)).toEqual(["cold_read"]);
    expect(nextSteps("revise", s)).toEqual(["tell_edit"]);
  });
  it("fans reviews out after the cold read and ships when clean", () => {
    expect(nextSteps("cold_read", { hasActiveResearch: true, hasApprovedOffer: true, completed: [], revisionCycles: 0 })).toEqual(["editorial", "mechanical", "factual"]);
    const done = { hasActiveResearch: true, hasApprovedOffer: true, completed: ["editorial", "mechanical", "factual"] as const, revisionCycles: 0 };
    expect(nextSteps("factual", { ...done, completed: [...done.completed], editorialVerdict: "APPROVE" })).toEqual(["ship"]);
    expect(nextSteps("factual", { ...done, completed: [...done.completed], editorialVerdict: "REVISE" })).toEqual(["revise"]);
    // after the last reviewed revision, one more applies the last review's notes; it is checked, not reviewed, then ships
    expect(nextSteps("factual", { ...done, completed: [...done.completed], editorialVerdict: "REVISE", revisionCycles: MAX_REVISION_CYCLES })).toEqual(["revise"]);
    const final = { ...done, completed: [] as ("mechanical" | "factual")[], revisionCycles: MAX_REVISION_CYCLES + 1 };
    expect(nextSteps("tell_edit", final)).toEqual(["mechanical", "factual"]);
    expect(nextSteps("mechanical", { ...final, completed: ["mechanical"] })).toEqual([]);
    expect(nextSteps("factual", { ...final, completed: ["mechanical", "factual"], editorialVerdict: "REJECT" })).toEqual(["ship"]);
  });
  it("renders blocks to markdown and strips ledger tags", () => {
    const md = renderMarkdown({ sections: [{ section_id: "s", title: null, blocks: [{ id: "1", type: "headline", text: "Hello [[L:abc12345]]", items: null, meta: null }] }] });
    expect(md).toContain("# Hello");
    expect(stripLedger("x [[L:abc12345]] y")).toBe("x y");
  });
});
