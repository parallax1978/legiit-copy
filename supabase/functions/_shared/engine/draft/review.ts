/**
 * Pure post-processing for the review half of the pipeline: editorial flags, factual-flag discipline,
 * revision reconciliation (change only referenced blocks, honor DO NOT TOUCH) and the ship summary.
 */
import type { Section } from "../schemas/draft.ts";
import type { EditorialVerdict, FactualOutput, MechanicalReport, RevisionOutput, ColdRead } from "../schemas/review.ts";
import type { StepEffects } from "../steps/types.ts";
import { LEDGER_TAG } from "../schemas/common.ts";
import { blockText, blocksQuoted, normalizeQuote, verifyDoNotTouch, type DoNotTouchResult } from "./ledger.ts";

type Flag = NonNullable<StepEffects["flags"]>[number];

// ---------------------------------------------------------------- editorial

/** Consistency rules the schema cannot express. Returns problems; empty means fine. */
export function validateEditorial(v: EditorialVerdict): string[] {
  const problems: string[] = [];
  if (v.verdict === "REJECT" && !v.reject_gate) problems.push("REJECT must name the gate that failed (reject_gate)");
  if (v.verdict !== "REJECT" && v.reject_gate) problems.push("reject_gate is set but the verdict is not REJECT");
  if (v.verdict !== "APPROVE" && !v.one_thing) problems.push(`${v.verdict} must carry THE ONE THING (one_thing)`);
  if (!v.prediction_reason.trim()) problems.push("prediction needs its one reason");
  if (v.secondary_notes.length > 5) problems.push("at most five secondary notes");
  return problems;
}

/** THE ONE THING is fatal on REJECT, high otherwise; secondary notes are medium. */
export function editorialFlags(v: EditorialVerdict): Flag[] {
  const out: Flag[] = [];
  if (v.one_thing) {
    out.push({
      source: "editorial",
      kind: v.reject_gate ? `one_thing:gate_${v.reject_gate}` : "one_thing",
      severity: v.verdict === "REJECT" ? "fatal" : "high",
      quote: v.one_thing.quote,
      rule: v.one_thing.fails,
      issue: v.one_thing.fails,
      suggestedRewrite: v.one_thing.do,
    });
  }
  for (const n of v.secondary_notes) {
    out.push({ source: "editorial", kind: "secondary", severity: "medium", quote: n.quote, rule: n.fails, issue: n.fails, suggestedRewrite: n.do });
  }
  return out;
}

// ---------------------------------------------------------------- factual

/** Decorative hedges and generic disclaimers the reviewer may not add (standard §8.2). */
export const DECORATIVE_HEDGE_RE = /\b(may|might|could)\b|\bcan help\b|\bhelps? (to )?support\b|\bresults (may |can )?vary\b|\bindividual results\b|\bresults (are )?not typical\b|\bnot guaranteed\b|\bconsult (your|a) (doctor|physician)\b|\bfor (informational|educational) purposes\b/i;

/** True when the rewrite introduces a decorative hedge the quoted line did not already carry. */
export function introducesDecorativeHedge(quote: string, rewrite: string | null): boolean {
  if (!rewrite) return false;
  const inRewrite = rewrite.match(new RegExp(DECORATIVE_HEDGE_RE.source, "gi")) ?? [];
  if (inRewrite.length === 0) return false;
  const inQuote = new Set((quote.match(new RegExp(DECORATIVE_HEDGE_RE.source, "gi")) ?? []).map((m) => m.toLowerCase()));
  return inRewrite.some((m) => !inQuote.has(m.toLowerCase()));
}

export interface FactualPostProcess {
  output: FactualOutput;
  dropped: { quote: string; why: string }[];
  /** reviewer-discipline violations worth a retry: hedges added, flags without a rewrite */
  violations: string[];
}

/**
 * Enforce the reviewer's discipline in code:
 * - a flag the user already decided to keep is not re-raised;
 * - a flag with no rewrite is rejected (fabrication excepted: the rewrite may be "cut");
 * - a rewrite that adds "may" / "results vary" / a generic disclaimer is a violation;
 * - fabrication is true only for an item the ledger does not hold: a quote that cites an existing ledger row,
 *   or a flag mapped to an existing claim, is the user's claim, not an invention;
 * - fabrication is fatal; claim_id must point at an existing row or is nulled.
 */
