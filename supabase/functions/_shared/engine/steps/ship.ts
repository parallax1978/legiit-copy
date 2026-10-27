/**
 * Step 10, ship and log. No model call. Control = the latest draft version; challenger = the runner-up lead when
 * three were drafted; the test variable is the lead; the reviewer's prediction is carried; the user's attention list
 * is unresolved fatal/high flags, NEEDS SOURCE lines and open questions. The runner marks the generation completed.
 */
import type { StepFn } from "./types.ts";
import { EditorialVerdict, FactualOutput, MechanicalReport, ShipOutput } from "../schemas/review.ts";
import { parseStoredDraft } from "../draft/assemble.ts";
import { runnerUpLead } from "../draft/leads.ts";
import { userAttention } from "../draft/review.ts";
import { stepOutput } from "../draft/step_util.ts";

export const shipStep: StepFn = async (ctx) => {
  const latest = ctx.latestDraft;
  if (!latest) throw new Error("ship: no draft exists for this generation");
  const draft = parseStoredDraft(latest.blocks);
  const editorial = stepOutput(ctx, "editorial", EditorialVerdict);
  const factual = stepOutput(ctx, "factual", FactualOutput);
  const mechanical = stepOutput(ctx, "mechanical", MechanicalReport);

  // Flags and questions live in tables the context does not carry; read them best-effort and fall back to step outputs.
  let pendingFlags: { source: string; severity: string; quote: string | null; issue: string | null; kind: string | null }[] = [];
  let openQuestions: string[] = [];
  try {
    const { data } = await ctx.db.from("draft_flags").select("source,kind,severity,quote,issue").eq("draft_id", latest.id).eq("decision", "pending");
    pendingFlags = data ?? [];
  } catch (e) {
    console.warn("ship: draft_flags unavailable", e instanceof Error ? e.message : e);
  }
  try {
    const { data } = await ctx.db.from("offer_questions").select("question").eq("offer_id", ctx.offer.id).is("answer", null);
    openQuestions = (data ?? []).map((q) => q.question);
  } catch (e) {
    console.warn("ship: offer_questions unavailable", e instanceof Error ? e.message : e);
  }

  const challenger = draft ? runnerUpLead(draft.leads, draft.chosen_lead_id) : null;
  // the final revision applied the last review's notes; no reviewer predicted on this copy
  const finalPass = ctx.finalPass === true;
  const out = ShipOutput.parse({
    control_draft_version: latest.version,
    challenger_lead_id: challenger,
    test_variable: challenger ? "lead" : null,
    prediction: finalPass ? "unsure" : editorial?.prediction ?? "unsure",
    prediction_reason: finalPass
      ? "The last revision applied the copy chief's notes after the final review, so no reviewer has predicted on this version."
      : editorial?.prediction_reason ?? "no editorial verdict was recorded for this generation",
    user_attention: userAttention({ editorial, factual, mechanical, pendingFlags, needsSource: draft?.needs_source ?? [], openQuestions, finalPass }),
    final_pass: finalPass,
  });

  const n = out.user_attention.length;
  const summary = `Done${challenger ? ", with an alternative opening to test" : ""}. ${n === 0 ? "Nothing needs your attention." : `${n} thing${n === 1 ? "" : "s"} to look at.`}`;
  await ctx.progress(summary);
  return { output: out, summary };
};
