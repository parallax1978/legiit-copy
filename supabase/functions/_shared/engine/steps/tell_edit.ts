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
import type { FormatSpec } from "../formats/spec.ts";
import { TellEditCall, TellEditOutput, TellEditPartial, type TellEditAuditItem, type TellEditPoint } from "../schemas/tell_edit.ts";
import { tellEditPrompt, type TellEditArgs } from "../prompts/tell_edit.v16.ts";
import { exemptTermsFrom, toolNamesFrom } from "../tells.ts";
import { applyEdits, backstopUnits, coupletFindings, editableUnits, flatCadence, groupUnits, ledgerWordingFindings, openingFindings, openPoints, ownerTellCount, promiseStems, rebuildDraft, repeatFindings, sentenceTagged, statesPromise, stillStands, stripNeverTells, syncChosenLead, unitFindings, type EditUnit, type TellEdit } from "../draft/tell_edit.ts";
import { Candidate } from "../schemas/argument.ts";
import { REPEAT_FAMILIES } from "../tells.ts";
import { ChosenOffer } from "../schemas/offer.ts";
import { ONE_LINE_OFFER_FAMILIES } from "../draft/prompt_text.ts";
import { toDraftEffect } from "../draft/assemble.ts";
import { callStep, latestDraftOutput, RETRY_MIN_BUDGET_MS } from "../draft/step_util.ts";
import { PERSIST_RESERVE_MS, remainingBudgetMs } from "./budget.ts";

/** Wall-clock estimate for one tell edit call; the budget check uses it for the next group. */
export const TELL_EDIT_CALL_ESTIMATE_MS = 90_000;
/** The "what changed" list stays as short as the owner's editor keeps it: three to six lines. */
const MAX_LIST = 6;

type Applied = TellEditOutput["edits"][number];
type Rejected = TellEditOutput["rejected"][number];

/** Words of a line, the way the step compares them: lower case, tags out, curly apostrophes and quotes straightened. */
const wordsOf = (t: string) => t.toLowerCase().replace(/\[\[[^\]]*\]\]/g, " ").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').match(/[\p{L}\p{N}']+/gu) ?? [];
const refOf = (r: string) => r.trim().replace(/^\[|\]$/g, "");
const has = (text: string, line: string) => {
  const t = ` ${wordsOf(text).join(" ")} `;
  const l = wordsOf(line).join(" ");
  return !!l && t.includes(` ${l} `);
};

/** The audit kinds a long piece is not held to: it may repeat its promise and walk its steps on purpose. */
const SHORT_ONLY = new Set<TellEditAuditItem["kind"]>(["said_again", "tool_tour"]);

/**
 * The lines the editor listed as tells, did not keep, and that still stand word for word in their text (an edit that
 * changed any word of a line reached it). Left out: a line the editor's own copy of the text never had, a testimonial,
 * a line in a text that carries a ledger tag when it was listed as said again (the proof keeps its line; the untagged
 * one changes), a line that is the user's accepted wording, and in a long piece a repeat or a tour of the steps.
 */
