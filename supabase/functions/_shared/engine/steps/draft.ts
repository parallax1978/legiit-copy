/**
 * Step 4, draft. Section by section in the standard's order (offer block and close first, body, three leads,
 * headline last), each call within the decided argument, the approved offer and the claims ledger.
 * Pre-draft interrogation happens in code: no argument, no proof on the winner or unknown awareness → pause.
 */
import { z } from "zod";
import type { StepFn } from "./types.ts";
import { DraftOutput, LeadVariant, Section, SectionDraft } from "../schemas/draft.ts";
import type { LeadType } from "../schemas/common.ts";
import { ArgumentOutput } from "../schemas/argument.ts";
import { retrieve, formatExamplesForPrompt } from "../retrieval.ts";
import { draftPrompt, type DraftArgs } from "../prompts/draft.v1.ts";
import { describePlan, planDraft, type DraftCall } from "../draft/plan.ts";
import { SEQUENCE_ROLES, sectionBaseId } from "../formats/index.ts";
import { evaluateGates } from "../tells.ts";
import { parseOptions } from "../draft/options.ts";
import { interrogate, knownClaimIds, targetAwareness, unknownLedgerRefs, usableClaims } from "../draft/ledger.ts";
import { LEAD_IDS, leadTypesForAwareness } from "../draft/leads.ts";
import { assembleDraft, orderSections, provisionalLeadSection, toDraftEffect, type LeadVariantT } from "../draft/assemble.ts";
import { callStep, describeArgument, stepOutput } from "../draft/step_util.ts";

/** Several sections in one call (small sections grouped). */
export const SectionGroupDraft = z.object({ sections: z.array(Section), ledger_refs_used: z.array(z.string()), needs_source: z.array(z.string()) });
/** Three leads in one call. */
export const LeadsDraft = z.object({ leads: z.array(LeadVariant), ledger_refs_used: z.array(z.string()), needs_source: z.array(z.string()) });

/** Block ids are "<section_id>-<n>"; the desk numbers them, not the model. */
export function normalizeSection(section: Section, sectionId: string, meta: Record<string, string> | null = null): Section {
  return {
    section_id: sectionId,
    title: section.title,
    blocks: section.blocks.map((b, i) => ({ ...b, id: `${sectionId}-${i + 1}`, items: b.type === "bullets" || b.type === "numbered" ? b.items ?? [] : b.items ?? null, meta: meta ? { ...(b.meta ?? {}), ...meta } : b.meta ?? null })),
  };
}

/**
 * Map returned sections onto the requested units, in the requested order. Exact ids first; then base ids when the
 * model dropped the `#n` item suffix and the call holds each base once; else by position. Null when the count is wrong.
 */
export function matchSections(returned: Section[], call: DraftCall): Section[] | null {
  const wanted = call.units.map((u) => u.id);
  if (returned.length !== wanted.length) return null;
  const byId = new Map(returned.map((s) => [s.section_id, s]));
  let ordered: Section[];
  if (wanted.every((id) => byId.has(id))) ordered = wanted.map((id) => byId.get(id)!);
  else {
    const bases = call.units.map((u) => u.baseId);
    const byBase = new Map(returned.map((s) => [sectionBaseId(s.section_id), s]));
    const uniqueBases = new Set(bases).size === bases.length && byBase.size === returned.length && bases.every((b) => byBase.has(b));
    ordered = uniqueBases ? bases.map((b) => byBase.get(b)!) : returned; // ids differ but the count matches: assign by position
  }
  return ordered.map((s, i) => {
    const u = call.units[i];
    const meta = u.item ? { item: String(u.item.index), ...(u.item.role ? { role: u.item.role } : {}) } : null;
    return normalizeSection(s, u.id, meta);
  });
}

export function validateSections(sections: Section[], call: DraftCall, known: Set<string>): string[] {
  const problems: string[] = [];
  const unknown = unknownLedgerRefs(sections, known);
  if (unknown.length) problems.push(`these ledger ids do not exist in the ledger or were dropped by the user: ${unknown.join(", ")}. Cite only ids shown in the CLAIMS LEDGER, or write [[NEEDS SOURCE]].`);
  for (const [i, s] of sections.entries()) {
    const u = call.units[i];
    if (s.blocks.length === 0 && !(u.spec?.optional)) problems.push(`section "${u.id}" came back empty; it is required.`);
    const allowed = u.spec?.block_types;
    if (allowed?.length) {
      const bad = s.blocks.filter((b) => !allowed.includes(b.type)).map((b) => `${b.id}:${b.type}`);
      if (bad.length) problems.push(`section "${u.id}" uses block types it does not allow (${bad.join(", ")}); allowed: ${allowed.join(", ")}.`);
    }
  }
  return problems;
}

