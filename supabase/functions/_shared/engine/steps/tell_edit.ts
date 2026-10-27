/**
 * Step 4b, the tell edit (docs/04-copy-standard.md §7.1): the owner's editor. It runs on every draft and every
 * revision, before the cold read. One model call per group (a short piece is one group) returns line edits that
 * remove the owner's tells and words; code applies them behind guards (ledger tags, numbers, quotes, links and
 * NEEDS SOURCE marks kept exactly; length kept close) and rejects the rest. A deterministic backstop then removes
 * any em dash, emoji or hashtag left. A new draft version is written only when the copy changed.
 *
 * Resumable like the draft step: a TellEditPartial is saved after every group, and when the next group would not
 * fit in the invocation the step returns `continueLater`; at least one group runs per invocation.
 */
import type { StepContext, StepResult } from "./types.ts";
import { TellEditCall, TellEditOutput, TellEditPartial } from "../schemas/tell_edit.ts";
import { tellEditPrompt, type TellEditArgs } from "../prompts/tell_edit.v1.ts";
import { exemptTermsFrom } from "../tells.ts";
import { applyEdits, backstopUnits, editableUnits, groupUnits, ownerTellCount, rebuildDraft, unitFindings, type EditUnit } from "../draft/tell_edit.ts";
import { toDraftEffect } from "../draft/assemble.ts";
import { callStep, latestDraftOutput } from "../draft/step_util.ts";

/** Wall-clock estimate for one tell edit call; the budget check uses it for the next group. */
export const TELL_EDIT_CALL_ESTIMATE_MS = 90_000;
/** The "what changed" list stays as short as the owner's editor keeps it: three to six lines. */
const MAX_LIST = 6;

type Applied = TellEditOutput["edits"][number];
type Rejected = TellEditOutput["rejected"][number];

function restore(ctx: StepContext, version: number, units: EditUnit[]): TellEditPartial | null {
  const p = TellEditPartial.safeParse(ctx.partial);
  if (!p.success) return null;
  const same = p.data.draft_version === version && p.data.unit_refs.length === units.length && p.data.unit_refs.every((r, i) => r === units[i].ref);
  return same ? p.data : null;
}

function dedupe(lines: string[]): string[] {
  const out: string[] = [];
  for (const l of lines.map((x) => x.trim()).filter(Boolean)) if (!out.some((o) => o.toLowerCase() === l.toLowerCase())) out.push(l);
  return out;
}

