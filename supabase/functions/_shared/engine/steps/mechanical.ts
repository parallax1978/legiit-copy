/**
 * Step 7, mechanical passes. Code only, no model call: the tiered tell detector, FK grade, cadence floor,
 * "and then" count and the format hard gates from the spec. Every flagged tell becomes a draft flag.
 */
import { z } from "zod";
import type { StepEffects, StepFn, StepResult } from "./types.ts";
import { Section } from "../schemas/draft.ts";
import { MechanicalReport } from "../schemas/review.ts";
import { analyzeDraft, exemptTermsFrom, TELL_THRESHOLDS, toolNamesFrom } from "../tells.ts";
import { Candidate } from "../schemas/argument.ts";
import { promiseOverlap, promiseStems, statesPromise } from "../draft/tell_edit.ts";
import { readerText } from "../draft/ledger.ts";
import type { FormatSpec } from "../formats/spec.ts";

const DraftBlocks = z.union([z.array(Section), z.object({ sections: z.array(Section) })]);

type Flag = NonNullable<StepEffects["flags"]>[number];
const RULE = "04-copy-standard §7";

function severity(tier: number): Flag["severity"] {
  return tier === 0 ? "fatal" : tier === 1 ? "medium" : "low";
}

/** Blocks json as stored on the draft row: either `Section[]` or a DraftOutput-shaped `{ sections }`. */
export function sectionsFromBlocks(blocks: unknown): Section[] {
  const parsed = DraftBlocks.safeParse(blocks);
  if (!parsed.success) throw new Error(`mechanical: draft blocks are not Section[]: ${parsed.error.issues[0]?.message ?? "invalid"}`);
  return Array.isArray(parsed.data) ? parsed.data : parsed.data.sections;
}

