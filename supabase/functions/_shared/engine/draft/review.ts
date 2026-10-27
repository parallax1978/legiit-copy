/**
 * Pure post-processing for the review half of the pipeline: editorial flags, factual-flag discipline,
 * revision reconciliation (change only referenced blocks, honor DO NOT TOUCH) and the ship summary.
 */
import type { Section } from "../schemas/draft.ts";
import type { EditorialVerdict, FactualOutput, MechanicalReport, RevisionOutput, ColdRead } from "../schemas/review.ts";
import type { StepEffects } from "../steps/types.ts";
import { ClaimType, LEDGER_TAG } from "../schemas/common.ts";
import { blockText, blocksQuoted, droppedClaimIds, normalizeQuote, verifyDoNotTouch, type DoNotTouchResult } from "./ledger.ts";
import { stripNeverTells } from "./never_tells.ts";
import { ownerTellsIn } from "../tells.ts";

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

/**
 * THE ONE THING is fatal on REJECT, high otherwise; secondary notes are medium. A note's "do" is a direction (with at
 * most one rewritten line inside it), so it goes in the issue as the fix, never as a one-click replacement: pasting a
 * direction over the quoted line would put the copy chief's note into the copy.
 */
export function editorialFlags(v: EditorialVerdict): Flag[] {
  const out: Flag[] = [];
  const issue = (fails: string, todo: string) => (todo.trim() ? `${fails} Fix: ${stripNeverTells(todo.trim())}` : fails);
  if (v.one_thing) {
    out.push({
      source: "editorial",
      kind: v.reject_gate ? `one_thing:gate_${v.reject_gate}` : "one_thing",
      severity: v.verdict === "REJECT" ? "fatal" : "high",
      quote: v.one_thing.quote,
      rule: v.reject_gate ? `Copy chief, Gate ${v.reject_gate}` : null,
      issue: issue(v.one_thing.fails, v.one_thing.do),
      suggestedRewrite: null,
    });
  }
  for (const n of v.secondary_notes) {
    out.push({ source: "editorial", kind: "secondary", severity: "medium", quote: n.quote, rule: null, issue: issue(n.fails, n.do), suggestedRewrite: null });
  }
  return out;
}

// ---------------------------------------------------------------- factual

/** Decorative hedges, generic disclaimers and legal boilerplate the reviewer may not add (standard §8.2, §8.3). */
export const DECORATIVE_HEDGE_RE = /\b(may|might|could)\b|\bcan help\b|\bhelps? (to )?support\b|\bresults (may |can )?vary\b|\bindividual results\b|\bresults (are )?not typical\b|\bnot guaranteed\b|\bconsult (your|a) (doctor|physician)\b|\bfor (informational|educational) purposes\b|\bnon-?waivable\b|\blegal rights apply\b|\bterms (and conditions )?apply\b|\b(not|non-?) ?refundable\b|\bvoid where prohibited\b|\bsubject to change\b|\bwhere permitted by law\b|\bat (our|its) sole discretion\b|\brestrictions apply\b/i;

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
 * - a flag on a row the user decided to keep is not re-raised (matched by claim_id, or by the ids the quote cites);
 * - a flag with no rewrite is rejected (fabrication excepted: the rewrite may be "cut");
 * - a rewrite that adds "may" / "results vary" / a generic disclaimer is a violation;
 * - a rewrite that brings in one of the owner's tells or words (§7.1) is a violation worth a retry; the flag stays;
 * - a quote citing a row the user dropped is a fabrication (the row is unusable), whatever the model said;
 * - otherwise fabrication is true only for an item the ledger does not hold: a quote that cites an existing usable
 *   ledger row, or a flag mapped to one, is the user's claim, not an invention;
 * - fabrication is fatal; claim_id must point at an existing row or is nulled.
 */
