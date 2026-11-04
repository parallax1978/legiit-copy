import { describe, expect, it } from "vitest";
import { claudeHandoff } from "@/components/editor/markdown-blocks";

describe("the handoff for Claude", () => {
  it("packs the instruction, the new copy as plain text and the page's copy now", () => {
    const out = claudeHandoff("*Command Center by Legiit*\n\n# Sit down with 15 quiet minutes [[L:86d5576e-d2de-4b8f-81dd-14b55b32a35c]] and know the one job to do first.\n\n[ Start my 7-day free trial ]\n\n- One move, not twelve\n", "[Nav] Home\n\n# Stop guessing what to work on\n\n[Button] Start Free Trial");
    expect(out.startsWith("Update the copy on this page.")).toBe(true);
    expect(out).toContain("NEW COPY\n\nCommand Center by Legiit\n\nSit down with 15 quiet minutes and know the one job to do first.\n\n[Start my 7-day free trial]\n\n- One move, not twelve");
    expect(out).toContain("THE PAGE'S COPY NOW\n\n[Nav] Home");
    expect(out).not.toContain("[[L:");
  });
  it("leaves the page's copy out when there is none", () => {
    expect(claudeHandoff("# Headline\n")).not.toContain("THE PAGE'S COPY NOW");
  });
});
