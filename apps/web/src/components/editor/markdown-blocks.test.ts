import { describe, it, expect } from "vitest";
import { markdownToBlocks, draftFromMarkdown, replaceInDraft, groupItems, diffParagraphs, splitParagraphs, draftToMarkdown, readDraftOutput, cleanMarkdown, markdownToText, type DraftOutput } from "./markdown-blocks";
import { markdownToHtml, htmlToMarkdown } from "./copy-editor";

const LID = "0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b";

const draft: DraftOutput = {
  format: "email_single",
  sections: [
    { section_id: "subject", title: "Subject and preview", blocks: [{ id: "b1", type: "subject", text: "The 14-day number", items: null, meta: null }, { id: "b2", type: "preview", text: "What 212 people saw first", items: null, meta: null }] },
    { section_id: "body", title: null, blocks: [{ id: "b3", type: "paragraph", text: `212 of the first 300 users hit the target in 14 days. [[L:${LID}]]`, items: null, meta: null }, { id: "b4", type: "bullets", text: "", items: ["One", `Two [[L:${LID}]]`], meta: null }] },
    { section_id: "cta", title: null, blocks: [{ id: "b5", type: "button", text: "Start the trial", items: null, meta: null }, { id: "b6", type: "ps", text: "P.S. The price goes up Friday.", items: null, meta: null }] },
  ],
  leads: null,
  chosen_lead_id: null,
  skim_path: [],
  ledger_refs_used: [LID],
  needs_source: [],
  word_count: 0,
};

describe("markdown round trip", () => {
  it("keeps ledger tags and button lines through marked and turndown", () => {
    const md = draftToMarkdown(draft);
    const back = htmlToMarkdown(markdownToHtml(md));
    expect(back).toContain(`[[L:${LID}]]`);
    expect(back).toContain("[ Start the trial ]");
    expect(back).toContain("**Subject:** The 14-day number");
    expect(back).toContain("P.S. The price goes up Friday.");
  });

  it("parses the editor markdown back into typed blocks", () => {
    const md = `# Headline here\n\n## A deck\n\n**Subject:** Hi\n\nA paragraph with a claim. [[L:${LID}]]\n\n- one\n- two\n\n1. first\n2. second\n\n> A quote\n\n[ Buy now ]\n\nP.S. Last line.\n`;
    const blocks = markdownToBlocks(md);
    expect(blocks.map((b) => b.type)).toEqual(["headline", "deck", "subject", "paragraph", "bullets", "numbered", "testimonial", "button", "ps"]);
    expect(blocks[4].items).toEqual(["one", "two"]);
    expect(blocks[7].text).toBe("Buy now");
    const out = draftFromMarkdown(md, draft);
    expect(out.ledger_refs_used).toEqual([LID]);
    expect(out.format).toBe("email_single");
    expect(out.word_count).toBeGreaterThan(10);
  });

  it("strips ledger tags for exports but keeps the text", () => {
    const md = draftToMarkdown(draft);
    const clean = cleanMarkdown(md);
    expect(clean).not.toContain("[[L:");
    expect(clean).toContain("212 of the first 300 users hit the target in 14 days.");
    expect(markdownToText(md)).toContain("Subject: The 14-day number");
  });
});

describe("flags and items", () => {
  it("replaces a quoted line in texts and list items", () => {
    const { draft: next, count } = replaceInDraft(draft, "212 of the first 300 users", "212 of 300 early users");
    expect(count).toBe(1);
    expect(next.sections[1].blocks[0].text.startsWith("212 of 300 early users")).toBe(true);
    const r2 = replaceInDraft(draft, "Two", "Deux");
    expect(r2.count).toBe(1);
    expect(r2.draft.sections[1].blocks[1].items?.[1]).toContain("Deux");
  });

  it("groups multi-item sections by prefix, or one section per item", () => {
    const seq: DraftOutput = { ...draft, sections: [
      { section_id: "email_1.subject", title: "Email 1", blocks: [] },
      { section_id: "email_1.body", title: null, blocks: [] },
      { section_id: "email_2.subject", title: "Email 2", blocks: [] },
    ] };
    const items = groupItems(seq);
    expect(items.map((i) => i.key)).toEqual(["email_1", "email_2"]);
    expect(items[0].sections).toHaveLength(2);
    const flat = groupItems({ sections: [{ section_id: "email_1", title: "Open", blocks: [] }, { section_id: "email_2", title: "Close", blocks: [] }] });
    expect(flat).toHaveLength(2);
    expect(flat[0].label).toBe("Email 1: Open");
  });

  it("reads stored blocks loosely and rejects junk", () => {
    expect(readDraftOutput(null)).toBeNull();
    expect(readDraftOutput([])).toBeNull();
    expect(readDraftOutput({ sections: draft.sections })?.sections).toHaveLength(3);
  });

  it("diffs paragraphs", () => {
    const a = splitParagraphs("One\n\nTwo\n\nThree");
    const b = splitParagraphs("One\n\nTwo changed\n\nThree\n\nFour");
    const ops = diffParagraphs(a, b);
    expect(ops.filter((o) => o.kind === "same")).toHaveLength(2);
    expect(ops.filter((o) => o.kind === "removed").map((o) => o.text)).toEqual(["Two"]);
    expect(ops.filter((o) => o.kind === "added").map((o) => o.text)).toEqual(["Two changed", "Four"]);
  });
});