export async function runTellEdit(ctx: StepContext, deps: { call: typeof callStep; now?: () => number }): Promise<StepResult<TellEditOutput | TellEditPartial>> {
  const now = deps.now ?? Date.now;
  const spec = ctx.format;
  const source = latestDraftOutput(ctx);
  const version = ctx.latestDraft!.version;
  const exemptTerms = exemptTermsFrom(ctx.offer.name, ctx.brief?.product_name);
  const before = ownerTellCount(source, spec, exemptTerms);

  const original = editableUnits(source, spec);
  const groups = groupUnits(original);
  const resumed = restore(ctx, version, original);
  let units: EditUnit[] = resumed ? original.map((u, i) => ({ ...u, text: resumed.texts[i] })) : original;
  const done = new Set(resumed?.groups_done ?? []);
  const applied: Applied[] = [...(resumed?.edits ?? [])];
  const rejected: Rejected[] = [...(resumed?.rejected ?? [])];
  const whatChanged: string[] = [...(resumed?.what_changed ?? [])];
  let alreadyClean = resumed?.already_clean ?? true;
  let model: string | undefined;
  let groupsThisInvocation = 0;

  const partial = (): TellEditPartial => ({
    kind: "tell_edit_partial",
    draft_version: version,
    unit_refs: original.map((u) => u.ref),
    texts: units.map((u) => u.text),
    groups_done: Array.from(done).sort((a, b) => a - b),
    what_changed: whatChanged,
    edits: applied,
    rejected,
    already_clean: alreadyClean,
  });

  for (let gi = 0; gi < groups.length; gi++) {
    if (done.has(gi)) continue;
    const elapsed = now() - ctx.startedAt;
    if (groupsThisInvocation > 0 && elapsed + TELL_EDIT_CALL_ESTIMATE_MS > ctx.timeBudgetMs) {
      const reason = `${done.size}/${groups.length} parts edited`;
      await ctx.progress(`Removing AI tells continues in the next invocation (${reason})`);
      return { output: partial(), model, summary: "tell edit continues", continueLater: { reason } };
    }
    await ctx.progress(groups.length > 1 ? `Removing AI tells (part ${gi + 1} of ${groups.length})` : "Removing AI tells");

    const refs = new Set(groups[gi].map((u) => u.ref));
    const mine = () => units.filter((u) => refs.has(u.ref));
    const args: TellEditArgs = {
      draft: source,
      units: mine(),
      findings: unitFindings(mine(), spec, exemptTerms),
      exemptTerms,
      groupIndex: gi,
      groupTotal: groups.length,
      retryNote: null,
    };
    const res = await deps.call(ctx, "tell_edit", tellEditPrompt, args, TellEditCall, `tell edit${groups.length > 1 ? ` ${gi + 1}/${groups.length}` : ""}`);
    model = res.model;
    let r = applyEdits(units, res.output.edits.filter((e) => refs.has(e.ref.trim().replace(/^\[|\]$/g, ""))));
    // edits the guards refused get one more ask, with the reasons, when they were more than a stray
    if (r.rejected.length && r.rejected.length >= Math.max(2, Math.ceil(res.output.edits.length / 3))) {
      const note = `These edits could not be applied:\n${r.rejected.slice(0, 12).map((x) => `- [${x.ref}] "${x.before}" -> "${x.after}": ${x.reason}`).join("\n")}\nReturn edits for the texts as they stand now; copy "before" exactly and keep every ledger tag, number, quote and link.`;
      const retry = await deps.call(ctx, "tell_edit", tellEditPrompt, { ...args, units: r.units.filter((u) => refs.has(u.ref)), findings: unitFindings(r.units.filter((u) => refs.has(u.ref)), spec, exemptTerms), retryNote: note }, TellEditCall, `tell edit${groups.length > 1 ? ` ${gi + 1}/${groups.length}` : ""} (retry)`);
      model = retry.model;
      const again = applyEdits(r.units, retry.output.edits.filter((e) => refs.has(e.ref.trim().replace(/^\[|\]$/g, ""))));
      r = { units: again.units, applied: [...r.applied, ...again.applied], rejected: [...r.rejected, ...again.rejected] };
      whatChanged.push(...retry.output.what_changed);
    }
    units = r.units;
    applied.push(...r.applied.map((e) => ({ ...e, by: "editor" as const })));
    rejected.push(...r.rejected);
    whatChanged.push(...res.output.what_changed);
    alreadyClean = alreadyClean && res.output.already_clean && r.applied.length === 0;
    done.add(gi);
    groupsThisInvocation++;
    await ctx.savePartial(partial());
  }

  const b = backstopUnits(units);
  units = b.units;
  applied.push(...b.edits.map((e) => ({ ...e, by: "backstop" as const })));

  const changed = units.some((u, i) => u.text !== original[i].text);
  const edited = changed ? rebuildDraft(source, units, spec) : source;
  const after = changed ? ownerTellCount(edited, spec, exemptTerms) : before;
  const lines = dedupe(whatChanged).slice(0, MAX_LIST);
  if (b.edits.length && !lines.some((l) => /dash|emoji|hashtag/i.test(l))) lines.push("Removed the em dashes, emojis and hashtags that were left");
  const output = TellEditOutput.parse({
    what_changed: changed ? lines.slice(0, MAX_LIST) : [],
    edits: applied,
    rejected,
    owner_tells_before: before,
    owner_tells_after: after,
    already_clean: !changed && alreadyClean,
    new_version: changed,
  });

  const editorEdits = applied.filter((e) => e.by === "editor").length;
  const summary = changed
    ? `AI tells removed: ${editorEdits} edit${editorEdits === 1 ? "" : "s"}${b.edits.length ? `, ${b.edits.length} fixed in code` : ""}${rejected.length ? `, ${rejected.length} refused by the guards` : ""}; the checker's count went from ${before} to ${after}`
    : `No AI tells to remove${rejected.length ? ` (${rejected.length} edit${rejected.length === 1 ? "" : "s"} refused by the guards)` : ""}; the copy is unchanged`;
  await ctx.progress(summary);
  return { output, model, summary, effects: changed ? { newDraft: toDraftEffect(edited, "revise", "AI tells removed") } : undefined };
}

export const tellEditStep = (ctx: StepContext) => runTellEdit(ctx, { call: callStep });
