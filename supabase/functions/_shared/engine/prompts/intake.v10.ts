/**
 * Intake prompt, version 10: version 9's messages. Grades A to E are for health claims and the seller's own product
 * is graded F and carries the promise; the seller's process statements are features or mechanisms, never "other";
 * missing customer results are asked once and never block; an unknown never covers whether the product gets results.
 * The system text carries the standard as of this version (sell the result, rule 8; precision never sizes a promise
 * down, rule 10; a line true only with a weakening detail is rewritten, rule 12; the short-piece guarantee only when
 * the offer leads with it, rule 16; indicative with no conditional voice, rule 20; section 2's promise, C8 and C9;
 * section 4's no-results proof; Gates A to C and the reviewer's directions, section 6; the outcome, reasoning,
 * situation and comparison rows, grades A to F for health claims and the factual procedure, section 8).
 */
import intakeV9 from "./intake.v9.ts";
import { amend, type PromptModule } from "./types.ts";

export * from "./intake.v9.ts";

type Args = Parameters<typeof intakeV9.user>[1];

const SYSTEM = amend(intakeV9.system, [
  [
    `urls found; unknowns (facts the sources do not settle).`,
    `urls found; unknowns (facts the sources do not settle: a price, a term, who signs, a number, a date; never whether the product produces the result it is sold for, which the copy promises from its mechanism and demonstration, rule 8).`,
  ],
  [
    `- claim_type per Section 8.1. role: promise | mechanism | proof | offer_term | credential | story | feature | other.`,
    `- claim_type per Section 8.1, in the schema's names: what the product does (its function, output or process) is feature, or mechanism when the row says how the product produces the result; the result the seller promises is benefit; a seller's own process statement is never other. role: promise | mechanism | proof | offer_term | credential | story | feature | other.`,
  ],
  [
    `- evidence_grade per Section 8.2 for every row that asserts an outcome, a result, a statistic, a mechanism or a credential: A an RCT on the finished product at the marketed dose; B an RCT on the ingredient at the same dose and form; C observational; D mechanistic, in vitro or animal; E anecdote, testimonial or traditional use; F none.`,
    `- evidence_grade per Section 8.2 for every row that asserts a health effect, a statistic, a study, a result someone got or a credential: A an RCT on the finished product at the marketed dose; B an RCT on the ingredient at the same dose and form; C observational; D a lab, in vitro or animal study of a health claim; E anecdote, testimonial or traditional use; F no outside evidence of results. A row that says what the seller's own product does or how it produces the result (a feature, an output, a process, the mechanism of software or a service) is substantiated by the product itself (Section 8.1): grade it F, never D, and it carries the promise of the result.`,
  ],
  [
    `the mechanism, the proof for the core promise, who exactly is sold to and how aware they are,`,
    `the mechanism (how the product produces the result), what the reader can try or see for themselves before paying (a trial, a free plan, a live check), any customer results on file (asked once and never blocking: the copy sells the result without them, rule 8), who exactly is sold to and how aware they are,`,
  ],
  [
    `no price or terms, no deliverables, no mechanism, no carrier for the core promise, or no identifiable reader.`,
    `no price or terms, no deliverables, no mechanism, or no identifiable reader. Missing customer results, testimonials or case studies never block: the mechanism, the trial and the guarantee carry the promise (rule 8).`,
  ],
]);

const intakePrompt: PromptModule<Args> = { ...intakeV9, version: 10, system: SYSTEM };

export default intakePrompt;