/** Blocks that carry the offer, the button, the terms or a customer's words: never where the promise has to be said. */
const OFFER_BLOCK_TYPES = new Set(["cta", "button", "price", "guarantee", "disclosure", "terms", "testimonial"]);
/** Pieces with no slot of their own for the promise: the checkout, the bump, the confirmation, the cold opener. */
const NO_PROMISE_FORMATS = new Set(["order_form", "order_bump", "thank_you", "cold_email"]);
const SENTENCE_SPLIT = /(?<=[.!?…]["”’)]?)\s+|\n+/;
export const PROMISE_UNSTATED = "promise_unstated";

/** A sentence that speaks to the reader: it holds "you" and does not open on the product's name. */
function readerSentence(sentence: string, names: string[]): boolean {
  const t = sentence.trim().replace(/^["“(]+/, "").toLowerCase();
  return /\b(?:you|your|yours|yourself)\b/.test(t) && !names.some((n) => n && t.startsWith(n.toLowerCase()));
}

/**
 * The argument's promise said in the piece (docs/04 rule 8): one sentence to the reader, outside the offer and the
 * call to action, holds its head, every result it joins and half its words. Returns the note for the revision, naming
 * the promise and the sentence that comes closest to it, or null when a sentence says it or the piece has no slot of
 * its own for it (an ad set, a sequence, an SMS, a checkout, a confirmation, a cold opener).
 */
export function promiseGap(sections: Section[], spec: FormatSpec, promise: string | null | undefined, names: string[] = []): string | null {
  if (!promise?.trim() || spec.multi_item || spec.family === "message" || NO_PROMISE_FORMATS.has(spec.id)) return null;
  const stems = promiseStems(promise);
  if (!stems.size) return null;
  const head = stems.values().next().value as string;
  const sentences = sections
    .filter((s) => s.section_id !== "first_comment")
    .flatMap((s) => s.blocks.filter((b) => !OFFER_BLOCK_TYPES.has(b.type)).flatMap((b) => [b.text, ...(b.items ?? [])]))
    .flatMap((t) => readerText(t).split(SENTENCE_SPLIT))
    .map((t) => t.trim())
    .filter(Boolean);
  if (sentences.some((x) => readerSentence(x, names) && statesPromise(x, stems))) return null;
  // the closest sentence: most of the promise's words (two at least), the head breaking ties, no figure or price in it
  let closest: string | null = null;
  let best = 1;
  let bestHead = false;
  for (const x of sentences) {
    if (/[\d$€£%]/.test(x)) continue;
    const n = promiseOverlap(x, stems);
    const hasHead = promiseOverlap(x, new Set([head])) > 0;
    if (n > best || (n === best && closest !== null && hasHead && !bestHead)) [closest, best, bestHead] = [x, n, hasHead];
  }
  return `No sentence says the argument's promise ("${promise.trim()}") to the reader: say it as a sentence of its own, early (in a short piece by the rehook), with every result it names (rule 8)${closest ? `; the closest line is "${closest}"` : ""}.`;
}

export function flagsFromReport(report: MechanicalReport): Flag[] {
  const flags: Flag[] = [];
  const hasHigher = report.flags.some((f) => f.tier === 1 || f.tier === 2);
  for (const f of report.flags) {
    if (f.tier === 3 && !hasHigher) continue; // Tier 3 never counts alone
    if (f.tell === PROMISE_UNSTATED) {
      flags.push({ source: "mechanical", kind: PROMISE_UNSTATED, severity: "medium", quote: f.examples[0] ?? null, rule: "04-copy-standard §1 rule 8", issue: f.fix, suggestedRewrite: null });
      continue;
    }
    flags.push({
      source: "mechanical",
      kind: f.tell,
      severity: severity(f.tier),
      quote: f.examples[0] ?? null,
      rule: RULE,
      issue: `${f.tell}: ${f.count} occurrence${f.count === 1 ? "" : "s"} (tier ${f.tier}, weight ${f.weight}). Fix: ${f.fix}`,
      // the fix is guidance, not a line: offering it as a rewrite would paste it into the copy
      suggestedRewrite: null,
    });
  }
  for (const g of report.format_gate_failures) {
    flags.push({ source: "mechanical", kind: "format_gate", severity: "high", quote: null, rule: "04-copy-standard §9", issue: `format hard gate failed: ${g}`, suggestedRewrite: null });
  }
  if (report.cadence_flag) {
    flags.push({ source: "mechanical", kind: "cadence_flat", severity: "low", quote: null, rule: RULE, issue: `sentence-length coefficient of variation ${report.cadence_cv} is under the format floor over 300+ words`, suggestedRewrite: "Vary sentence length: a three-word sentence after a long one." });
  }
  if (report.and_then_count >= 3) {
    flags.push({ source: "mechanical", kind: "and_then_beat", severity: "low", quote: null, rule: RULE, issue: `"and then" appears ${report.and_then_count} times: events chained instead of caused`, suggestedRewrite: "State the cause: \"because\", \"so\", or a new sentence with its subject." });
  }
  return flags;
}

export const mechanicalStep: StepFn = async (ctx): Promise<StepResult<MechanicalReport>> => {
  const draft = ctx.latestDraft;
  if (!draft) throw new Error("mechanical: no draft to review");
  await ctx.progress("Running mechanical passes");

  const sections = sectionsFromBlocks(draft.blocks);
  // the offer's own words are exempt here exactly as in the tell edit, or the stack would loop revisions on them
  const exemptTerms = exemptTermsFrom(ctx.offer?.name, ctx.brief?.product_name);
  // the tools the comparative ledger rows name join the talking-tool rule's nouns, as in the tell edit
  const report = MechanicalReport.parse(analyzeDraft(sections, ctx.format, { exemptTerms, toolNames: toolNamesFrom(ctx.claims ?? [], exemptTerms), productName: ctx.brief?.product_name ?? ctx.offer?.name ?? null }));
  // the piece says the argument's promise (rule 8): a draft that only describes the product, or says half a promise of
  // two results, carries a note to the revision with the line to rewrite. A note, not a hard fail: the match is on
  // words, and a piece that says the promise in other words never costs a review cycle for it
  const angle = Candidate.safeParse(ctx.winningAngle?.candidate);
  const names = [ctx.offer?.name, ctx.brief?.product_name].filter((n): n is string => !!n?.trim());
  const gap = promiseGap(sections, ctx.format, angle.success ? angle.data.promise : null, names);
  if (gap) {
    const quoted = /the closest line is "(.*)"\.$/.exec(gap)?.[1];
    report.flags.push({ tier: 1, tell: PROMISE_UNSTATED, weight: 0, count: 1, examples: quoted ? [quoted] : [], fix: gap });
  }
  const flags = flagsFromReport(report);

  const verdict = report.hard_fail ? "HARD FAIL" : report.tell_score_per_300 >= TELL_THRESHOLDS.flag ? "FLAG" : "CLEAN";
  const summary = `Mechanical ${verdict}: tell score ${report.tell_score_per_300}/300w, ${report.flags.length} tell${report.flags.length === 1 ? "" : "s"}, ${report.format_gate_failures.length} gate failure${report.format_gate_failures.length === 1 ? "" : "s"}, FK ${report.fk_grade ?? "n/a"}, cadence CV ${report.cadence_cv ?? "n/a"}${report.cadence_flag ? " (flat)" : ""}, ${report.word_count} words`;

  return {
    output: report,
    summary,
    effects: { mechanicalHardFail: report.hard_fail, flags },
  };
};