export function normalizeLeads(leads: z.infer<typeof LeadVariant>[], types: LeadType[]): LeadVariantT[] {
  return leads.slice(0, 3).map((l, i) => ({
    id: LEAD_IDS[i],
    lead_type: types.includes(l.lead_type) ? l.lead_type : types[i],
    reader_hypothesis: l.reader_hypothesis,
    blocks: normalizeSection({ section_id: LEAD_IDS[i], title: null, blocks: l.blocks }, LEAD_IDS[i]).blocks,
  }));
}

export function validateLeads(leads: LeadVariantT[], types: LeadType[], known: Set<string>): string[] {
  const problems: string[] = [];
  if (leads.length !== 3) problems.push(`three leads are required; ${leads.length} came back.`);
  const seen = new Set(leads.map((l) => l.lead_type));
  if (seen.size !== leads.length) problems.push(`the leads must be of different types; assigned: ${types.join(", ")}.`);
  for (const l of leads) if (l.blocks.length === 0) problems.push(`lead ${l.id} has no blocks.`);
  const unknown = unknownLedgerRefs(leads.map((l) => ({ section_id: l.id, title: null, blocks: l.blocks })), known);
  if (unknown.length) problems.push(`these ledger ids do not exist in the ledger or were dropped by the user: ${unknown.join(", ")}. Cite only ids shown in the CLAIMS LEDGER, or write [[NEEDS SOURCE]].`);
  return problems;
}

