/**
 * Step 7, mechanical passes. Code only, no model call: the tiered tell detector, FK grade, cadence floor,
 * "and then" count and the format hard gates from the spec. Every flagged tell becomes a draft flag.
 */
import { z } from "zod";
import type { StepEffects, StepFn, StepResult } from "./types.ts";
import { Section } from "../schemas/draft.ts";
import { MechanicalReport } from "../schemas/review.ts";
import { analyzeDraft, exemptTermsFrom, TELL_THRESHOLDS } from "../tells.ts";

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

export function flagsFromReport(report: MechanicalReport): Flag[] {
  const flags: Flag[] = [];
  const hasHigher = report.flags.some((f) => f.tier === 1 || f.tier === 2);
  for (const f of report.flags) {
    if (f.tier === 3 && !hasHigher) continue; // Tier 3 never counts alone
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
  const report = MechanicalReport.parse(analyzeDraft(sections, ctx.format, { exemptTerms: exemptTermsFrom(ctx.offer?.name, ctx.brief?.product_name) }));
  const flags = flagsFromReport(report);

  const verdict = report.hard_fail ? "HARD FAIL" : report.tell_score_per_300 >= TELL_THRESHOLDS.flag ? "FLAG" : "CLEAN";
  const summary = `Mechanical ${verdict}: tell score ${report.tell_score_per_300}/300w, ${report.flags.length} tell${report.flags.length === 1 ? "" : "s"}, ${report.format_gate_failures.length} gate failure${report.format_gate_failures.length === 1 ? "" : "s"}, FK ${report.fk_grade ?? "n/a"}, cadence CV ${report.cadence_cv ?? "n/a"}${report.cadence_flag ? " (flat)" : ""}, ${report.word_count} words`;

  return {
    output: report,
    summary,
    effects: { mechanicalHardFail: report.hard_fail, flags },
  };
};
