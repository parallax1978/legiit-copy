/**
 * Step 6, editorial review: the copy chief rubric. Gates A-D in order, stop at the first failure, predict against
 * the control, one fatal note and at most five secondary, DO NOT TOUCH, testable disputes. Calibration is logged only.
 */
import type { StepFn } from "./types.ts";
import { ColdRead, EditorialVerdict, MechanicalReport } from "../schemas/review.ts";
import { editorialPrompt, type EditorialArgs } from "../prompts/editorial.v11.ts";
import { parseOptions } from "../draft/options.ts";
import { targetAwareness } from "../draft/ledger.ts";
import { editorialFlags, validateEditorial } from "../draft/review.ts";
import { analyzeDraft, exemptTermsFrom } from "../tells.ts";
import { callStep, describeArgument, latestDraftOutput, stepOutput, thesisOf } from "../draft/step_util.ts";

export const DEFAULT_CONTROL = "No documented control was supplied. Predict against the strongest competitor promotion in the dossier's competitor table: the one whose headline outcome and proof the market cites most.";

export const editorialStep: StepFn = async (ctx) => {
  const draft = latestDraftOutput(ctx);
  const options = parseOptions(ctx.generation.options);
  const target = targetAwareness(ctx.dossier, options);
  const thesis = thesisOf(ctx) ?? "(no thesis recorded; Gate A can only pass if the draft itself argues one sentence)";
  const chosen = draft.leads?.find((l) => l.id === draft.chosen_lead_id) ?? null;

  const args: EditorialArgs = {
    draft,
    thesis,
    argumentText: describeArgument(ctx.winningAngle, ctx.angles),
    coldRead: stepOutput(ctx, "cold_read", ColdRead),
    // Gate D counts the tells of the draft under review: the mechanical step runs beside this one, so its stored
    // report can still be the previous cycle's; the same pure pass is cheap to run here
    mechanical: MechanicalReport.parse(analyzeDraft(draft.sections, ctx.format, { exemptTerms: exemptTermsFrom(ctx.offer?.name, ctx.brief?.product_name) })),
    controlText: options.control_text?.trim() ? `A documented control:\n${options.control_text}` : DEFAULT_CONTROL,
    awareness: target.awareness,
    segment: target.segment,
    chosenLeadType: chosen?.lead_type ?? null,
    retryNote: null,
  };

  await ctx.progress("Copy chief review: gates A-D in order, then the prediction");
  let res = await callStep(ctx, "editorial", editorialPrompt, args, EditorialVerdict, "editorial review");
  let problems = validateEditorial(res.output);
  if (problems.length) {
    res = await callStep(ctx, "editorial", editorialPrompt, { ...args, retryNote: problems.join("\n") }, EditorialVerdict, "editorial review (retry)");
    problems = validateEditorial(res.output);
    if (problems.length) throw new Error(`editorial verdict malformed twice: ${problems.join("; ")}`);
  }
  const v = res.output;

  const summary = `${v.verdict}${v.reject_gate ? ` at Gate ${v.reject_gate}` : ""}; predicts ${v.prediction} vs control (${v.prediction_reason}); ${v.one_thing ? `the one thing: ${v.one_thing.fails}` : "no fatal defect"}; ${v.secondary_notes.length} secondary, ${v.do_not_touch.length} DO NOT TOUCH`;
  await ctx.progress(summary);
  return {
    output: EditorialVerdict.parse(v),
    model: res.model,
    summary,
    effects: {
      editorialVerdict: v.verdict,
      flags: editorialFlags(v),
      prediction: { prediction: v.prediction, reason: v.prediction_reason },
    },
  };
};
