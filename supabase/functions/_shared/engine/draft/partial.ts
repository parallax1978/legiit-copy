/**
 * Resumable drafting state. The draft step persists this after every call group (ctx.savePartial) and, when its
 * wall-clock budget is spent, returns it as the attempt output with `continueLater`; the next invocation restores it
 * and skips the groups already done. A partial is only reused for the same format and the same plan fingerprint.
 */
import { z } from "zod";
import { FormatId } from "../schemas/common.ts";
import { LeadVariant, Section } from "../schemas/draft.ts";
import type { FormatSpec } from "../formats/spec.ts";
import type { DraftPlan } from "./plan.ts";
import type { LeadVariantT } from "./assemble.ts";
import { collectLedgerRefs } from "./ledger.ts";

export const DRAFT_PARTIAL_VERSION = 1 as const;

export const CompletedGroup = z.object({
  index: z.number().int().min(0),
  kind: z.enum(["sections", "leads", "headline"]),
  unit_ids: z.array(z.string()),
  sections: z.array(Section),
  leads: z.array(LeadVariant).nullable(),
  needs_source: z.array(z.string()),
  model: z.string().nullable(),
  calls_made: z.number().int().min(0),
});
export type CompletedGroup = z.infer<typeof CompletedGroup>;

export const DraftPartial = z.object({
  kind: z.literal("draft_partial"),
  version: z.literal(DRAFT_PARTIAL_VERSION),
  format: FormatId,
  plan_fingerprint: z.string(),
  call_total: z.number().int().min(1),
  completed: z.array(CompletedGroup),
  ledger_refs: z.array(z.string()),
  needs_source: z.array(z.string()),
  calls_made: z.number().int().min(0),
});
export type DraftPartial = z.infer<typeof DraftPartial>;

/** Stable identity of a plan: format, item count and every call's kind and unit ids in order. */
export function planFingerprint(spec: FormatSpec, plan: DraftPlan): string {
  return `${spec.id}|${plan.shape.kind}:${plan.itemCount}|${plan.calls.map((c) => `${c.kind}=${c.units.map((u) => u.id).join(",")}`).join(";")}`;
}

export function emptyPartial(spec: FormatSpec, plan: DraftPlan): DraftPartial {
  return { kind: "draft_partial", version: DRAFT_PARTIAL_VERSION, format: spec.id, plan_fingerprint: planFingerprint(spec, plan), call_total: plan.calls.length, completed: [], ledger_refs: [], needs_source: [], calls_made: 0 };
}

/** The saved partial when it belongs to this format and this exact plan; null otherwise (start over). */
export function resumePartial(raw: unknown, spec: FormatSpec, plan: DraftPlan): DraftPartial | null {
  if (raw === null || raw === undefined) return null;
  const r = DraftPartial.safeParse(raw);
  if (!r.success) return null;
  if (r.data.format !== spec.id || r.data.plan_fingerprint !== planFingerprint(spec, plan) || r.data.call_total !== plan.calls.length) return null;
  return r.data;
}

/** Append a finished group; ledger refs and NEEDS SOURCE are recomputed over everything done so far. */
export function withGroup(partial: DraftPartial, group: CompletedGroup): DraftPartial {
  const completed = [...partial.completed.filter((g) => g.index !== group.index), group].sort((a, b) => a.index - b.index);
  const allSections: Section[] = [...completed.flatMap((g) => g.sections), ...completed.flatMap((g) => (g.leads ?? []).map((l) => ({ section_id: l.id, title: null, blocks: l.blocks })))];
  const needs: string[] = [];
  for (const n of completed.flatMap((g) => g.needs_source)) if (!needs.some((x) => x.toLowerCase() === n.toLowerCase())) needs.push(n);
  return { ...partial, completed, ledger_refs: collectLedgerRefs(allSections), needs_source: needs, calls_made: completed.reduce((n, g) => n + g.calls_made, 0) };
}

export interface RestoredState {
  drafted: Section[];
  leads: LeadVariantT[] | null;
  needsSource: string[];
  done: Set<number>;
  model: string | undefined;
  callsMade: number;
}

/** What the step needs in memory to continue from a partial. */
export function restoreState(partial: DraftPartial): RestoredState {
  const drafted: Section[] = [];
  let leads: LeadVariantT[] | null = null;
  let model: string | undefined;
  for (const g of partial.completed) {
    drafted.push(...g.sections);
    if (g.leads) leads = g.leads;
    if (g.model) model = g.model;
  }
  return { drafted, leads, needsSource: [...partial.needs_source], done: new Set(partial.completed.map((g) => g.index)), model, callsMade: partial.calls_made };
}
