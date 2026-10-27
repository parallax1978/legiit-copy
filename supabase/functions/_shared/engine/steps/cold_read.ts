/**
 * Step 5, cold read. A different model than the drafter, no brief, memo or ledger: skim-path readback first,
 * then one fast full read, then (when three leads exist and none is chosen) the lead pick.
 *
 * Lead choice is persisted as a new draft version (origin "system", label "lead chosen"): the chosen lead's blocks
 * replace the provisional lead section, chosen_lead_id is set, and all three leads stay in DraftOutput.leads so
 * the ship step can name the runner-up as the challenger.
 */
import type { StepFn } from "./types.ts";
import { ColdRead } from "../schemas/review.ts";
import { STEP_DEFAULTS } from "../config.ts";
import { coldReadPrompt, type ColdReadArgs } from "../prompts/cold_read.v1.ts";
import { draftPrompt } from "../prompts/draft.v5.ts";
import { leadSectionId } from "../draft/plan.ts";
import { readerText } from "../draft/ledger.ts";
import { sectionsPlain } from "../draft/prompt_text.ts";
import { applyLeadPick, toDraftEffect } from "../draft/assemble.ts";
import { callStep, latestDraftOutput, resolvedModel } from "../draft/step_util.ts";

export const cold_readStep: StepFn = async (ctx) => {
  const spec = ctx.format;
  const draft = latestDraftOutput(ctx);

  const coldModel = resolvedModel(ctx, "cold_read", coldReadPrompt);
  const drafterModel = resolvedModel(ctx, "draft", draftPrompt);
  if (coldModel === drafterModel) {
    throw new Error(`cold read must run on a different model than the drafter (both resolve to ${coldModel}); set ENGINE_COLD_READ_MODEL or the cold_read prompt version's model`);
  }

  const leadSection = leadSectionId(spec);
  const picking = !!draft.leads?.length && draft.chosen_lead_id === null && !!leadSection;
  const body = picking ? draft.sections.filter((s) => s.section_id !== leadSection) : draft.sections;

  const args: ColdReadArgs = {
    skimPath: draft.skim_path.map(readerText).filter(Boolean),
    fullText: sectionsPlain(body),
    leads: picking ? draft.leads!.map((l) => ({ id: l.id, text: sectionsPlain([{ section_id: l.id, title: null, blocks: l.blocks }]) })) : null,
    formatName: spec.name,
  };

  await ctx.progress(`Cold read on ${coldModel}: skim path, then the full draft${picking ? ", then the three leads" : ""}`);
  let res = await callStep(ctx, "cold_read", coldReadPrompt, args, ColdRead, "cold read", { model: coldModel === STEP_DEFAULTS.cold_read.model ? undefined : coldModel });
  let out = res.output;

  if (picking) {
    const valid = (o: ColdRead) => !!o.lead_pick && draft.leads!.some((l) => l.id === o.lead_pick!.chosen_lead_id);
    if (!valid(out)) {
      res = await callStep(ctx, "cold_read", coldReadPrompt, { ...args, fullText: `${args.fullText}\n\n(Your previous answer named no valid lead. lead_pick.chosen_lead_id must be one of: ${draft.leads!.map((l) => l.id).join(", ")}.)` }, ColdRead, "cold read (retry: lead pick)");
      out = res.output;
      if (!valid(out)) throw new Error(`cold read did not pick a lead from ${draft.leads!.map((l) => l.id).join(", ")}`);
    }
  } else {
    out = { ...out, lead_pick: null };
  }

  const flags: NonNullable<NonNullable<Awaited<ReturnType<StepFn>>["effects"]>["flags"]> = [];
  if (out.attention_drop_line) {
    flags.push({ source: "cold_read", kind: "attention_drop", severity: "medium", quote: out.attention_drop_line, rule: null, issue: "A cold reader wanted to stop reading here", suggestedRewrite: null });
  }
  if (out.disbelieved_claim) {
    flags.push({ source: "cold_read", kind: "disbelieved_claim", severity: "medium", quote: out.disbelieved_claim, rule: null, issue: "The one claim a cold reader believed least", suggestedRewrite: null });
  }

  const effects: NonNullable<Awaited<ReturnType<StepFn>>["effects"]> = { flags };
  let summary = `Skim path sells: ${out.skim_readback.what_sold} to ${out.skim_readback.to_whom} for ${out.skim_readback.price}; attention ${out.attention_drop_line ? "dropped" : "held"}; disbelieved: ${out.disbelieved_claim ?? "nothing"}`;
  if (out.lead_pick && leadSection) {
    const chosen = applyLeadPick(draft, spec, leadSection, out.lead_pick.chosen_lead_id);
    effects.newDraft = toDraftEffect(chosen, "system", "lead chosen");
    const lead = draft.leads!.find((l) => l.id === out.lead_pick!.chosen_lead_id)!;
    summary += `; lead ${lead.id} (${lead.lead_type}) chosen`;
  }
  await ctx.progress(summary);
  return { output: ColdRead.parse(out), model: res.model, summary, effects };
};
