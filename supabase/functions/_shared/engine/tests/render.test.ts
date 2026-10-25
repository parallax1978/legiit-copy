import { assert, assertEquals } from "@std/assert";
import { renderBlock } from "../render.ts";
import { sectionsWithIds } from "../draft/prompt_text.ts";
import { cleanBlockText } from "../draft/assemble.ts";
import type { Block, Section } from "../schemas/draft.ts";

const block = (type: Block["type"], text: string, items: string[] | null = null): Block => ({ id: `s-${type}`, type, text, items, meta: null });
const section = (blocks: Block[]): Section => ({ section_id: "s", title: null, blocks });

Deno.test("renderBlock: markdown by default, bare text when plain", () => {
  assertEquals(renderBlock(block("headline", "Hello")), "# Hello");
  assertEquals(renderBlock(block("crosshead", "Hello")), "### Hello");
  assertEquals(renderBlock(block("headline", "Hello"), { plain: true }), "Hello");
  assertEquals(renderBlock(block("crosshead", "Hello"), { plain: true }), "Hello");
  assertEquals(renderBlock(block("button", "Go"), { plain: true }), "Go");
  assertEquals(renderBlock(block("testimonial", "It worked"), { plain: true }), "It worked");
  assertEquals(renderBlock(block("bullets", "", ["a", "b"]), { plain: true }), "- a\n- b");
  assertEquals(renderBlock(block("ps", "One more"), { plain: true }), "P.S. One more");
});

Deno.test("sectionsWithIds: reviewers see the block type and its own text, never a renderer heading mark", () => {
  const out = sectionsWithIds([section([block("headline", "The editing happens first"), block("crosshead", "A copy chief reads it"), block("paragraph", "Body.")])]);
  assert(out.includes("[s-headline | headline] The editing happens first"));
  assert(out.includes("[s-crosshead | crosshead] A copy chief reads it"));
  assert(!/\]\s+#/.test(out), out);
});

Deno.test("cleanBlockText: heading marks a drafter wrote into display blocks are dropped, prose is untouched", () => {
  const [s] = cleanBlockText([section([block("headline", "# The editing happens first"), block("crosshead", "### **A copy chief reads it**"), block("paragraph", "# not a heading in prose")])]);
  assertEquals(s.blocks[0].text, "The editing happens first");
  assertEquals(s.blocks[1].text, "A copy chief reads it");
  assertEquals(s.blocks[2].text, "# not a heading in prose");
});
