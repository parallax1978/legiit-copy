import { z } from "zod";
import { ClaimType, Severity } from "./common.ts";
import { Block } from "./draft.ts";

export const ColdRead = z.object({
  skim_readback: z.object({ what_sold: z.string(), to_whom: z.string(), price: z.string(), why_believe: z.string() }),
  attention_drop_line: z.string().nullable(),
  disbelieved_claim: z.string().nullable(),
  promise_one_sentence: z.string(),
  lead_pick: z.object({ chosen_lead_id: z.string(), reason: z.string() }).nullable(),
  /** what the reader felt at line one and at the turn, in a sentence, or "nothing" (cold read v3) */
  felt: z.string().nullable().default(null),
  /** the words a reader outside the trade stopped at, quoted (cold read v3) */
  stumbled: z.array(z.string()).default([]),
  /** sentences the reader had to read twice for their word order or build, each with how he would say it aloud (cold read v4) */
  reread: z.array(z.object({ line: z.string(), say_it: z.string() })).default([]),
});
export type ColdRead = z.infer<typeof ColdRead>;

const Note = z.object({ quote: z.string(), fails: z.string(), do: z.string() });

export const EditorialVerdict = z.object({
  verdict: z.enum(["REJECT", "REVISE", "APPROVE"]),
  reject_gate: z.enum(["A", "B", "C", "D"]).nullable(),
  prediction: z.enum(["beat", "lose", "unsure"]),
  prediction_reason: z.string(),
  argument_readback: z.object({ sells: z.string(), to: z.string(), promise: z.string(), because: z.string(), matches_memo: z.boolean() }),
  skim_readback: z.string(),
  what_works: z.array(z.object({ quote: z.string(), why: z.string() })).max(3),
  one_thing: Note.nullable(),
  secondary_notes: z.array(Note).max(5),
  do_not_touch: z.array(z.string()),
  testable_disputes: z.array(z.string()),
  calibration: z.object({
    argument: z.number().min(0).max(3),
    proof: z.number().min(0).max(3),
    pacing: z.number().min(0).max(3),
    offer: z.number().min(0).max(3),
    specificity: z.number().min(0).max(3),
    reader_focus: z.number().min(0).max(3),
    rhythm: z.number().min(0).max(3),
  }),
  sentence_job_audit: z.object({ untagged_sentences: z.array(z.string()), paragraphs_without_claim_or_proof: z.array(z.string()) }),
});
export type EditorialVerdict = z.infer<typeof EditorialVerdict>;

export const TellFlag = z.object({ tier: z.number().min(0).max(3), tell: z.string(), weight: z.number(), count: z.number(), examples: z.array(z.string()), fix: z.string() });
export const MechanicalReport = z.object({
  tell_score_per_300: z.number(),
  flags: z.array(TellFlag),
  hard_fail: z.boolean(),
  hard_fail_reasons: z.array(z.string()),
  fk_grade: z.number().nullable(),
  /** the Hemingway grade's index (automated readability index): the number the owner reads his copy by */
  ari_grade: z.number().nullish(),
  cadence_cv: z.number().nullable(),
  cadence_flag: z.boolean(),
  and_then_count: z.number(),
  format_gate_failures: z.array(z.string()),
  word_count: z.number(),
  /** Hits of the owner's tells and words (docs/04 §7.1) in the piece; two or more Tier 1 hits are the stack. */
  owner_tells: z.number().optional(),
});
export type MechanicalReport = z.infer<typeof MechanicalReport>;

export const FactualFlag = z.object({
  quote: z.string(),
  rule: z.string(),
  issue: z.string(),
  suggested_rewrite: z.string().nullable(),
  severity: Severity,
  claim_type: ClaimType,
  claim_id: z.string().nullable(),
  test: z.number().min(1).max(10).describe("which of the ten factual-review tests raised it"),
  fabrication: z.boolean().describe("true only when the copy states a number, statistic, study, named person or customer, testimonial, quote, credential or someone's result that no usable ledger row holds; never for a promise of the result, reason-why logic, the reader's situation or what the product does"),
});
export const FactualOutput = z.object({
  flags: z.array(FactualFlag),
  consistency_check: z.object({ ok: z.boolean(), mismatches: z.array(z.string()) }),
  needs_source: z.array(z.string()).describe("lines holding a number, name, study, quote, credential, price or date the ledger lacks; never a promise of the result, reason-why or the reader's situation"),
});
export type FactualOutput = z.infer<typeof FactualOutput>;

export const RevisionOutput = z.object({
  sections: z.array(z.object({ section_id: z.string(), title: z.string().nullable(), blocks: z.array(Block) })),
  changes: z.array(z.object({ block_id: z.string(), before: z.string(), after: z.string(), reason: z.string(), source: z.enum(["editorial", "factual", "mechanical", "cold_read"]) })),
  untouched_confirmed: z.array(z.string()).describe("DO NOT TOUCH lines confirmed unchanged"),
});
export type RevisionOutput = z.infer<typeof RevisionOutput>;

export const ShipOutput = z.object({
  control_draft_version: z.number(),
  challenger_lead_id: z.string().nullable(),
  test_variable: z.string().nullable(),
  prediction: z.enum(["beat", "lose", "unsure"]),
  prediction_reason: z.string(),
  user_attention: z.array(z.string()).describe("flags and open questions the user must look at"),
  /** the shipped copy is the final revision: the last review's notes applied, checked, not reviewed again */
  final_pass: z.boolean().optional(),
});
export type ShipOutput = z.infer<typeof ShipOutput>;
