/**
 * The handoff of a rewrite to the page's builder: the model's placement (schemas/placement.ts) checked against the
 * page's lines and the draft's blocks, then written as exact instructions (REPLACE this line WITH this text, ADD after,
 * REMOVE), so whoever updates the page, a person or Claude, applies them instead of guessing. The copy in the
 * instructions is the draft's own text pulled by block id; the model never copies it.
 */
import type { Section } from "./schemas/draft.ts";
import type { PlacementT } from "./schemas/placement.ts";
import { renderBlock } from "./render.ts";

export interface PageLine {
  index: number;
  /** the line as read, mark included */
  raw: string;
  /** what the reader sees: the mark stripped */
  text: string;
  /** the element the mark names, for the instruction */
  role: string | null;
  key: string;
}

export interface NewBlock {
  id: string;
  role: string;
  text: string;
}

const MARK = /^(?:(#{1,6})\s+|\[(Button|Field|Image|Nav|Footer)\]\s+|(-)\s+|(>)\s+)/;
const ROLE: Record<string, string> = { Button: "a button", Field: "a form field", Image: "an image caption", Nav: "the site menu", Footer: "the footer" };

export function normalizeLine(s: string): string {
  return s.replace(/\[\[[^\]]*\]\]/g, "").replace(MARK, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** The page's current copy as lines a placement can quote: every non-empty line, with its mark read. */
export function pageLines(control: string): PageLine[] {
  const out: PageLine[] = [];
  for (const line of control.replace(/\r\n?/g, "\n").split("\n")) {
    const raw = line.trim();
    if (!raw || raw === "---") continue;
    const m = MARK.exec(raw);
    const role = m ? (m[1] ? (m[1].length === 1 ? "the headline" : m[1].length === 2 ? "a subheading" : "a heading") : m[2] ? ROLE[m[2]] : m[3] ? "a bullet" : "a quote") : null;
    out.push({ index: out.length, raw, text: raw.replace(MARK, "").trim(), role, key: normalizeLine(raw) });
  }
  return out;
}

const ROLE_OF_TYPE: Record<string, string> = { headline: "headline", preheadline: "preheadline", deck: "deck", crosshead: "subheading", button: "button label", bullets: "bullets", numbered: "numbered list", testimonial: "quote", label: "label", ps: "P.S.", paragraph: "paragraph", hook: "opening line", cta: "call to action" };

/** The rewrite's blocks as the model and the instructions see them: plain text, ledger tags out, one unit per block. */
export function newBlocks(sections: Section[]): NewBlock[] {
  return sections.flatMap((s) => s.blocks).map((b) => ({ id: b.id, role: ROLE_OF_TYPE[b.type] ?? b.type, text: renderBlock(b, { stripLedger: true, plain: true }).trim() })).filter((b) => b.text);
}

export interface HandoffStep {
  kind: "replace" | "add" | "remove";
  /** the page line, for replace and remove, or the line an addition follows (null: the top) */
  line: PageLine | null;
  block?: NewBlock;
}

export interface Handoff {
  steps: HandoffStep[];
  /** blocks the placement never put anywhere: listed at the end to be placed where they fit, in order */
  unplaced: NewBlock[];
  /** page lines the placement quoted that no line matched */
  unmatched: string[];
}

function findLine(lines: PageLine[], quoted: string): PageLine | null {
  const key = normalizeLine(quoted);
  if (!key) return null;
  const exact = lines.find((l) => l.key === key);
  if (exact) return exact;
  // a quote that trims or extends the line a little: most of the shorter one's words inside the longer
  const words = key.split(" ");
  let best: PageLine | null = null;
  let bestShare = 0;
  for (const l of lines) {
    const lw = l.key.split(" ");
    const [short, long] = words.length <= lw.length ? [words, new Set(lw)] : [lw, new Set(words)];
    const share = short.filter((w) => long.has(w)).length / short.length;
    if (share > bestShare && (l.key.includes(key) || key.includes(l.key) || share >= 0.8)) {
      best = l;
      bestShare = share;
    }
  }
  return best;
}

/** The placement checked: every block once, every quoted line a real line; what does not resolve is kept, never lost. */
export function reconcilePlacement(plan: PlacementT, lines: PageLine[], blocks: NewBlock[]): Handoff {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const placed = new Set<string>();
  const taken = new Set<number>();
  const steps: HandoffStep[] = [];
  const unmatched: string[] = [];
  const take = (id: string): NewBlock | null => {
    const b = byId.get(id);
    if (!b || placed.has(id)) return null;
    placed.add(id);
    return b;
  };
  for (const r of plan.replacements) {
    const line = findLine(lines, r.old);
    if (!line) {
      unmatched.push(r.old);
      continue;
    }
    const block = take(r.new_block);
    if (!block) continue;
    if (taken.has(line.index)) {
      steps.push({ kind: "add", line, block }); // a second block on the same line follows the first
      continue;
    }
    taken.add(line.index);
    steps.push({ kind: "replace", line, block });
  }
  for (const a of plan.additions) {
    const block = take(a.new_block);
    if (!block) continue;
    const line = a.after === null ? null : findLine(lines, a.after);
    if (a.after !== null && !line) unmatched.push(a.after);
    steps.push({ kind: "add", line: line ?? null, block });
  }
  for (const d of plan.drop) {
    const line = findLine(lines, d);
    if (!line) {
      unmatched.push(d);
      continue;
    }
    if (taken.has(line.index)) continue;
    taken.add(line.index);
    steps.push({ kind: "remove", line });
  }
  // page order: the top first, then by the line each step sits on; a replacement before an addition on the same line
  const rank = (s: HandoffStep) => (s.line ? s.line.index : -1) * 4 + (s.kind === "replace" ? 0 : s.kind === "remove" ? 1 : 2);
  steps.sort((a, b) => rank(a) - rank(b));
  return { steps, unplaced: blocks.filter((b) => !placed.has(b.id)), unmatched };
}

const quote = (t: string) => `«${t}»`;

/** The message pasted to whoever updates the page. */
export function renderHandoff(h: Handoff, opts: { pageUrl?: string | null } = {}): string {
  const out: string[] = [
    `Update the copy on this page${opts.pageUrl ? ` (${opts.pageUrl})` : ""} by applying the changes below, in order. Change only the words: keep the design, the layout, the images, every link and every button's destination. Each REPLACE quotes a line of the page as it is now and gives the text that takes its place. Each ADD quotes the line of the page the new text goes right after (ADD AT THE TOP goes before everything), in the page's own style for that kind of element. Each REMOVE quotes a line of the current copy that no longer has a place. Lines not mentioned stay as they are. Do not rewrite, shorten or add to the new text; keep its line breaks and bullets.`,
    "",
  ];
  let n = 0;
  const where = (l: PageLine) => `${quote(l.text)}${l.role ? ` (${l.role})` : ""}`;
  for (const s of h.steps) {
    n += 1;
    if (s.kind === "replace" && s.block && s.line) out.push(`${n}. REPLACE ${where(s.line)}\n   WITH (${s.block.role}):\n${indent(s.block.text)}`, "");
    else if (s.kind === "add" && s.block) out.push(`${n}. ADD ${s.line ? `after ${where(s.line)}` : "AT THE TOP"} (${s.block.role}):\n${indent(s.block.text)}`, "");
    else if (s.kind === "remove" && s.line) out.push(`${n}. REMOVE ${where(s.line)}`, "");
  }
  if (h.unplaced.length) {
    out.push(`Also place these, in this order, where each fits best (each once):`, "");
    for (const b of h.unplaced) {
      n += 1;
      out.push(`${n}. ADD (${b.role}):\n${indent(b.text)}`, "");
    }
  }
  return out.join("\n").trim() + "\n";
}

function indent(t: string): string {
  return t.split("\n").map((l) => `   ${l}`).join("\n");
}
