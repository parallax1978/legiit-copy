import { sectionBaseId, sectionItemIndex } from "@engine/formats/index.ts";
import type { Block, DraftOutput, Section } from "@engine/schemas/mod.ts";
import { LEDGER_TAG } from "@engine/schemas/common.ts";
import { renderMarkdown, renderSection, stripLedger } from "@engine/render.ts";

export type { Block, DraftOutput, Section };

export const NEEDS_SOURCE = "[[NEEDS SOURCE]]";

/** A loose read of drafts.blocks: the engine stores a DraftOutput; user edits store the same shape. */
export function readDraftOutput(blocks: unknown): DraftOutput | null {
  if (!blocks || typeof blocks !== "object") return null;
  const b = blocks as Partial<DraftOutput> & { sections?: unknown };
  if (!Array.isArray(b.sections)) return null;
  return {
    format: (b.format ?? "sales_letter") as DraftOutput["format"],
    sections: (b.sections as Section[]).filter((s) => s && Array.isArray(s.blocks)),
    leads: Array.isArray(b.leads) ? b.leads : null,
    chosen_lead_id: b.chosen_lead_id ?? null,
    skim_path: Array.isArray(b.skim_path) ? b.skim_path : [],
    ledger_refs_used: Array.isArray(b.ledger_refs_used) ? b.ledger_refs_used : [],
    needs_source: Array.isArray(b.needs_source) ? b.needs_source : [],
    word_count: typeof b.word_count === "number" ? b.word_count : 0,
  };
}

export function ledgerIdsIn(text: string): string[] {
  return Array.from(text.matchAll(LEDGER_TAG)).map((m) => m[1]);
}

export function ledgerIdsInDraft(draft: Pick<DraftOutput, "sections">): string[] {
  const out = new Set<string>();
  for (const s of draft.sections) for (const b of s.blocks) {
    for (const id of ledgerIdsIn(b.text)) out.add(id);
    for (const i of b.items ?? []) for (const id of ledgerIdsIn(i)) out.add(id);
  }
  return Array.from(out);
}

export function countWords(text: string): number {
  return stripLedger(text).split(/\s+/).filter(Boolean).length;
}

export function draftWords(draft: Pick<DraftOutput, "sections">): number {
  return draft.sections.reduce((n, s) => n + s.blocks.reduce((m, b) => m + countWords(b.text) + (b.items ?? []).reduce((k, i) => k + countWords(i), 0), 0), 0);
}

/* ---------------- multi-item grouping ---------------- */

export interface DraftItem {
  key: string;
  label: string;
  sections: Section[];
}

/**
 * Multi-item formats (email sequences, webinar packages, ad sets) store one item per section, or several
 * sections per item sharing a prefix ("email_1.subject", "email_1.body"). Group accordingly.
 */
export function groupItems(draft: Pick<DraftOutput, "sections">): DraftItem[] {
  // Engine convention for multi-item formats: a spec section repeated per item carries the id suffix "#n"
  // ("subject#3", "primary_text#2"); unsuffixed ids are item 0. Older drafts may use meta.item or a prefix.
  const usesHashItems = draft.sections.some((s) => /#\d+$/.test(s.section_id));
  if (usesHashItems) {
    const indexOf = (s: Section) => sectionItemIndex(s.section_id);
    const indexes = Array.from(new Set(draft.sections.map(indexOf))).sort((a, b) => a - b);
    return indexes.map((idx) => {
      const sections = draft.sections.filter((s) => indexOf(s) === idx);
      const role = sections.flatMap((s) => s.blocks).find((b) => b.meta?.role || b.meta?.item)?.meta;
      const title = sections.find((s) => s.title)?.title ?? null;
      const label = role?.role ? humanizeItem(role.role, title) : title ?? `Item ${idx + 1}`;
      return { key: `item-${idx}`, label, sections };
    });
  }
  const keyOf = (s: Section) => (s.blocks.find((b) => b.meta?.item)?.meta?.item ?? s.section_id.split(/[./:]/)[0]).trim();
  const keys = Array.from(new Set(draft.sections.map(keyOf)));
  const grouped = keys.length < draft.sections.length;
  if (grouped) {
    return keys.map((key) => {
      const sections = draft.sections.filter((s) => keyOf(s) === key);
      return { key, label: humanizeItem(key, sections[0]?.title ?? null), sections };
    });
  }
  return draft.sections.map((s) => ({ key: s.section_id, label: humanizeItem(sectionBaseId(s.section_id), s.title), sections: [s] }));
}

function humanizeItem(key: string, title: string | null): string {
  const base = key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (title && title.trim() && title.trim().toLowerCase() !== base.toLowerCase()) return `${base}: ${title.trim()}`;
  return base;
}

/* ---------------- blocks → markdown ---------------- */

export function sectionsToMarkdown(sections: Section[], opts: { stripLedger?: boolean } = {}): string {
  return sections.map((s) => renderSection(s, opts)).filter(Boolean).join("\n\n").trim() + "\n";
}

export function draftToMarkdown(draft: Pick<DraftOutput, "sections">, opts: { stripLedger?: boolean } = {}): string {
  return renderMarkdown(draft, opts);
}

/** Clean copy for exports: ledger tags removed, placeholders kept so the user sees them. */
export function cleanMarkdown(md: string): string {
  return md.replace(LEDGER_TAG, "").replace(/[ \t]{2,}/g, " ").replace(/ +\n/g, "\n").trim() + "\n";
}

/** Markdown → plain text for TXT export and the clipboard. */
export function markdownToText(md: string): string {
  return cleanMarkdown(md)
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/\[ (.+?) \]/g, "[$1]")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1 ($2)")
    .trim() + "\n";
}