export function postProcessFactual(out: FactualOutput, claims: { id: string; user_decision: string | null }[]): FactualPostProcess {
  const known = new Map(claims.map((c) => [c.id, c]));
  const dropped: FactualPostProcess["dropped"] = [];
  const violations: string[] = [];
  const flags: FactualOutput["flags"] = [];
  for (const raw of out.flags) {
    const f = { ...raw };
    if (f.claim_id && !known.has(f.claim_id)) f.claim_id = null;
    const cited = Array.from(f.quote.matchAll(LEDGER_TAG)).map((m) => m[1]).filter((id) => known.has(id));
    if (f.fabrication && (cited.length > 0 || f.claim_id)) f.fabrication = false;
    if (f.fabrication) f.severity = "fatal";
    const decided = f.claim_id ? known.get(f.claim_id)?.user_decision : null;
    if (!f.fabrication && decided === "keep") {
      dropped.push({ quote: f.quote, why: "user decided to keep this claim" });
      continue;
    }
    if (introducesDecorativeHedge(f.quote, f.suggested_rewrite)) {
      violations.push(`rewrite adds a decorative hedge or disclaimer: "${f.suggested_rewrite}"`);
      dropped.push({ quote: f.quote, why: "rewrite added a decorative hedge" });
      continue;
    }
    if (!f.fabrication && (!f.suggested_rewrite || !f.suggested_rewrite.trim())) {
      violations.push(`flag without a rewrite: "${f.quote}"`);
      dropped.push({ quote: f.quote, why: "a flag with no rewrite is rejected" });
      continue;
    }
    flags.push(f);
  }
  return { output: { ...out, flags }, dropped, violations };
}

export function factualFlags(out: FactualOutput): Flag[] {
  return out.flags.map((f) => ({
    source: "factual" as const,
    kind: f.fabrication ? "fabrication" : `test_${f.test}:${f.claim_type}`,
    severity: f.severity,
    quote: f.quote,
    rule: f.rule,
    issue: f.issue,
    suggestedRewrite: f.suggested_rewrite,
    claimId: f.claim_id,
  }));
}

/** Flags the revise step acts on: not those the user decided to keep. */
export function pendingFactualFlags(out: FactualOutput | null, claims: { id: string; user_decision: string | null }[]): FactualOutput["flags"] {
  if (!out) return [];
  const keep = new Set(claims.filter((c) => c.user_decision === "keep").map((c) => c.id));
  return out.flags.filter((f) => f.fabrication || !f.claim_id || !keep.has(f.claim_id));
}

// ---------------------------------------------------------------- revise

export interface BlockDiff {
  changed: string[];
  added: string[];
  removed: string[];
}

export function diffBlocks(before: Section[], after: Section[]): BlockDiff {
  const b = new Map(before.flatMap((s) => s.blocks).map((x) => [x.id, x]));
  const a = new Map(after.flatMap((s) => s.blocks).map((x) => [x.id, x]));
  const changed: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];
  for (const [id, blk] of a) {
    const prev = b.get(id);
    if (!prev) added.push(id);
    else if (blockText(prev) !== blockText(blk) || prev.type !== blk.type) changed.push(id);
  }
  for (const id of b.keys()) if (!a.has(id)) removed.push(id);
  return { changed, added, removed };
}

/** Quotes every note refers to; blocks containing them are the only ones the reviser may change. */
export function revisionQuotes(input: { editorial: EditorialVerdict | null; factual: FactualOutput["flags"]; mechanical: MechanicalReport | null; coldRead: ColdRead | null }): string[] {
  const q: string[] = [];
  if (input.editorial?.one_thing) q.push(input.editorial.one_thing.quote);
  for (const n of input.editorial?.secondary_notes ?? []) q.push(n.quote);
  for (const f of input.factual) q.push(f.quote);
  for (const t of input.mechanical?.flags ?? []) if (t.tier <= 1) q.push(...t.examples);
  for (const r of input.mechanical?.hard_fail_reasons ?? []) q.push(r);
  if (input.coldRead?.attention_drop_line) q.push(input.coldRead.attention_drop_line);
  if (input.coldRead?.disbelieved_claim) q.push(input.coldRead.disbelieved_claim);
  return q.filter((x) => normalizeQuote(x).length > 0);
}

export interface Reconciled {
  sections: Section[];
  /** blocks the model changed without any note referencing them; restored to the original */
  reverted: string[];
  added: string[];
  removed: string[];
  changed: string[];
  doNotTouch: DoNotTouchResult;
}

