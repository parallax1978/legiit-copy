/**
 * Step 9, revise. Changes only referenced blocks and honors DO NOT TOUCH; applies factual rewrites; fixes Tier 0/1
 * tells. The model's revision is reconciled in code: unreferenced edits are reverted, the section set must be
 * unchanged, DO NOT TOUCH quotes must survive verbatim (a violation fails the step), ledger ids must exist.
 */
import type { StepFn } from "./types.ts";
import { ColdRead, EditorialVerdict, FactualOutput, MechanicalReport, RevisionOutput } from "../schemas/review.ts";
import { revisePrompt, type ReviseArgs } from "../prompts/revise.v17.ts";
import { knownClaimIds, normalizeQuote, sectionsText, unknownLedgerRefs, usableClaims } from "../draft/ledger.ts";
import { pendingFactualFlags, reconcileRevision, revisionQuotes } from "../draft/review.ts";
import { assembleDraft, toDraftEffect } from "../draft/assemble.ts";
import { leadSectionId } from "../draft/plan.ts";
import { callStep, latestDraftOutput, stepOutput } from "../draft/step_util.ts";
import { promiseStems } from "../draft/tell_edit.ts";
import { Candidate } from "../schemas/argument.ts";

export const reviseStep: StepFn = async (ctx) => {
  const spec = ctx.format;
  const draft = latestDraftOutput(ctx);
  const editorial = stepOutput(ctx, "editorial", EditorialVerdict);
  const factual = stepOutput(ctx, "factual", FactualOutput);
  const mechanical = stepOutput(ctx, "mechanical", MechanicalReport);
  const coldRead = stepOutput(ctx, "cold_read", ColdRead);

  // the argument's promise: no factual fix rewrites a line that carries it, and no revision leaves the piece without it
  const angle = Candidate.safeParse(ctx.winningAngle?.candidate);
  const promise = promiseStems(angle.success ? angle.data.promise : null);
  const factualPending = pendingFactualFlags(factual, ctx.claims, promise);
  const tier01 = mechanical?.flags.filter((f) => f.tier <= 1) ?? [];
  const hasWork = (editorial !== null && editorial.verdict !== "APPROVE") || factualPending.length > 0 || (mechanical?.hard_fail ?? false) || tier01.length > 0;
  const doNotTouch = editorial?.do_not_touch ?? [];

  if (!hasWork) {
    const summary = "Nothing to revise: the verdict is APPROVE, no factual flag is pending and no Tier 0/1 tell remains";
    await ctx.progress(summary);
    return { output: RevisionOutput.parse({ sections: draft.sections, changes: [], untouched_confirmed: doNotTouch }), summary };
  }

  const cycle = ctx.revisionCycles + 1;
  const quotes = revisionQuotes({ editorial, factual: factualPending, mechanical, coldRead });
  const known = knownClaimIds(usableClaims(ctx.claims)); // a dropped row may not be cited by the revision either
  await ctx.progress(`Revision ${cycle}: ${editorial?.one_thing ? "the one thing, " : ""}${factualPending.length} factual rewrite(s), ${tier01.length} Tier 0/1 tell(s), ${doNotTouch.length} DO NOT TOUCH line(s)`);

  const args: ReviseArgs = { draft, editorial, factual: factualPending, mechanical, coldRead, cycle, retryNote: null };
  const run = async (retryNote: string | null) => {
    const res = await callStep(ctx, "revise", revisePrompt, { ...args, retryNote }, RevisionOutput, `revise ${cycle}${retryNote ? " (retry)" : ""}`);
    const rec = reconcileRevision(draft.sections, res.output, quotes, doNotTouch, promise, { productName: ctx.brief?.product_name ?? ctx.offer?.name ?? null });
    const unknown = unknownLedgerRefs(rec.sections, known);
    return { res, rec, unknown };
  };

  let r = await run(null);
  if (!r.rec.doNotTouch.ok || r.unknown.length || r.rec.sentencesLost.length || r.rec.productKept.length) {
    // one retry with the desk's findings; a second miss keeps the reverted blocks (fix lost) and the pipeline goes on
    const note = [
      ...r.rec.doNotTouch.violated.map((q) => `This DO NOT TOUCH line changed or disappeared; return it exactly: "${q}"`),
      ...(r.unknown.length ? [`These ledger ids do not exist or were dropped by the user: ${r.unknown.join(", ")}. Use only ids shown in the ledger; cut the claim otherwise.`] : []),
      ...r.rec.sentencesLost.map((x) => `In block ${x.block} you changed or cut sentences no note quotes, so the desk reverted the whole block and your fix with it. Change only the quoted sentence and return these exactly as they were: ${x.lost.map((q) => `"${q}"`).join(" ")}`),
      ...r.rec.productKept.map((b) => `Block ${b} introduces the product by name (rule 38); your revision left the piece with no line that names it, so the desk kept the block as written. Keep the introduction and change only what the note quotes.`),
    ].join("\n");
    r = await run(note);
  }
  if (!r.rec.doNotTouch.ok) {
    throw new Error(`revise step violated DO NOT TOUCH: ${r.rec.doNotTouch.violated.map((q) => `"${q}"`).join("; ")}`);
  }
  if (r.unknown.length) throw new Error(`revision cites ledger ids that do not exist or were dropped by the user: ${r.unknown.join(", ")}`);

  const { res, rec } = r;
  const changedSet = new Set([...rec.changed, ...rec.added, ...rec.removed]);
  if (changedSet.size === 0) {
    const summary = `Revision ${cycle} changed nothing${rec.reverted.length ? ` (${rec.reverted.length} unreferenced edit(s) reverted)` : ""}; no new draft version written`;
    await ctx.progress(summary);
    return { output: RevisionOutput.parse({ sections: rec.sections, changes: [], untouched_confirmed: doNotTouch }), model: res.model, summary };
  }

  // keep the chosen lead variant in step with its revised section
  const leadId = leadSectionId(spec);
  let leads = draft.leads;
  if (leads && draft.chosen_lead_id && leadId && rec.sections.some((s) => s.section_id === leadId)) {
    const revisedLead = rec.sections.find((s) => s.section_id === leadId)!;
    leads = leads.map((l) => (l.id === draft.chosen_lead_id ? { ...l, blocks: revisedLead.blocks } : l));
  }
  const after = normalizeQuote(sectionsText(rec.sections));
  const carried = draft.needs_source.filter((n) => after.includes(normalizeQuote(n)));
  const revised = assembleDraft({ spec, sections: rec.sections, leads, chosenLeadId: draft.chosen_lead_id, needsSource: carried, keepOrder: true });

  const output = RevisionOutput.parse({
    sections: revised.sections,
    changes: res.output.changes.filter((c) => changedSet.has(c.block_id)),
    untouched_confirmed: doNotTouch.filter((q) => !rec.doNotTouch.unverifiable.includes(q)),
  });
  const summary = `Revision ${cycle}: ${rec.changed.length} block(s) changed, ${rec.added.length} added, ${rec.removed.length} removed${rec.reverted.length ? `, ${rec.reverted.length} edit(s) reverted` : ""}${rec.admissions.length ? ` (${rec.admissions.length} for a weakening admission)` : ""}${rec.promiseKept.length ? ` (${rec.promiseKept.length} kept the promise)` : ""}; ${output.untouched_confirmed.length} DO NOT TOUCH line(s) verified${rec.doNotTouch.unverifiable.length ? ` (${rec.doNotTouch.unverifiable.length} quote(s) never appeared in the draft)` : ""}`;
  await ctx.progress(summary);
  return { output, model: res.model, summary, effects: { newDraft: toDraftEffect(revised, "revise", `revise ${cycle}`) } };
};