export const draftStep: StepFn = async (ctx) => {
  const spec = ctx.format;
  const options = parseOptions(ctx.generation.options);
  const target = targetAwareness(ctx.dossier, options);
  const argOut = stepOutput(ctx, "argument", ArgumentOutput);
  // rows the user dropped never reach the writer; a citation of one is rejected like an invented id
  const known = knownClaimIds(usableClaims(ctx.claims));

  // (1) pre-draft interrogation, in code
  const q = interrogate({
    winner: ctx.winningAngle ? { candidate: ctx.winningAngle.candidate, thesis: ctx.winningAngle.thesis } : null,
    thesisFallback: argOut?.thesis ?? null,
    awareness: target.awareness,
    segment: target.segment,
    usableClaimIds: known,
  });
  if (!q.ok) {
    await ctx.progress(`Drafting blocked: ${q.reason}`);
    return { output: { paused: true, reason: q.reason }, summary: `Drafting blocked: ${q.reason}`, pause: { reason: q.reason } };
  }

  // email sequences take their item roles from the sequence type; other multi-item formats from the spec
  const seqType = options.sequence_type && options.sequence_type in SEQUENCE_ROLES ? (options.sequence_type as keyof typeof SEQUENCE_ROLES) : null;
  const roles = spec.id === "email_sequence" ? SEQUENCE_ROLES[seqType ?? "welcome"] : undefined;
  const plan = planDraft(spec, { itemCount: options.item_count, roles });
  await ctx.progress(`Drafting ${spec.name} in ${plan.calls.length} call${plan.calls.length === 1 ? "" : "s"}: ${describePlan(plan).join("; ")}`);

  let examplesText = "";
  try {
    const r = await retrieve(ctx.db, { format: spec.id, queryText: `${q.thesis}\n${ctx.brief?.one_line ?? ctx.offer.name}` });
    examplesText = formatExamplesForPrompt(r.examples, r.critiques);
  } catch (e) {
    console.warn("retrieval skipped:", e instanceof Error ? e.message : e);
  }

  const leadTypes = plan.leadSectionId ? leadTypesForAwareness(target.awareness, options.skeptical) : null;
  const argumentText = describeArgument(ctx.winningAngle, ctx.angles);
  const sophistication = ctx.dossier?.sophistication.stage ?? "unknown";
  const drafted: Section[] = [];
  const needsSource: string[] = [];
  let leads: LeadVariantT[] | null = null;
  let model: string | undefined;
  let calls = 0;

  const baseArgs = (call: DraftCall, i: number): DraftArgs => ({
    call,
    callIndex: i + 1,
    callTotal: plan.calls.length,
    awareness: target.awareness,
    segment: target.segment,
    sophistication,
    thesis: q.thesis,
    argumentText,
    drafted: orderSections(spec, drafted),
    leads: call.kind === "headline" ? leads : null,
    leadTypes: call.kind === "leads" ? leadTypes : null,
    examplesText,
    retryNote: null,
  });

  /** One sections call with one retry on a code-side rejection (wrong shape, unknown ledger id, empty required section, disallowed block type). */
  const runSections = async (call: DraftCall, i: number, extraNote: string | null): Promise<{ sections: Section[]; needs: string[] }> => {
    const args = baseArgs(call, i);
    const single = call.units.length === 1;
    let attempt = 0;
    let note: string | null = extraNote;
    for (;;) {
      const res = single
        ? await callStep(ctx, "draft", draftPrompt, { ...args, retryNote: note }, SectionDraft, `draft ${call.units[0].id}${attempt ? " (retry)" : ""}`)
        : await callStep(ctx, "draft", draftPrompt, { ...args, retryNote: note }, SectionGroupDraft, `draft ${call.units.map((u) => u.id).join("+")}${attempt ? " (retry)" : ""}`);
      calls++;
      model = res.model;
      const returned = "section" in res.output ? [res.output.section] : res.output.sections;
      const matched = matchSections(returned, call);
      const problems = matched ? validateSections(matched, call, known) : [`return exactly ${call.units.length} section(s) with section_id ${call.units.map((u) => `"${u.id}"`).join(", ")}.`];
      if (matched && problems.length === 0) return { sections: matched, needs: res.output.needs_source };
      if (attempt++ >= 1) throw new Error(`draft call for ${call.units.map((u) => u.id).join(", ")} rejected twice: ${problems.join(" ")}`);
      note = [extraNote, ...problems].filter(Boolean).join("\n");
    }
  };

  for (const [i, call] of plan.calls.entries()) {
    const label = call.kind === "leads" ? "three leads" : call.units.map((u) => u.title).join(", ");
    await ctx.progress(`Drafting ${label} (${i + 1}/${plan.calls.length})`);
    const args = baseArgs(call, i);

    if (call.kind === "leads") {
      let attempt = 0;
      let note: string | null = null;
      for (;;) {
        const res = await callStep(ctx, "draft", draftPrompt, { ...args, retryNote: note }, LeadsDraft, `draft leads${attempt ? " (retry)" : ""}`);
        calls++;
        model = res.model;
        const normalized = normalizeLeads(res.output.leads, leadTypes!);
        const problems = validateLeads(normalized, leadTypes!, known);
        if (problems.length === 0) {
          leads = normalized;
          needsSource.push(...res.output.needs_source);
          break;
        }
        if (attempt++ >= 1) throw new Error(`leads rejected twice: ${problems.join(" ")}`);
        note = problems.join("\n");
      }
      continue;
    }

    const r = await runSections(call, i, null);
    drafted.push(...r.sections);
    needsSource.push(...r.needs);
  }

  // single-call formats (ads, SMS, RSA, short emails): run the format's hard gates now and give the writer one shot at them
  if (plan.calls.length === 1 && plan.calls[0].kind === "sections") {
    let failures: string[] = [];
    try {
      failures = evaluateGates(orderSections(spec, drafted), spec).failures;
    } catch (e) {
      console.warn("hard gates skipped:", e instanceof Error ? e.message : e);
    }
    if (failures.length) {
      await ctx.progress(`Hard gates failed (${failures.join("; ")}); redrafting once`);
      const r = await runSections(plan.calls[0], 0, `The format's machine-checked hard gates failed on your draft: ${failures.join("; ")}. Fix exactly these and return the whole draft again.`);
      drafted.splice(0, drafted.length, ...r.sections);
      needsSource.splice(0, needsSource.length, ...r.needs);
    }
  }

  // (5) assemble: the lead section holds the first variant until the cold read picks
  if (leads && plan.leadSectionId) {
    const leadSpec = spec.sections.find((s) => s.id === plan.leadSectionId);
    drafted.push(provisionalLeadSection(plan.leadSectionId, leadSpec?.name ?? null, leads));
  }
  const draft = assembleDraft({ spec, sections: drafted, leads, chosenLeadId: null, needsSource });
  DraftOutput.parse(draft);

  const summary = `Drafted ${draft.word_count} words in ${calls} call${calls === 1 ? "" : "s"}${plan.shape.kind !== "none" ? ` (${plan.itemCount} ${spec.multi_item?.item_name ?? "item"}${plan.itemCount === 1 ? "" : "s"})` : ""}${leads ? `, three leads (${leads.map((l) => l.lead_type).join(", ")}) awaiting the cold read` : ""}; ${draft.ledger_refs_used.length} ledger rows cited; ${draft.needs_source.length} NEEDS SOURCE`;
  await ctx.progress(summary);
  return { output: draft, model, summary, effects: { newDraft: toDraftEffect(draft, "system", "draft") } };
};