/* ---------------- markdown → blocks ---------------- */

let counter = 0;
function newId(prefix: string) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

/**
 * Parse the editor's markdown back into one section of blocks. The block vocabulary is the engine's; headings,
 * lists, quotes, subject/preview lines, buttons and P.S. lines keep their types, everything else is a paragraph.
 */
export function markdownToBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { type: "bullets" | "numbered"; items: string[] } | null = null;
  let quote: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    const text = para.join("\n").trim();
    para = [];
    if (!text) return;
    const subject = text.match(/^\*\*Subject:\*\*\s*([\s\S]*)$/);
    const preview = text.match(/^\*\*Preview:\*\*\s*([\s\S]*)$/);
    const label = text.match(/^\*\*([\s\S]+)\*\*$/);
    const button = text.match(/^\[ ([\s\S]+) \]$/);
    const pre = text.match(/^\*([^*][\s\S]*)\*$/);
    if (subject) blocks.push(block("subject", subject[1]));
    else if (preview) blocks.push(block("preview", preview[1]));
    else if (button) blocks.push(block("button", button[1]));
    else if (/^P\.S\./.test(text)) blocks.push(block("ps", text));
    else if (label && !label[1].includes("\n")) blocks.push(block("label", label[1]));
    else if (pre && !pre[1].includes("\n")) blocks.push(block("preheadline", pre[1]));
    else blocks.push(block("paragraph", text));
  };
  const flushList = () => {
    if (!list) return;
    blocks.push({ id: newId(list.type), type: list.type, text: "", items: list.items, meta: null });
    list = null;
  };
  const flushQuote = () => {
    if (!quote.length) return;
    blocks.push(block("testimonial", quote.join("\n").trim()));
    quote = [];
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    const li = line.match(/^\s*[-*•]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    const bq = line.match(/^>\s?(.*)$/);
    if (!line.trim()) {
      flushAll();
      continue;
    }
    if (h) {
      flushAll();
      blocks.push(block(h[1].length === 1 ? "headline" : h[1].length === 2 ? "deck" : "crosshead", h[2]));
      continue;
    }
    if (li) {
      flushPara();
      flushQuote();
      if (!list || list.type !== "bullets") {
        flushList();
        list = { type: "bullets", items: [] };
      }
      list.items.push(li[1]);
      continue;
    }
    if (ol) {
      flushPara();
      flushQuote();
      if (!list || list.type !== "numbered") {
        flushList();
        list = { type: "numbered", items: [] };
      }
      list.items.push(ol[1]);
      continue;
    }
    if (bq) {
      flushPara();
      flushList();
      quote.push(bq[1]);
      continue;
    }
    flushList();
    flushQuote();
    para.push(line);
  }
  flushAll();
  return blocks;
}

function block(type: Block["type"], text: string): Block {
  return { id: newId(type), type, text: text.trim(), items: null, meta: null };
}

/** Build the DraftOutput we store for a user-edited version. */
export function draftFromMarkdown(md: string, previous: DraftOutput | null): DraftOutput {
  const blocks = markdownToBlocks(md);
  const sections: Section[] = [{ section_id: "edited", title: null, blocks }];
  const draft: DraftOutput = {
    format: previous?.format ?? "sales_letter",
    sections,
    leads: previous?.leads ?? null,
    chosen_lead_id: previous?.chosen_lead_id ?? null,
    skim_path: previous?.skim_path ?? [],
    ledger_refs_used: [],
    needs_source: [],
    word_count: 0,
  };
  draft.ledger_refs_used = ledgerIdsInDraft(draft);
  draft.needs_source = blocks.filter((b) => b.text.includes(NEEDS_SOURCE) || (b.items ?? []).some((i) => i.includes(NEEDS_SOURCE))).map((b) => stripLedger(b.text).slice(0, 160));
  draft.word_count = draftWords(draft);
  return draft;
}

/** Replace a quoted passage everywhere in a draft (texts and list items). Returns the count of replacements. */
export function replaceInDraft(draft: DraftOutput, quote: string, replacement: string): { draft: DraftOutput; count: number } {
  let count = 0;
  const q = quote.trim();
  const rep = (s: string) => {
    if (!q || !s.includes(q)) return s;
    count += s.split(q).length - 1;
    return s.split(q).join(replacement);
  };
  const next: DraftOutput = {
    ...draft,
    sections: draft.sections.map((s) => ({ ...s, blocks: s.blocks.map((b) => ({ ...b, text: rep(b.text), items: b.items ? b.items.map(rep) : b.items })) })),
    leads: draft.leads ? draft.leads.map((l) => ({ ...l, blocks: l.blocks.map((b) => ({ ...b, text: rep(b.text), items: b.items ? b.items.map(rep) : b.items })) })) : draft.leads,
  };
  next.ledger_refs_used = ledgerIdsInDraft(next);
  next.word_count = draftWords(next);
  return { draft: next, count };
}

/* ---------------- paragraph diff for version compare ---------------- */

export type DiffOp = { kind: "same" | "added" | "removed"; text: string };

export function splitParagraphs(md: string): string[] {
  return cleanMarkdown(md).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

/** LCS-based paragraph diff. Small inputs, so O(n*m) is fine. */
export function diffParagraphs(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: "removed", text: a[i] });
      i++;
    } else {
      out.push({ kind: "added", text: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ kind: "removed", text: a[i++] });
  while (j < m) out.push({ kind: "added", text: b[j++] });
  return out;
}

export { stripLedger };
