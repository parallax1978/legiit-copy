import type { Block, DraftOutput, Section } from "./schemas/draft.ts";
import { LEDGER_TAG } from "./schemas/common.ts";

/** Blocks → markdown for the editor and exports. Ledger tags are kept (the editor renders them as chips) unless stripped. */
export function renderMarkdown(draft: Pick<DraftOutput, "sections">, opts: { stripLedger?: boolean } = {}): string {
  const out: string[] = [];
  for (const s of draft.sections) out.push(renderSection(s, opts));
  return out.join("\n\n").trim() + "\n";
}

export function renderSection(s: Section, opts: { stripLedger?: boolean } = {}): string {
  return s.blocks.map((b) => renderBlock(b, opts)).filter(Boolean).join("\n\n");
}

export function renderBlock(b: Block, opts: { stripLedger?: boolean } = {}): string {
  const t = opts.stripLedger ? stripLedger(b.text) : b.text;
  switch (b.type) {
    case "preheadline":
      return `*${t}*`;
    case "headline":
      return `# ${t}`;
    case "deck":
      return `## ${t}`;
    case "crosshead":
      return `### ${t}`;
    case "subject":
      return `**Subject:** ${t}`;
    case "preview":
      return `**Preview:** ${t}`;
    case "bullets":
      return (b.items ?? []).map((i) => `- ${opts.stripLedger ? stripLedger(i) : i}`).join("\n");
    case "numbered":
      return (b.items ?? []).map((i, n) => `${n + 1}. ${opts.stripLedger ? stripLedger(i) : i}`).join("\n");
    case "testimonial":
      return `> ${t}`;
    case "button":
      return `[ ${t} ]`;
    case "ps":
      return t.startsWith("P.S.") ? t : `P.S. ${t}`;
    case "label":
      return `**${t}**`;
    case "beat":
    case "slide":
      return `${b.meta?.timestamp ? `(${b.meta.timestamp}) ` : ""}${t}`;
    default:
      return t;
  }
}

export function stripLedger(text: string): string {
  return text.replace(LEDGER_TAG, "").replace(/\s{2,}/g, " ").trim();
}

export function ledgerRefs(text: string): string[] {
  return Array.from(text.matchAll(LEDGER_TAG)).map((m) => m[1]);
}

export function wordCount(text: string): number {
  return stripLedger(text).split(/\s+/).filter(Boolean).length;
}

export function draftWordCount(draft: Pick<DraftOutput, "sections">): number {
  return draft.sections.reduce((n, s) => n + s.blocks.reduce((m, b) => m + wordCount(b.text) + (b.items ?? []).reduce((k, i) => k + wordCount(i), 0), 0), 0);
}

export function extractSkimPath(draft: Pick<DraftOutput, "sections">, skimTypes: string[]): string[] {
  const out: string[] = [];
  for (const s of draft.sections) for (const b of s.blocks) if (skimTypes.includes(b.type)) out.push(stripLedger(b.text));
  return out;
}
