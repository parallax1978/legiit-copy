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
import { applyEdits, backstopUnits, editableUnits, groupUnits, ownerTellCount, rebuildDraft, stripNeverTells, syncChosenLead, unitFindings, type EditUnit, type TellEdit } from "../draft/tell_edit.ts";
import { toDraftEffect } from "../draft/assemble.ts";
import { callStep, latestDraftOutput, RETRY_MIN_BUDGET_MS } from "../draft/step_util.ts";
import { PERSIST_RESERVE_MS, remainingBudgetMs } from "./budget.ts";

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

/** The "what changed" lines are shown to the user: deduplicated, and held to the owner's never-rules like any copy. */
function dedupe(lines: string[]): string[] {
  const out: string[] = [];
  for (const l of lines.map((x) => stripNeverTells(x.trim())).filter(Boolean)) if (!out.some((o) => o.toLowerCase() === l.toLowerCase())) out.push(l);
  return out;
}

export async function runTellEdit(ctx: StepContext, deps: { call: typeof callStep; now?: () => number }): Promise<StepResult<TellEditOutput | TellEditPartial>> {
  const now = deps.now ?? Date.now;
  const spec = ctx.format;
  // a passage rewrite of the opening edits the lead section; the chosen lead follows it before the units are built
  const source = syncChosenLead(latestDraftOutput(ctx), spec);
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
    // the next call must get its full estimate after the persist reserve; the first group of an invocation always runs
    if (groupsThisInvocation > 0 && ctx.timeBudgetMs - elapsed - PERSIST_RESERVE_MS < TELL_EDIT_CALL_ESTIMATE_MS) {
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
    let r = applyInGroup(units, res.output.edits, refs);
    // the model's summary lines count only when one of its edits landed
    if (r.applied.length) whatChanged.push(...res.output.what_changed);
    // edits the guards refused get one more ask, with the reasons, when they were more than a stray and time allows
    if (r.rejected.length && r.rejected.length >= Math.max(2, Math.ceil(res.output.edits.length / 3)) && remainingBudgetMs(ctx, now()) >= RETRY_MIN_BUDGET_MS) {
      const note = `These edits could not be applied:\n${r.rejected.slice(0, 12).map((x) => `- [${x.ref}] "${x.before}" -> "${x.after}": ${x.reason}`).join("\n")}\nReturn edits for the texts as they stand now; copy "before" exactly and keep every ledger tag, number, name, quote and link.`;
      try {
        const current = r.units.filter((u) => refs.has(u.ref));
        const retry = await deps.call(ctx, "tell_edit", tellEditPrompt, { ...args, units: current, findings: unitFindings(current, spec, exemptTerms), retryNote: note }, TellEditCall, `tell edit${groups.length > 1 ? ` ${gi + 1}/${groups.length}` : ""} (retry)`);
        model = retry.model;
        const again = applyInGroup(r.units, retry.output.edits, refs);
        if (again.applied.length) whatChanged.push(...retry.output.what_changed);
        r = { units: again.units, applied: [...r.applied, ...again.applied], rejected: [...r.rejected, ...again.rejected] };
      } catch (e) {
        // a failed retry keeps the first call's edits for this group
        console.warn("tell edit retry failed:", e instanceof Error ? e.message : e);
      }
    }
    units = r.units;
    applied.push(...r.applied.map((e) => ({ ...e, by: "editor" as const })));
    rejected.push(...r.rejected);
    alreadyClean = alreadyClean && res.output.already_clean && r.applied.length === 0;
    done.add(gi);
    groupsThisInvocation++;
    await ctx.savePartial(partial());
  }

  const b = backstopUnits(units);
  units = b.units;
  applied.push(...b.edits.map((e) => ({ ...e, by: "backstop" as const })));

  // the rebuild also tidies what assembly cleans (a list copied into its block's text), so it can change the copy too
  const rebuilt = rebuildDraft(source, units, spec);
  const changed = units.some((u, i) => u.text !== original[i].text) || JSON.stringify([rebuilt.sections, rebuilt.leads]) !== JSON.stringify([source.sections, source.leads]);
  const edited = changed ? rebuilt : source;
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
    : before > 0
    ? `${before} AI tell${before === 1 ? "" : "s"} found; none could be removed safely${rejected.length ? ` (${rejected.length} edit${rejected.length === 1 ? "" : "s"} refused by the guards)` : ""}; the copy is unchanged`
    : `No AI tells to remove${rejected.length ? ` (${rejected.length} edit${rejected.length === 1 ? "" : "s"} refused by the guards)` : ""}; the copy is unchanged`;
  await ctx.progress(summary);
  return { output, model, summary, effects: changed ? { newDraft: toDraftEffect(edited, "revise", "AI tells removed") } : undefined };
}

/** applyEdits for one group: an edit naming a text outside the group is refused with its reason, never dropped silently. */
function applyInGroup(units: EditUnit[], edits: TellEdit[], refs: Set<string>): ReturnType<typeof applyEdits> {
  const outside = edits.filter((e) => !refs.has(e.ref.trim().replace(/^\[|\]$/g, "")));
  const r = applyEdits(units, edits.filter((e) => !outside.includes(e)));
  return { ...r, rejected: [...outside.map((e) => ({ ...e, reason: `no text in this part has the reference ${e.ref}` })), ...r.rejected] };
}

export const tellEditStep = (ctx: StepContext) => runTellEdit(ctx, { call: callStep });