/**
 * Change only referenced blocks and honor DO NOT TOUCH.
 * - Sections must be the same set (ids); a revision that drops or invents a section fails.
 * - A block changed by the model is kept when a note quotes it or the model declared the change for it; otherwise
 *   it is reverted to the original.
 * - Removed blocks are allowed only when referenced; otherwise restored in place.
 * - DO NOT TOUCH quotes present before must be present after; a violation is returned for the step to fail on.
 */
export function reconcileRevision(before: Section[], revision: RevisionOutput, quotes: string[], doNotTouch: string[]): Reconciled {
  const beforeIds = new Set(before.map((s) => s.section_id));
  const afterIds = new Set(revision.sections.map((s) => s.section_id));
  const missing = [...beforeIds].filter((id) => !afterIds.has(id));
  const invented = [...afterIds].filter((id) => !beforeIds.has(id));
  if (missing.length || invented.length) {
    throw new Error(`revision changed the section set (missing: ${missing.join(", ") || "none"}; new: ${invented.join(", ") || "none"})`);
  }
  const referenced = blocksQuoted(before, quotes);
  for (const c of revision.changes) referenced.add(c.block_id);

  const diff = diffBlocks(before, revision.sections);
  const reverted: string[] = [];
  const bySection = new Map(revision.sections.map((s) => [s.section_id, s]));

  const sections: Section[] = before.map((orig) => {
    const rev = bySection.get(orig.section_id)!;
    // restore unreferenced removals in their original position
    const revIds = new Set(rev.blocks.map((b) => b.id));
    const blocks: Section["blocks"] = [];
    let cursor = 0;
    for (const ob of orig.blocks) {
      if (revIds.has(ob.id)) {
        // emit any new blocks the model inserted before this one
        while (cursor < rev.blocks.length && rev.blocks[cursor].id !== ob.id) blocks.push(rev.blocks[cursor++]);
        const rb = rev.blocks[cursor++];
        if (diff.changed.includes(ob.id) && !referenced.has(ob.id)) {
          reverted.push(ob.id);
          blocks.push(ob);
        } else blocks.push(rb);
      } else if (!referenced.has(ob.id)) {
        reverted.push(ob.id);
        blocks.push(ob);
      }
    }
    while (cursor < rev.blocks.length) blocks.push(rev.blocks[cursor++]);
    return { section_id: orig.section_id, title: rev.title ?? orig.title, blocks };
  });

  const finalDiff = diffBlocks(before, sections);
  const dnt = verifyDoNotTouch(doNotTouch, before, sections);
  return { sections, reverted, added: finalDiff.added, removed: finalDiff.removed, changed: finalDiff.changed, doNotTouch: dnt };
}

// ---------------------------------------------------------------- ship

export interface AttentionInput {
  editorial: EditorialVerdict | null;
  factual: FactualOutput | null;
  mechanical: MechanicalReport | null;
  pendingFlags: { source: string; severity: string; quote: string | null; issue: string | null }[];
  needsSource: string[];
  openQuestions: string[];
}

/** What the user must look at before shipping: unresolved fatal/high flags, NEEDS SOURCE lines, open questions. */
export function userAttention(input: AttentionInput): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const k = s.trim();
    if (k && !seen.has(k.toLowerCase())) {
      seen.add(k.toLowerCase());
      out.push(k);
    }
  };
  for (const f of input.pendingFlags) if (f.severity === "fatal" || f.severity === "high") push(`${f.source} ${f.severity}: ${f.issue ?? ""}${f.quote ? ` — "${f.quote}"` : ""}`);
  if (input.pendingFlags.length === 0) {
    if (input.editorial && input.editorial.verdict !== "APPROVE" && input.editorial.one_thing) {
      push(`editorial ${input.editorial.verdict}${input.editorial.reject_gate ? ` at Gate ${input.editorial.reject_gate}` : ""}: ${input.editorial.one_thing.fails} — "${input.editorial.one_thing.quote}"`);
    }
    for (const f of input.factual?.flags ?? []) if (f.severity === "fatal" || f.severity === "high") push(`factual ${f.severity}${f.fabrication ? " (fabrication)" : ""}: ${f.issue} — "${f.quote}"`);
    for (const r of input.mechanical?.hard_fail_reasons ?? []) push(`mechanical hard fail: ${r}`);
  }
  for (const n of input.needsSource) push(`NEEDS SOURCE: ${n}`);
  for (const q of input.openQuestions) push(`open question: ${q}`);
  return out;
}