export function postProcessFactual(out: FactualOutput, claims: { id: string; user_decision: string | null }[], exemptTerms: string[] = []): FactualPostProcess {
  const known = new Map(claims.map((c) => [c.id, c]));
  const droppedIds = droppedClaimIds(claims);
  const dropped: FactualPostProcess["dropped"] = [];
  const violations: string[] = [];
  const flags: FactualOutput["flags"] = [];
  for (const raw of out.flags) {
    const f = { ...raw };
    if (f.claim_id && !known.has(f.claim_id)) f.claim_id = null;
    const cited = Array.from(f.quote.matchAll(LEDGER_TAG)).map((m) => m[1]).filter((id) => known.has(id));
    const citedDropped = cited.filter((id) => droppedIds.has(id));
    const citedUsable = cited.filter((id) => !droppedIds.has(id));
    if (citedDropped.length || (f.claim_id && droppedIds.has(f.claim_id))) {
      f.fabrication = true;
      f.claim_id = f.claim_id ?? citedDropped[0];
      f.rule = /dropped/i.test(f.rule) ? f.rule : `${f.rule}; ledger row dropped by the user (offer_claims.user_decision = drop): unusable`;
    } else if (f.fabrication && (citedUsable.length > 0 || f.claim_id)) f.fabrication = false;
    if (f.fabrication) f.severity = "fatal";
    const decided = f.claim_id ? known.get(f.claim_id)?.user_decision : null;
    const keptByCitation = !f.claim_id && citedUsable.length > 0 && citedUsable.every((id) => known.get(id)?.user_decision === "keep");
    if (!f.fabrication && (decided === "keep" || keptByCitation)) {
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
    // a rewritten line is new copy: it may not bring in a Section 7.1 tell or word the line did not have
    if (f.suggested_rewrite && ownerTellsIn(stripNeverTells(f.suggested_rewrite), exemptTerms) > ownerTellsIn(f.quote, exemptTerms)) {
      violations.push(`rewrite brings in one of the owner's tells or words (Section 7.1) the line did not have: "${f.suggested_rewrite}"`);
    }
    flags.push(f);
  }
  return { output: { ...out, flags }, dropped, violations };
}

/**
 * Fabrication-level flags for every sentence that cites a ledger row the user dropped. Added in code after the
 * model's review so the rule holds even when the reviewer missed it; sentences an existing fabrication flag already
 * quotes are skipped.
 */
export function droppedReferenceFlags(sections: Section[], claims: { id: string; claim_type: string; user_decision: string | null }[], existing: FactualOutput["flags"] = []): FactualOutput["flags"] {
  const droppedIds = droppedClaimIds(claims);
  if (droppedIds.size === 0) return [];
  const typeOf = new Map(claims.map((c) => [c.id, c.claim_type]));
  const covered: string[] = existing.filter((f) => f.fabrication).map((f) => normalizeQuote(f.quote)).filter(Boolean);
  const isCovered = (nq: string) => covered.some((c) => nq.includes(c) || c.includes(nq));
  const flags: FactualOutput["flags"] = [];
  for (const s of sections) {
    for (const b of s.blocks) {
      for (const text of [b.text, ...(b.items ?? [])]) {
        for (const sentence of text.split(/(?<=[.!?])\s+/)) {
          const ids = Array.from(sentence.matchAll(LEDGER_TAG)).map((m) => m[1]).filter((id) => droppedIds.has(id));
          if (ids.length === 0) continue;
          const q = sentence.trim();
          const nq = normalizeQuote(q);
          if (!nq || isCovered(nq)) continue;
          covered.push(nq);
          const ct = ClaimType.safeParse(typeOf.get(ids[0]));
          flags.push({
            quote: q,
            rule: "ledger row dropped by the user (offer_claims.user_decision = drop): unusable; §8.3 test 10 fabrication guard",
            issue: `cites ledger row ${ids.join(", ")} which the user dropped; the claim has no usable support and must be cut`,
            suggested_rewrite: null,
            severity: "fatal",
            claim_type: ct.success ? ct.data : "other",
            claim_id: ids[0],
            test: 10,
            fabrication: true,
          });
        }
      }
    }
  }
  return flags;
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
/**
 * The factual flags the revision acts on: the engine's own errors only. A fabrication is cut; a line that misquotes
 * the ledger (test 1) or the offer block (test 8) is fixed, unless the user kept that claim. Every other flag (claim
 * strength, compliance and channel screens) is the user's decision in the Flags panel and never enters the copy on
 * its own (docs/04 §8.3).
 */
export function pendingFactualFlags(out: FactualOutput | null, claims: { id: string; user_decision: string | null }[]): FactualOutput["flags"] {
  if (!out) return [];
  const keep = new Set(claims.filter((c) => c.user_decision === "keep").map((c) => c.id));
  return out.flags.filter((f) => f.fabrication || ((f.test === 1 || f.test === 8) && (!f.claim_id || !keep.has(f.claim_id))));
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
  const who: Record<string, string> = { editorial: "copy chief", factual: "fact check", mechanical: "tell check", cold_read: "blind reader" };
  const gate: Record<string, string> = { A: "the argument", B: "the lead", C: "the claims", D: "the voice" };
  for (const f of input.pendingFlags) if (f.severity === "fatal" || f.severity === "high") push(`Fix first (${who[f.source] ?? f.source}): ${f.issue ?? ""}${f.quote ? ` (line: "${f.quote}")` : ""}`);
  // the owner's stack is a piece-level verdict: its flags are medium one by one, so it is listed whatever else is pending
  for (const r of input.mechanical?.hard_fail_reasons ?? []) {
    const n = /^owner_stack: (\d+)/.exec(r)?.[1];
    if (n) push(`Fix first (tell check): ${n} AI tells from your editing rules are still in the copy. The Flags tab lists each one.`);
  }
  if (input.pendingFlags.length === 0) {
    if (input.editorial && input.editorial.verdict !== "APPROVE" && input.editorial.one_thing) {
      // A rejection at a gate blocks; a "revise" note after the last revision pass is advice, not a blocker.
      const label = input.editorial.verdict === "REJECT" ? "Fix first" : "Worth fixing";
      push(`${label} (copy chief${input.editorial.reject_gate ? `, ${gate[input.editorial.reject_gate] ?? input.editorial.reject_gate}` : ""}): ${input.editorial.one_thing.fails} (line: "${input.editorial.one_thing.quote}")`);
    }
    for (const f of input.factual?.flags ?? []) if (f.severity === "fatal" || f.severity === "high") push(`Fix first (fact check${f.fabrication ? ", invented fact" : ""}): ${f.issue} (line: "${f.quote}")`);
    for (const r of input.mechanical?.hard_fail_reasons ?? []) push(`Fix first (tell check): ${r}`);
  }
  // Lines that need a source and the offer's open questions are shown in their own sections of the piece
  // (and the questions on the offer page); listing them here again made every piece look blocked.
  return out;
}
