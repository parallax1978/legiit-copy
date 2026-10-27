/**
 * Assembling and re-assembling a DraftOutput from sections, and turning it into the runner's newDraft effect.
 */
import type { FormatSpec } from "../formats/spec.ts";
import { type Block, DraftOutput, type Section } from "../schemas/draft.ts";
import { LEDGER_TAG, type LeadType } from "../schemas/common.ts";
import { draftWordCount, extractSkimPath, renderMarkdown } from "../render.ts";
import type { StepEffects } from "../steps/types.ts";
import { collectLedgerRefs, needsSourceLines, readerText } from "./ledger.ts";
import { sectionBaseId, sectionItemIndex } from "../formats/index.ts";

export type LeadVariantT = NonNullable<DraftOutput["leads"]>[number];

/**
 * Reading order: unsuffixed sections (item 0) first, then items 1..n; within an item the spec's section order.
 * Sections the spec does not list keep their given order at the end of their item.
 */
export function orderSections(spec: FormatSpec, sections: Section[]): Section[] {
  const rank = new Map(spec.sections.map((s, i) => [s.id, i]));
  const key = (s: Section) => {
    const r = rank.get(sectionBaseId(s.section_id));
    return [sectionItemIndex(s.section_id), r === undefined ? Number.MAX_SAFE_INTEGER : r] as const;
  };
  return sections.map((s, i) => ({ s, i, k: key(s) })).sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.i - b.i).map((x) => x.s);
}

export interface AssembleInput {
  spec: FormatSpec;
  sections: Section[];
  leads: LeadVariantT[] | null;
  chosenLeadId: string | null;
  /** needs_source lines the model listed; merged with the ones found in the text */
  needsSource?: string[];
  /** keep the given section order instead of the spec's reading order (multi-item formats) */
  keepOrder?: boolean;
}

/** Heading marks and emphasis wrappers a drafter writes into a display block's text; the block type carries that. */
const HEADING_MARK = /^\s{0,3}#{1,6}\s+/;
const DISPLAY_BLOCKS = new Set(["headline", "deck", "preheadline", "crosshead", "subject", "preview", "label", "button"]);
const LIST_LINE = /^\s*(?:[-*•]|\d+[.)])\s+/;
const listKey = (t: string) => t.replace(new RegExp(LEDGER_TAG.source, "g"), " ").replace(LIST_LINE, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** A list block whose text repeats its own items as list lines would render the list twice; the items stay, the copy goes. */
function dropListCopy(b: Block): Block {
  if ((b.type !== "bullets" && b.type !== "numbered") || !b.items?.length || !b.text.trim()) return b;
  const items = new Set(b.items.map(listKey));
  const kept = b.text.split("\n").filter((line) => !(LIST_LINE.test(line) && items.has(listKey(line))));
  return kept.length === b.text.split("\n").length ? b : { ...b, text: kept.join("\n").trim() };
}

export function cleanBlockText(sections: Section[]): Section[] {
  return sections.map((s) => ({
    ...s,
    blocks: s.blocks.map((b) => {
      b = dropListCopy(b);
      if (!DISPLAY_BLOCKS.has(b.type) || !HEADING_MARK.test(b.text)) return b;
      return { ...b, text: b.text.replace(HEADING_MARK, "").replace(/^\*\*(.+)\*\*$/s, "$1").trim() };
    }),
  }));
}

export function assembleDraft(input: AssembleInput): DraftOutput {
  const sections = cleanBlockText(input.keepOrder ? input.sections : orderSections(input.spec, input.sections));
  const fromText = needsSourceLines(sections);
  const needs = [...fromText];
  for (const n of input.needsSource ?? []) {
    const t = n.trim();
    if (t && !needs.some((x) => x.toLowerCase() === t.toLowerCase())) needs.push(t);
  }
  const draft: DraftOutput = {
    format: input.spec.id,
    sections,
    leads: input.leads && input.leads.length ? input.leads : null,
    chosen_lead_id: input.chosenLeadId,
    // extractSkimPath strips ledger tags; readerText also drops NEEDS SOURCE markers and the space left before punctuation
    skim_path: extractSkimPath({ sections }, input.spec.skim_path_block_types).map(readerText).filter(Boolean),
    ledger_refs_used: collectLedgerRefs(sections),
    needs_source: needs,
    // words of copy as the reader sees them: ledger tags and NEEDS SOURCE markers are not words
    word_count: draftWordCount({ sections: sections.map((s) => ({ ...s, blocks: s.blocks.map((b) => ({ ...b, text: readerText(b.text), items: b.items ? b.items.map(readerText) : null })) })) }),
  };
  return DraftOutput.parse(draft);
}

/** Put the chosen lead's blocks into the lead section and record the choice. Leads are kept for the challenger. */
export function applyLeadPick(draft: DraftOutput, spec: FormatSpec, leadSectionId: string, chosenId: string): DraftOutput {
  const lead = draft.leads?.find((l) => l.id === chosenId);
  if (!lead) throw new Error(`lead ${chosenId} not found in draft`);
  const sections = draft.sections.map((s) => (s.section_id === leadSectionId ? { ...s, blocks: lead.blocks.map((b) => ({ ...b, meta: { ...(b.meta ?? {}), lead_id: lead.id, lead_type: lead.lead_type } })) } : s));
  return assembleDraft({ spec, sections, leads: draft.leads, chosenLeadId: chosenId, needsSource: draft.needs_source, keepOrder: true });
}

/** A provisional lead section while no lead is chosen: the first variant, marked as such. */
export function provisionalLeadSection(sectionId: string, title: string | null, leads: LeadVariantT[]): Section {
  const first = leads[0];
  return { section_id: sectionId, title, blocks: first.blocks.map((b) => ({ ...b, meta: { ...(b.meta ?? {}), lead_id: first.id, lead_type: first.lead_type as LeadType, provisional: "true" } })) };
}

export function toDraftEffect(draft: DraftOutput, origin: "system" | "revise" | "challenger", label?: string): NonNullable<StepEffects["newDraft"]> {
  return {
    origin,
    label,
    blocks: draft,
    markdown: renderMarkdown(draft),
    skimPath: draft.skim_path,
    ledgerRefs: draft.ledger_refs_used,
    wordCount: draft.word_count,
  };
}

/** drafts.blocks holds the whole DraftOutput; older rows or user edits may not parse. */
export function parseStoredDraft(blocks: unknown): DraftOutput | null {
  const r = DraftOutput.safeParse(blocks);
  return r.success ? r.data : null;
}
