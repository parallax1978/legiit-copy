/**
 * Section planning for the draft step. Pure: a FormatSpec in, a call plan out.
 *
 * Rules encoded here (docs/04-copy-standard.md §1 rule 28, docs/01-architecture.md §4 step 4):
 * - Sections are drafted in spec.draft_order (offer block and close first, body, leads, headline last).
 * - Each call drafts one group of consecutive sections. Small sections are grouped while the sum of their
 *   band maximums stays under GROUP_SOFT_LIMIT_WORDS; a group may absorb one more section when the total
 *   stays within GROUP_OVERFLOW of the soft limit, so a 150-word P.S. never costs its own call. A section
 *   whose own band exceeds the soft limit is drafted alone.
 * - When spec.lead_variants === 3 the lead section leaves the normal order and becomes a "leads" call that
 *   writes three leads of different type; the headline section is written after the leads in its own call.
 * - Multi-item formats (sequences, ad sets, webinar packages) treat each item as a unit; the spec's sections
 *   describe the inside of one item. Items are grouped by the same word rule.
 */
import type { FormatSpec, SectionSpec } from "../formats/spec.ts";

export const GROUP_SOFT_LIMIT_WORDS = 1200;
export const GROUP_OVERFLOW = 0.15;

export interface DraftUnit {
  /** section_id the model must use (for items: `${item_name}_${n}`) */
  id: string;
  title: string;
  minWords: number;
  maxWords: number;
  /** the section spec for a plain section; null for a multi-item unit */
  spec: SectionSpec | null;
  /** present for multi-item units */
  item: { index: number; role: string | null; name: string } | null;
}

export interface DraftCall {
  kind: "sections" | "leads" | "headline";
  units: DraftUnit[];
  /** sum of band maximums; the prompt's length budget */
  maxWords: number;
}

export interface DraftPlan {
  calls: DraftCall[];
  leadSectionId: string | null;
  headlineSectionId: string | null;
  multiItem: boolean;
  itemCount: number;
}

export function leadSectionId(spec: FormatSpec): string | null {
  const byId = spec.sections.find((s) => s.id === "lead");
  if (byId) return byId.id;
  const byName = spec.sections.find((s) => /\blead\b/i.test(s.name));
  return byName?.id ?? null;
}

export function headlineSectionId(spec: FormatSpec): string | null {
  const byId = spec.sections.find((s) => s.id === "headline");
  if (byId) return byId.id;
  const byType = spec.sections.find((s) => (s.block_types ?? []).includes("headline"));
  return byType?.id ?? null;
}

export function sectionUnit(s: SectionSpec): DraftUnit {
  return { id: s.id, title: s.name, minWords: s.band_words[0], maxWords: s.band_words[1], spec: s, item: null };
}

/** Clamp the requested item count into the spec's range; default is one per listed role, else the minimum. */
export function itemCount(spec: FormatSpec, requested?: number): number {
  const mi = spec.multi_item;
  if (!mi) return 1;
  const def = mi.item_roles?.length ?? mi.min;
  const n = requested ?? def;
  return Math.max(mi.min, Math.min(mi.max, n));
}

/** Words one item of a multi-item format may run to: the sum of its section bands, else the format band. */
export function itemBand(spec: FormatSpec): [number, number] {
  if (spec.sections.length) {
    return [spec.sections.reduce((n, s) => n + s.band_words[0], 0), spec.sections.reduce((n, s) => n + s.band_words[1], 0)];
  }
  return spec.length_band_words;
}

export function itemUnits(spec: FormatSpec, count: number): DraftUnit[] {
  const mi = spec.multi_item;
  if (!mi) return [];
  const [min, max] = itemBand(spec);
  return Array.from({ length: count }, (_, i) => {
    const role = mi.item_roles?.[i] ?? null;
    return {
      id: `${mi.item_name}_${i + 1}`,
      title: `${mi.item_name} ${i + 1}${role ? ` (${role})` : ""}`,
      minWords: min,
      maxWords: max,
      spec: null,
      item: { index: i + 1, role, name: mi.item_name },
    };
  });
}

/** Greedy consecutive grouping by band maximum. */
export function groupUnits(units: DraftUnit[], soft = GROUP_SOFT_LIMIT_WORDS, overflow = GROUP_OVERFLOW): DraftUnit[][] {
  const hard = Math.round(soft * (1 + overflow));
  const groups: DraftUnit[][] = [];
  let current: DraftUnit[] = [];
  let total = 0;
  for (const u of units) {
    if (current.length === 0) {
      current.push(u);
      total = u.maxWords;
      continue;
    }
    const next = total + u.maxWords;
    if (next < soft || next <= hard) {
      current.push(u);
      total = next;
    } else {
      groups.push(current);
      current = [u];
      total = u.maxWords;
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

export function planDraft(spec: FormatSpec, opts: { itemCount?: number } = {}): DraftPlan {
  if (spec.multi_item) {
    const n = itemCount(spec, opts.itemCount);
    const units = itemUnits(spec, n);
    const calls: DraftCall[] = groupUnits(units).map((g) => ({ kind: "sections", units: g, maxWords: g.reduce((a, u) => a + u.maxWords, 0) }));
    return { calls, leadSectionId: null, headlineSectionId: null, multiItem: true, itemCount: n };
  }

  const byId = new Map(spec.sections.map((s) => [s.id, s]));
  const order = spec.draft_order.length ? spec.draft_order : spec.sections.map((s) => s.id);
  // sections missing from draft_order are drafted after the listed ones, in reading order
  const listed = new Set(order);
  const fullOrder = [...order.filter((id) => byId.has(id)), ...spec.sections.filter((s) => !listed.has(s.id)).map((s) => s.id)];

  const withLeads = spec.lead_variants === 3;
  const leadId = withLeads ? leadSectionId(spec) : null;
  const headId = withLeads ? headlineSectionId(spec) : null;

  const normal = fullOrder.filter((id) => id !== leadId && id !== headId).map((id) => sectionUnit(byId.get(id)!));
  const calls: DraftCall[] = groupUnits(normal).map((g) => ({ kind: "sections", units: g, maxWords: g.reduce((a, u) => a + u.maxWords, 0) }));
  if (leadId) {
    const u = sectionUnit(byId.get(leadId)!);
    calls.push({ kind: "leads", units: [u], maxWords: u.maxWords * 3 });
  }
  if (headId) {
    const u = sectionUnit(byId.get(headId)!);
    calls.push({ kind: "headline", units: [u], maxWords: u.maxWords });
  }
  return { calls, leadSectionId: leadId, headlineSectionId: headId, multiItem: false, itemCount: 1 };
}

/** One line per call, for the CLI and the progress timeline. */
export function describePlan(plan: DraftPlan): string[] {
  return plan.calls.map((c, i) => `${i + 1}. ${c.kind}: ${c.units.map((u) => u.id).join(", ")} (≤${c.maxWords} words${c.kind === "leads" ? ", three variants" : ""})`);
}
