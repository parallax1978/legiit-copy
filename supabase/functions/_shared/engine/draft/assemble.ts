/**
 * Assembling and re-assembling a DraftOutput from sections, and turning it into the runner's newDraft effect.
 */
import type { FormatSpec } from "../formats/spec.ts";
import { DraftOutput, type Section } from "../schemas/draft.ts";
import type { LeadType } from "../schemas/common.ts";
import { draftWordCount, extractSkimPath, renderMarkdown } from "../render.ts";
import type { StepEffects } from "../steps/types.ts";
import { collectLedgerRefs, needsSourceLines, readerText } from "./ledger.ts";

export type LeadVariantT = NonNullable<DraftOutput["leads"]>[number];

/** Sections in the spec's reading order; sections the spec does not list keep their given order at the end. */
export function orderSections(spec: FormatSpec, sections: Section[]): Section[] {
  const rank = new Map(spec.sections.map((s, i) => [s.id, i]));
  return [...sections].sort((a, b) => {
    const ra = rank.get(a.section_id);
    const rb = rank.get(b.section_id);
    if (ra === undefined && rb === undefined) return 0;
    if (ra === undefined) return 1;
    if (rb === undefined) return -1;
    return ra - rb;
  });
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

export function assembleDraft(input: AssembleInput): DraftOutput {
  const sections = input.keepOrder ? input.sections : orderSections(input.spec, input.sections);
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
