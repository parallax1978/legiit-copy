/**
 * Editorial review prompt v1: the copy chief rubric (standard §6) verbatim, gates in order, stop at the first
 * failure, predict against a control, never average.
 */
import { CACHE_BREAK, type PromptModule } from "./types.ts";
import { AI_TELL_CHECKLIST, COPY_CHIEF_RUBRIC, LEAD_SELECTION, RULES } from "./standard.ts";
import type { DraftOutput } from "../schemas/draft.ts";
import type { ColdRead, MechanicalReport } from "../schemas/review.ts";
import type { Awareness } from "../schemas/common.ts";
import { dossierText, formatRulesText, ledgerText, offerBlockText, sectionsWithIds } from "../draft/prompt_text.ts";
import { LEAD_RULES_BY_AWARENESS } from "../draft/leads.ts";

export interface EditorialArgs {
  draft: DraftOutput;
  thesis: string;
  argumentText: string;
  coldRead: ColdRead | null;
  mechanical: MechanicalReport | null;
  controlText: string;
  awareness: Awareness;
  segment: string | null;
  chosenLeadType: string | null;
  retryNote: string | null;
}

const SYSTEM = [
  `You are the copy chief on a direct response desk. You review one draft against the argument memo, the claims ledger, the research and a control. Your posture: predict whether a skeptical stranger sends money and keeps it. You stop at the first fatal defect. You never average.`,
  ``,
  COPY_CHIEF_RUBRIC,
  `## The writer's rulebook (what the draft was written to)`,
  ``,
  RULES,
  LEAD_SELECTION,
  AI_TELL_CHECKLIST,
  `## How to fill the verdict`,
  ``,
  `- Gates run in order A, B, C, D. The first gate that fails ends the review: verdict "REJECT", reject_gate that letter, one_thing the failing line. Gates that were never reached are not judged.`,
  `- All gates pass and one defect would still cost response: verdict "REVISE", reject_gate null, one_thing that defect.`,
  `- All gates pass and nothing you can name would cost response: verdict "APPROVE", reject_gate null, one_thing null (you may still leave secondary notes).`,
  `- The cold read is evidence, not a verdict: its skim readback is what the skim path sells; a disbelieved claim or an attention drop points you to a line.`,
  `- The mechanical report, when present, is the tell score for Gate D. When absent, judge Gate D from the text and the checklist.`,
  `- prediction: "beat", "lose" or "unsure" against the control named in the request, with one reason. Unsure is an honest answer; it is never a hedge for a draft you would reject.`,
  `- argument_readback: the four slots in your words from the draft alone, then matches_memo against the thesis. A slot that is blank or plural fails Gate A.`,
  `- skim_readback: what the skim path alone sells and for how much, one or two sentences.`,
  `- what_works: two or three quoted lines kept on purpose; say why in a phrase.`,
  `- one_thing and secondary_notes: quote exact lines; fails names the gate or rule in one sentence; do gives direction and at most one rewritten line. No wholesale rewrites. No style notes unless style is the defect. At most five secondary notes.`,
  `- do_not_touch: exact lines the revise step may not change. Include every what_works quote and any line a note depends on staying as it is.`,
  `- testable_disputes: taste, not rule: each a one-variable A/B in one sentence.`,
  `- calibration: the seven observations 0-3 (argument, proof, pacing, offer, specificity, reader_focus, rhythm). They are logged. They never decide the verdict.`,
  `- sentence_job_audit: untagged sentences (quoted) and paragraphs with no claim and no proof (quoted by first words).`,
  `- Ledger tags [[L:<id>]] in the draft are the writer's citations; check each against the ledger rows for existence, precision and grade. [[NEEDS SOURCE]] marks a fact the ledger lacks: a Gate C failure when the fact is load-bearing.`,
  `- Return only the JSON.`,
].join("\n");

export const editorialPrompt: PromptModule<EditorialArgs> = {
  step: "editorial",
  version: 1,
  effort: "xhigh",
  maxTokens: 8000,
  system: SYSTEM,
  user: (ctx, args) => {
    const rule = LEAD_RULES_BY_AWARENESS[args.awareness];
    const cold = args.coldRead
      ? `COLD READ (a different model, no brief, no ledger):\nskim readback: sold=${args.coldRead.skim_readback.what_sold} | to=${args.coldRead.skim_readback.to_whom} | price=${args.coldRead.skim_readback.price} | why believe=${args.coldRead.skim_readback.why_believe}\nattention dropped at: ${args.coldRead.attention_drop_line ?? "never"}\ndisbelieved claim: ${args.coldRead.disbelieved_claim ?? "none"}\npromise in one sentence: ${args.coldRead.promise_one_sentence}${args.coldRead.lead_pick ? `\nlead picked: ${args.coldRead.lead_pick.chosen_lead_id} (${args.coldRead.lead_pick.reason})` : ""}`
      : "COLD READ: not available.";
    const mech = args.mechanical
      ? `MECHANICAL REPORT: tell score ${args.mechanical.tell_score_per_300} per 300 words${args.mechanical.hard_fail ? ` HARD FAIL: ${args.mechanical.hard_fail_reasons.join("; ")}` : ""}; FK grade ${args.mechanical.fk_grade ?? "n/a"}; cadence CV ${args.mechanical.cadence_cv ?? "n/a"}${args.mechanical.cadence_flag ? " (below floor)" : ""}; "and then" ${args.mechanical.and_then_count}; format gates failed: ${args.mechanical.format_gate_failures.join("; ") || "none"}\nflags: ${args.mechanical.flags.map((f) => `T${f.tier} ${f.tell} ×${f.count}${f.examples[0] ? ` e.g. "${f.examples[0]}"` : ""}`).join(" | ") || "none"}`
      : "MECHANICAL REPORT: not yet available; judge Gate D from the text.";
    return [
      formatRulesText(ctx.format),
      `FORMAT MUSTS BY SECTION:\n${ctx.format.sections.map((s) => `- ${s.id}: must ${s.must.join("; ") || "-"}; must not ${s.must_not.join("; ") || "-"}`).join("\n")}`,
      `AWARENESS FIELD: ${args.awareness}${args.segment ? ` (segment ${args.segment})` : ""}. Lead rule: ${rule.opening_move}; product named ${rule.product_named.toLowerCase()}; do not: ${rule.do_not}. Lead type drafted: ${args.chosenLeadType ?? "not recorded"}.`,
      `ARGUMENT MEMO:\nTHESIS: ${args.thesis}\n${args.argumentText}`,
      `CONTROL TO PREDICT AGAINST:\n${args.controlText}`,
      offerBlockText(ctx.variant, ctx.brief, ctx.claims, ctx.format),
      ledgerText(ctx.claims, { includeDropped: true }),
      dossierText(ctx.dossier, { maxVerbatims: 60, claims: ctx.claims }),
      CACHE_BREAK,
      cold,
      mech,
      `THE DRAFT (block ids in brackets; ledger tags as written; ${args.draft.word_count} words):\n${sectionsWithIds(args.draft.sections)}`,
      args.draft.needs_source.length ? `NEEDS SOURCE lines in the draft:\n${args.draft.needs_source.map((n) => `- ${n}`).join("\n")}` : "",
      args.retryNote ? `CORRECTION (your previous verdict was malformed; fix exactly this):\n${args.retryNote}` : "",
      `Run the review. Return the JSON verdict.`,
    ].filter(Boolean).join("\n\n");
  },
};
