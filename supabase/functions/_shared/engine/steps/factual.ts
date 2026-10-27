/**
 * Step 8, factual and compliance review. Ten tests in order; every flag is line → rule (cited) → rewritten line and a
 * decision for the user. The reviewer never softens a claim on its own; the only hard failure is an engine fabrication.
 * Reviewer discipline is enforced in code after the call (draft/review.ts: postProcessFactual).
 */
import type { StepFn } from "./types.ts";
import { FactualOutput } from "../schemas/review.ts";
import { factualPrompt } from "../prompts/factual.v5.ts";
import { droppedReferenceFlags, factualFlags, postProcessFactual } from "../draft/review.ts";
import { stripNeverTells } from "../draft/never_tells.ts";
import { exemptTermsFrom } from "../tells.ts";
import { callStep, latestDraftOutput } from "../draft/step_util.ts";

export const factualStep: StepFn = async (ctx) => {
  const draft = latestDraftOutput(ctx);
  await ctx.progress("Factual and compliance review: ten tests in order");

  // the offer's own words are not owner words in a rewrite either (a brand called "Seamless Books")
  const exemptTerms = exemptTermsFrom(ctx.offer?.name, ctx.brief?.product_name);
  let res = await callStep(ctx, "factual", factualPrompt, { draft, retryNote: null }, FactualOutput, "factual review");
  let pp = postProcessFactual(res.output, ctx.claims, exemptTerms);
  if (pp.violations.length) {
    res = await callStep(ctx, "factual", factualPrompt, { draft, retryNote: pp.violations.join("\n") }, FactualOutput, "factual review (retry: reviewer rules)");
    pp = postProcessFactual(res.output, ctx.claims, exemptTerms);
  }

  // any sentence citing a ledger row the user dropped is a fabrication-level flag, whether or not the reviewer caught it
  const droppedRefs = droppedReferenceFlags(draft.sections, ctx.claims, pp.output.flags);
  const needs = [...pp.output.needs_source];
  for (const n of draft.needs_source) if (!needs.some((x) => x.trim().toLowerCase() === n.trim().toLowerCase())) needs.push(n);
  // a rewritten line is new copy: the owner's never-rules hold for it too (docs/04 §8.3, §7.1)
  const flags = [...pp.output.flags, ...droppedRefs].map((f) => (f.suggested_rewrite ? { ...f, suggested_rewrite: stripNeverTells(f.suggested_rewrite) } : f));
  const out = FactualOutput.parse({ ...pp.output, flags, needs_source: needs });

  const fabrications = out.flags.filter((f) => f.fabrication).length;
  const high = out.flags.filter((f) => f.severity === "high").length;
  const summary = `${out.flags.length} flag${out.flags.length === 1 ? "" : "s"} (${fabrications} fabrication, ${high} high); offer consistency ${out.consistency_check.ok ? "ok" : `${out.consistency_check.mismatches.length} mismatch(es)`}; ${out.needs_source.length} NEEDS SOURCE${pp.dropped.length ? `; ${pp.dropped.length} flag(s) dropped by reviewer rules` : ""}`;
  await ctx.progress(summary);
  return {
    output: out,
    model: res.model,
    summary,
    effects: { flags: factualFlags(out), factualFatal: fabrications > 0 },
  };
};
