/**
 * Section planning for the draft step. Pure: a FormatSpec in, a call plan out.
 *
 * Rules encoded here (docs/04-copy-standard.md §1 rule 29, docs/01-architecture.md §4 step 4):
 * - Sections are drafted in spec.draft_order (offer block and close first, body, leads, headline last).
 * - Each call drafts one group of consecutive units. Small units are grouped while the sum of their band maximums
 *   stays under GROUP_SOFT_LIMIT_WORDS; a group may absorb one more unit when the total stays within GROUP_OVERFLOW
 *   of the soft limit, so a 150-word P.S. never costs its own call. A unit over the soft limit is drafted alone.
 * - When spec.lead_variants === 3 and the spec has a lead section (spec.lead_section_id, else id "lead", else a name
 *   containing "lead"), that section leaves the normal order and becomes a "leads" call that writes three leads of
 *   different type; the headline section is written after the leads in its own call. Formats with lead_variants 3
 *   and no such section draft their opening once, in order.
 *
 * Multi-item formats follow the convention in formats/index.ts: a repeated section carries the item index as a
 * `#n` suffix on its id (`subject#3`, `primary_text#2`, `replay_email#5`); unsuffixed sections are item 0. The item
 * shape is derived from the spec:
 * - "repeat_all": every section repeats per item (email_sequence, meta_ad). Items are drafted in order, one call
 *   per item unless several items fit one call.
 * - "repeat_section": the spec's sections are the assets and only the last role's section repeats, as many times
 *   as the item count needs beyond the fixed assets (webinar_package: replay_email ×5-7).
 * - "blocks": the items are blocks inside unsuffixed sections (google_rsa: 15 headline blocks, 4 descriptions);
 *   the plan is the plain section plan and the hard gates count the blocks.
 */
import type { FormatSpec, SectionSpec } from "../formats/spec.ts";

export const GROUP_SOFT_LIMIT_WORDS = 1200;
export const GROUP_OVERFLOW = 0.15;

export interface DraftUnit {
  /** section_id the model must use (`base#n` for a repeated section) */
  id: string;
  /** the spec section id without the item suffix */
  baseId: string;
  title: string;
  minWords: number;
  maxWords: number;
  spec: SectionSpec;
  /** set for a repeated section */
  item: { index: number; role: string | null; name: string; count: number } | null;
}

export interface DraftCall {
  kind: "sections" | "leads" | "headline";
  units: DraftUnit[];
  /** sum of band maximums; the prompt's length budget */
  maxWords: number;
}

export type ItemShape = { kind: "none" } | { kind: "repeat_all" } | { kind: "repeat_section"; sectionId: string; fixedAssets: number } | { kind: "blocks" };

export interface DraftPlan {
  calls: DraftCall[];
  leadSectionId: string | null;
  headlineSectionId: string | null;
  shape: ItemShape;
  /** items drafted (repeat_all: items; repeat_section: repeats of the repeating section; otherwise 1) */
  itemCount: number;
}