function leftUnedited(audit: TellEditAuditItem[], before: EditUnit[], after: EditUnit[], opts: { short: boolean; accepted: string[]; promise?: Set<string> }): TellEditAuditItem[] {
  const textOf = (units: EditUnit[], ref: string) => units.find((u) => u.ref === ref);
  return audit.filter((x) => {
    if (x.keep) return false;
    const ref = refOf(x.ref);
    const was = textOf(before, ref);
    const now = textOf(after, ref);
    if (!was || !now || was.type === "testimonial" || !has(was.text, x.line)) return false;
    if (!opts.short && SHORT_ONLY.has(x.kind)) return false;
    if (x.kind === "said_again" && sentenceTagged(was.text, x.line)) return false;
    // the line that states the promise is never pressed to go (docs/04 rule 8): its repeat is the other line's to fix
    if (x.kind === "said_again" && opts.promise?.size && statesPromise(x.line, opts.promise, { loose: true })) return false;
    // a price, the guarantee, a disclosure and an amount keep the offer's wording: never asked about as copied wording
    if (x.kind === "ledger_wording" && (["price", "guarantee", "disclosure", "cta", "button"].includes(was.type) || /[$€£¥]\s?\d/.test(x.line))) return false;
    if (opts.accepted.some((w) => has(w, x.line))) return false;
    return stillStands(now.text, x.line);
  });
}

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
  // the tools and metrics the comparative ledger rows name join the talking-tool rule's nouns (tells.ts toolNamesFrom)
  const toolNames = toolNamesFrom(ctx.claims ?? [], exemptTerms);
  // the product's name: the opening rule for a product pointed at before it is introduced (tells.ts unintroduced_product)
  const productName = ctx.brief?.product_name ?? ctx.offer?.name ?? null;
  const before = ownerTellCount(source, spec, exemptTerms, toolNames, productName);
  const cadence = flatCadence(source, spec);
  // the user's accepted wording for a ledger row ("rewrite") and, on a page that takes payment, the guarantee sentence
  // the offer block says to repeat are used as written: the editor leaves them alone
  const chosenOffer = ChosenOffer.safeParse(ctx.variant?.chosen);
  const acceptedWording = [
    ...ctx.claims.filter((c) => c.user_decision === "rewrite" && c.claim_text).map((c) => c.claim_text),
    ...(chosenOffer.success && !ONE_LINE_OFFER_FAMILIES.has(spec.family) ? [chosenOffer.data.guarantee.denominated_text] : []),
  ];
  // the argument's promise: no edit removes the piece's last line that states it (docs/04 rule 8)
  const angle = Candidate.safeParse(ctx.winningAngle?.candidate);
  const promise = promiseStems(angle.success ? angle.data.promise : null);
  const auditOpts = { short: REPEAT_FAMILIES.has(spec.family), accepted: acceptedWording, promise };
  // a share word ("some", "most") in a sentence with a number is precision only when the row it cites holds it
  const rows = new Map(ctx.claims.map((c) => [c.id, `${c.claim_text ?? ""} ${c.precision ?? ""}`]));
  const rowText = (id: string) => rows.get(id);

  const original = editableUnits(source, spec);
  const groups = groupUnits(original);
  const resumed = restore(ctx, version, original);
  let units: EditUnit[] = resumed ? original.map((u, i) => ({ ...u, text: resumed.texts[i] })) : original;
  const done = new Set(resumed?.groups_done ?? []);
  const applied: Applied[] = [...(resumed?.edits ?? [])];
  const rejected: Rejected[] = [...(resumed?.rejected ?? [])];
  const whatChanged: string[] = [...(resumed?.what_changed ?? [])];
  const audit: TellEditAuditItem[] = [...(resumed?.audit ?? [])];
  const auditLeft: TellEditAuditItem[] = [...(resumed?.audit_left ?? [])];
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
    audit,
    audit_left: auditLeft,
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
    // the checker's list for this group: each text's own tells, what the whole piece says twice, and the opening tells
    // of each lead in its place (or of each piece's opening)
    const openingsIn = (all: EditUnit[]) => openingFindings(all, source, spec, toolNames, productName).filter((f) => refs.has(f.ref));
    const findingsFor = (all: EditUnit[]) => {
      const mine = all.filter((u) => refs.has(u.ref));
      return [...unitFindings(mine, spec, exemptTerms), ...openingsIn(all).map(({ ref, tell, example }) => ({ ref, tell, example })), ...repeatFindings(all, source, spec, exemptTerms, promise).filter((f) => refs.has(f.ref)), ...coupletFindings(all, source, spec).filter((f) => refs.has(f.ref)), ...ledgerWordingFindings(mine, ctx.claims, spec)];
    };
    const args: TellEditArgs = {
      draft: source,
      units: mine(),
      findings: findingsFor(units),
      exemptTerms,
      groupIndex: gi,
      groupTotal: groups.length,
      retryNote: null,
      cadence,
      acceptedWording,
    };
    const res = await deps.call(ctx, "tell_edit", tellEditPrompt, args, TellEditCall, `tell edit${groups.length > 1 ? ` ${gi + 1}/${groups.length}` : ""}`);
    model = res.model;
    const unitsBefore = units;
    let r = applyInGroup(units, res.output.edits, refs, spec.family, promise, rowText);
    const listed = (res.output.audit ?? []).filter((x) => refs.has(refOf(x.ref)));
    audit.push(...listed);
    // the model's summary lines stand only when all its edits landed; otherwise the landed edits' own labels say what changed
    whatChanged.push(...summaryOf(res.output.what_changed, r.applied, r.rejected.length > 0));
    // one more ask, when time allows, for edits the guards refused (more than a stray) and for lines the editor listed
    // as tells and left without an edit that landed
    let left = leftUnedited(listed, unitsBefore, r.units, auditOpts);
    const mapped = (res.output.points ?? []).map((p) => ({ ...p, lines: p.lines.filter((l) => refs.has(refOf(l.ref))) })).filter((p) => p.lines.length > 1);
    let pointsOpen = openPoints(mapped, r.units, source, spec, promise);
    // an opening tell the checker still finds after the edits (the owner's first complaint is the hook)
    const openingLeft = openingsIn(r.units);
    const refusedMany = r.rejected.length > 0 && r.rejected.length >= Math.max(2, Math.ceil(res.output.edits.length / 3));
    if ((refusedMany || left.length || pointsOpen.length || openingLeft.length) && remainingBudgetMs(ctx, now()) >= RETRY_MIN_BUDGET_MS) {
      const note = [
        refusedMany ? `These edits could not be applied:\n${r.rejected.slice(0, 12).map((x) => `- [${x.ref}] "${x.before}" -> "${x.after}": ${x.reason}`).join("\n")}` : "",
        left.length ? `You listed these lines and left them as they were; give each one its edit (say the plain specific thing, or cut it where a cut is allowed), or keep it only if it carries a fact the piece needs:\n${left.slice(0, 12).map((x) => {
          const refused = r.rejected.filter((e) => refOf(e.ref) === refOf(x.ref)).map((e) => e.reason);
          const opening = units.find((u) => u.ref === refOf(x.ref))?.owner === "lead";
          return `- [${refOf(x.ref)}] (${x.kind}) "${x.line}"${opening ? " (an opening: rephrase it, never cut it whole)" : ""}${refused.length ? `; refused before: ${Array.from(new Set(refused)).join("; ")}` : ""}`;
        }).join("\n")}` : "",
        pointsOpen.length ? `These points are still made by more than one line; change these lines (cut each, or rewrite it so it adds something the point's other line did not):\n${pointsOpen.slice(0, 8).map((p) => `- ${p.point}: ${p.lines.map((l) => `[${refOf(l.ref)}] "${l.line}"`).join("; ")}`).join("\n")}` : "",
        openingLeft.length ? `These opening lines still carry an opening tell; rewrite each one as its fix says, keeping its facts and ledger tags:\n${openingLeft.slice(0, 12).map((f) => `- [${f.ref}] ${f.tell}: ${f.example}`).join("\n")}` : "",
        `Return edits for the texts as they stand now; copy "before" exactly and keep every ledger tag, number, name, quote and link.`,
      ].filter(Boolean).join("\n");
      try {
        const current = r.units.filter((u) => refs.has(u.ref));
        const retry = await deps.call(ctx, "tell_edit", tellEditPrompt, { ...args, units: current, findings: findingsFor(r.units), retryNote: note }, TellEditCall, `tell edit${groups.length > 1 ? ` ${gi + 1}/${groups.length}` : ""} (retry)`);
        model = retry.model;
        const again = applyInGroup(r.units, retry.output.edits, refs, spec.family, promise, rowText);
        whatChanged.push(...summaryOf(retry.output.what_changed, again.applied, again.rejected.length > 0));
        r = { units: again.units, applied: [...r.applied, ...again.applied], rejected: [...r.rejected, ...again.rejected] };
        // a line the retry kept on purpose is kept; one it left again is reported
        const keptNow = (retry.output.audit ?? []).filter((x) => x.keep);
        left = leftUnedited(left, unitsBefore, again.units, auditOpts).filter((x) => !keptNow.some((k) => refOf(k.ref) === refOf(x.ref) && (has(k.line, x.line) || has(x.line, k.line))));
        pointsOpen = openPoints(mapped, again.units, source, spec, promise);
      } catch (e) {
        // a failed retry keeps the first call's edits for this group
        console.warn("tell edit retry failed:", e instanceof Error ? e.message : e);
      }
    }
    units = r.units;
    auditLeft.push(...left, ...pointsOpen.flatMap((p) => p.lines.map((l) => ({ ref: refOf(l.ref), line: l.line, kind: "said_again" as const, keep: false }))));
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
  const after = changed ? ownerTellCount(edited, spec, exemptTerms, toolNames, productName) : before;
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
    audit,
    audit_left: auditLeft,
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

/** What a call changed: its own summary lines when every edit landed, the landed edits' labels when some were refused, nothing when none landed. */
function summaryOf(lines: string[], landed: TellEdit[], refused: boolean): string[] {
  if (!landed.length) return [];
  if (!refused) return lines;
  return Array.from(new Set(landed.map((e) => e.tell.trim()).filter(Boolean))).map((t) => `Removed: ${t}`);
}

/** applyEdits for one group: an edit naming a text outside the group is refused with its reason, never dropped silently. */
function applyInGroup(units: EditUnit[], edits: TellEdit[], refs: Set<string>, family?: FormatSpec["family"], promise?: Set<string>, rowText?: (id: string) => string | undefined): ReturnType<typeof applyEdits> {
  const outside = edits.filter((e) => !refs.has(refOf(e.ref)));
  const r = applyEdits(units, edits.filter((e) => !outside.includes(e)), family, promise, rowText);
  return { ...r, rejected: [...outside.map((e) => ({ ...e, reason: `no text in this part has the reference ${e.ref}` })), ...r.rejected] };
}

export const tellEditStep = (ctx: StepContext) => runTellEdit(ctx, { call: callStep });
