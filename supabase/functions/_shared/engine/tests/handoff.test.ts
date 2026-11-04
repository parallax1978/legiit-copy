import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { newBlocks, pageLines, reconcilePlacement, renderHandoff } from "../handoff.ts";
import type { Block, Section } from "../schemas/draft.ts";

const blk = (id: string, type: Block["type"], text: string, items: string[] | null = null): Block => ({ id, type, text, items, meta: null });
const sections: Section[] = [
  { section_id: "headline", title: null, blocks: [blk("headline-1", "preheadline", "Command Center by Legiit"), blk("headline-2", "headline", "Sit down with 15 quiet minutes [[L:86d5576e-d2de-4b8f-81dd-14b55b32a35c]] and know the one job to do first.")] },
  { section_id: "cta_primary", title: null, blocks: [blk("cta_primary-1", "button", "Start my 7-day free trial")] },
  { section_id: "benefits", title: null, blocks: [blk("benefits-1", "bullets", "", ["One move, not twelve", "The work started for you"]), blk("benefits-2", "paragraph", "You sit down and see one move.")] },
];
const page = ["[Nav] Home Log In Start Free Trial", "# Stop guessing what to work on", "Command Center shows you the next move.", "[Button] Start Free Trial", "- Business plan", "- Specialist on call", "[Footer] Terms · Privacy"].join("\n\n");

Deno.test("page lines carry their marks as roles; blocks are plain text by id", () => {
  const lines = pageLines(page);
  assertEquals(lines.map((l) => l.role), ["the site menu", "the headline", null, "a button", "a bullet", "a bullet", "the footer"]);
  assertEquals(lines[1].text, "Stop guessing what to work on");
  const blocks = newBlocks(sections);
  assertEquals(blocks.map((b) => [b.id, b.role]), [["headline-1", "preheadline"], ["headline-2", "headline"], ["cta_primary-1", "button label"], ["benefits-1", "bullets"], ["benefits-2", "paragraph"]]);
  assertEquals(blocks[1].text, "Sit down with 15 quiet minutes and know the one job to do first.");
  assertEquals(blocks[3].text, "- One move, not twelve\n- The work started for you");
});

Deno.test("a placement becomes exact instructions in page order; nothing placed twice or lost", () => {
  const lines = pageLines(page);
  const blocks = newBlocks(sections);
  const h = reconcilePlacement(
    {
      replacements: [
        { old: "# Stop guessing what to work on", new_block: "headline-2" },
        { old: "[Button] Start Free Trial", new_block: "cta_primary-1" },
        { old: "- Business plan", new_block: "benefits-1" },
        { old: "Command Center shows you the next move.", new_block: "headline-2" }, // placed already: ignored
        { old: "a line the page never had", new_block: "benefits-2" },
      ],
      additions: [{ after: null, new_block: "headline-1" }],
      keep: ["[Nav] Home Log In Start Free Trial", "[Footer] Terms · Privacy"],
      drop: ["- Specialist on call", "Command Center shows you the next move"],
    },
    lines,
    blocks,
  );
  assertEquals(h.steps.map((s) => [s.kind, s.line?.index ?? null, s.block?.id ?? null]), [
    ["add", null, "headline-1"],
    ["replace", 1, "headline-2"],
    ["remove", 2, null],
    ["replace", 3, "cta_primary-1"],
    ["replace", 4, "benefits-1"],
    ["remove", 5, null],
  ]);
  assertEquals(h.unplaced.map((b) => b.id), ["benefits-2"]);
  assertEquals(h.unmatched, ["a line the page never had"]);
  const text = renderHandoff(h, { pageUrl: "https://example.com/offer" });
  assertStringIncludes(text, "1. ADD AT THE TOP (preheadline):\n   Command Center by Legiit");
  assertStringIncludes(text, "2. REPLACE «Stop guessing what to work on» (the headline)\n   WITH (headline):\n   Sit down with 15 quiet minutes and know the one job to do first.");
  assertStringIncludes(text, "3. REMOVE «Command Center shows you the next move.»");
  assertStringIncludes(text, "5. REPLACE «Business plan» (a bullet)\n   WITH (bullets):\n   - One move, not twelve\n   - The work started for you");
  assertStringIncludes(text, "Also place these, in this order, where each fits best (each once):\n\n7. ADD (paragraph):\n   You sit down and see one move.");
  assert(!text.includes("[[L:"));
});

Deno.test("a quoted line that trims or extends the page's line still finds it", () => {
  const lines = pageLines(page);
  const h = reconcilePlacement({ replacements: [{ old: "Stop guessing what to work on.", new_block: "headline-2" }, { old: "Command Center shows you the next move", new_block: "benefits-2" }], additions: [], keep: [], drop: [] }, lines, newBlocks(sections));
  assertEquals(h.steps.map((s) => s.line?.index), [1, 2]);
  assertEquals(h.unmatched, []);
});