export function leadSectionId(spec: FormatSpec): string | null {
  if (spec.lead_section_id && spec.sections.some((s) => s.id === spec.lead_section_id)) return spec.lead_section_id;
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

export function sectionUnit(s: SectionSpec, item: DraftUnit["item"] = null): DraftUnit {
  const id = item ? `${s.id}#${item.index}` : s.id;
  return { id, baseId: s.id, title: item ? `${s.name} (${item.name} ${item.index}${item.role ? `: ${item.role}` : ""})` : s.name, minWords: s.band_words[0], maxWords: s.band_words[1], spec: s, item };
}

/** How the items of a multi-item format map onto sections (see the file comment). */
export function itemShape(spec: FormatSpec): ItemShape {
  const mi = spec.multi_item;
  if (!mi) return { kind: "none" };
  const roles = mi.item_roles ?? [];
  const sectionIds = new Set(spec.sections.map((s) => s.id));
  const namesSections = roles.some((r) => sectionIds.has(r));
  if (namesSections) {
    const last = roles[roles.length - 1];
    if (sectionIds.has(last)) return { kind: "repeat_section", sectionId: last, fixedAssets: roles.length - 1 };
  }
  const minWordsPerItem = spec.sections.reduce((n, s) => n + s.band_words[0], 0);
  if (!roles.some((r) => r.includes(":")) && mi.min * Math.max(1, minWordsPerItem) > spec.length_band_words[1]) return { kind: "blocks" };
  return { kind: "repeat_all" };
}

/** Clamp the requested item count into the spec's range; the default is the role list's length, else the minimum. */
export function itemCount(spec: FormatSpec, requested?: number, roles?: string[]): number {
  const mi = spec.multi_item;
  if (!mi) return 1;
  const shape = itemShape(spec);
  if (shape.kind === "blocks") return 1;
  const def = roles?.length ?? (mi.item_roles && !mi.item_roles.some((r) => r.includes(":")) && shape.kind === "repeat_all" ? mi.item_roles.length : mi.min);
  return Math.max(mi.min, Math.min(mi.max, requested ?? def));
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

function orderedSections(spec: FormatSpec): SectionSpec[] {
  const byId = new Map(spec.sections.map((s) => [s.id, s]));
  const order = spec.draft_order.length ? spec.draft_order : spec.sections.map((s) => s.id);
  const listed = new Set(order);
  return [...order.filter((id) => byId.has(id)).map((id) => byId.get(id)!), ...spec.sections.filter((s) => !listed.has(s.id))];
}

const toCalls = (groups: DraftUnit[][]): DraftCall[] => groups.map((g) => ({ kind: "sections", units: g, maxWords: g.reduce((a, u) => a + u.maxWords, 0) }));

export interface PlanOptions {
  itemCount?: number;
  /** role per item index (1-based order), e.g. SEQUENCE_ROLES[type] for an email sequence */
  roles?: string[];
}

export function planDraft(spec: FormatSpec, opts: PlanOptions = {}): DraftPlan {
  const shape = itemShape(spec);
  const sections = orderedSections(spec);
  const mi = spec.multi_item;

  if (shape.kind === "repeat_all" && mi) {
    const n = itemCount(spec, opts.itemCount, opts.roles);
    const plainRoles = opts.roles ?? (mi.item_roles && !mi.item_roles.some((r) => r.includes(":")) ? mi.item_roles : []);
    const units: DraftUnit[] = [];
    for (let i = 1; i <= n; i++) {
      const item = { index: i, role: plainRoles[i - 1] ?? null, name: mi.item_name, count: n };
      for (const s of sections) units.push(sectionUnit(s, item));
    }
    // never split an item across calls: group whole items by their summed band
    const perItem = sections.reduce((a, s) => a + s.band_words[1], 0);
    const itemBlocks: DraftUnit[] = [];
    for (let i = 1; i <= n; i++) itemBlocks.push({ ...units[(i - 1) * sections.length], maxWords: perItem });
    const groups = groupUnits(itemBlocks).map((g) => g.flatMap((u) => units.filter((x) => x.item?.index === u.item?.index)));
    return { calls: toCalls(groups), leadSectionId: null, headlineSectionId: null, shape, itemCount: n };
  }

  let repeats = 1;
  let expanded: DraftUnit[] = sections.map((s) => sectionUnit(s));
  if (shape.kind === "repeat_section" && mi) {
    const total = Math.max(mi.min, Math.min(mi.max, opts.itemCount ?? mi.min));
    repeats = Math.max(1, total - shape.fixedAssets);
    expanded = sections.flatMap((s) => (s.id === shape.sectionId ? Array.from({ length: repeats }, (_, i) => sectionUnit(s, { index: i + 1, role: opts.roles?.[i] ?? shape.sectionId, name: mi.item_name, count: repeats })) : [sectionUnit(s)]));
  }

  const withLeads = spec.lead_variants === 3;
  const leadId = withLeads ? leadSectionId(spec) : null;
  const headId = withLeads && leadId ? headlineSectionId(spec) : null;
  const normal = expanded.filter((u) => u.id !== leadId && u.id !== headId);
  const calls = toCalls(groupUnits(normal));
  if (leadId) {
    const u = sectionUnit(spec.sections.find((s) => s.id === leadId)!);
    calls.push({ kind: "leads", units: [u], maxWords: u.maxWords * 3 });
  }
  if (headId) {
    const u = sectionUnit(spec.sections.find((s) => s.id === headId)!);
    calls.push({ kind: "headline", units: [u], maxWords: u.maxWords });
  }
  return { calls, leadSectionId: leadId, headlineSectionId: headId, shape, itemCount: shape.kind === "repeat_section" ? repeats : 1 };
}

/** One line per call, for the CLI and the progress timeline. */
export function describePlan(plan: DraftPlan): string[] {
  return plan.calls.map((c, i) => `${i + 1}. ${c.kind}: ${c.units.map((u) => u.id).join(", ")} (≤${c.maxWords} words${c.kind === "leads" ? ", three variants" : ""})`);
}
