/**
 * Step 2, offer construction: options sheet, chosen variant, denominated guarantee, deadline with mechanism,
 * premiums aimed at quoted worries, first visible win, promise/delivery gap note, and a ledger row per new term.
 * The pipeline pauses here: the offer changes what is sold, so the user approves it before drafting.
 */
import { type Effort, lowerEffort, MAX_TOKENS_PER_CALL, STEP_DEFAULTS } from "../config.ts";
import { callModel, TruncatedError } from "../llm.ts";
import offerPrompt from "../prompts/offer.v15.ts";
import { RETRY_MIN_BUDGET_MS } from "../draft/step_util.ts";
import { remainingBudgetMs } from "./budget.ts";
import { resolvePrompt } from "../prompts/types.ts";
import type { ClaimRowInput } from "../schemas/brief.ts";
import { OfferConstruction } from "../schemas/offer.ts";
import type { Dossier } from "../schemas/research.ts";
import { requireBrief } from "./research.ts";
import type { StepContext, StepFn, StepResult } from "./types.ts";

export const OFFER_PAUSE_REASON = "offer construction needs the user's approval";

export interface OfferDeps {
  call: typeof callModel;
}

export function requireDossier(ctx: StepContext): Dossier {
  if (ctx.dossier) return ctx.dossier;
  throw new Error("this step needs the active research dossier; run research first");
}

function blankRow(claim_text: string, claim_type: ClaimRowInput["claim_type"], role: ClaimRowInput["role"]): ClaimRowInput {
  return {
    claim_text,
    claim_type,
    role,
    evidence_grade: null,
    evidence: { source_ref: "offer construction", quote: null, endpoint: null, population: null, dose: null, duration: null, effect_size: null, provenance: null },
    precision: null,
    typical_result: null,
    earnings_context: null,
    material_connection: false,
    guarantee_terms: null,
    former_price: null,
    scarcity: null,
    deadline: null,
    trial_terms: null,
    story_claim: false,
    establishment_signal: false,
    status: "unverified",
    flag: null,
  };
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Every term the construction states must exist as a ledger row pending approval (Section 1, rule 14; Section 5).
 * Adds the guarantee, the deadline and any premium the model described but did not write a row for.
 */
export function ensureOfferLedgerRows(c: OfferConstruction): OfferConstruction {
  const rows = [...c.ledger_rows_to_add];
  const has = (pred: (r: ClaimRowInput) => boolean) => rows.some(pred);

  if (!has((r) => r.claim_type === "guarantee" || r.guarantee_terms !== null)) {
    const g = c.chosen.guarantee;
    rows.push({
      ...blankRow(g.denominated_text, "guarantee", "offer_term"),
      guarantee_terms: { text: g.denominated_text, days: g.days, conditions: g.terms || null, approver: null },
    });
  }

  if (c.chosen.deadline && !has((r) => r.claim_type === "scarcity_urgency" || r.deadline !== null)) {
    const dl = c.chosen.deadline;
    rows.push({
      ...blankRow(`Deadline: ${dl.date_or_rule} (${dl.mechanism})`, "scarcity_urgency", "offer_term"),
      deadline: { date_or_rule: dl.date_or_rule, mechanism: dl.mechanism },
      scarcity: { number: null, enforced: false },
    });
  }

  for (const p of c.chosen.premiums) {
    const name = norm(p.name);
    if (!name || has((r) => norm(r.claim_text).includes(name))) continue;
    rows.push({
      ...blankRow(`${p.name}${p.value_basis ? ` (value basis: ${p.value_basis})` : ""}`, "feature", "offer_term"),
    });
  }

  return OfferConstruction.parse({ ...c, ledger_rows_to_add: rows });
}

export function makeOfferStep(deps: Partial<OfferDeps> = {}): StepFn {
  const call = deps.call ?? callModel;
  return async (ctx) => {
    const brief = requireBrief(ctx);
    const dossier = requireDossier(ctx);
    const claims = ctx.claims.filter((c) => c.user_decision !== "drop");
    const p = resolvePrompt(ctx, offerPrompt);
    const d = STEP_DEFAULTS.offer;

    await ctx.progress(`Designing the offer for ${brief.product_name}: options sheet, guarantee, deadline, premiums`);
    const effort = (p.effort ?? d.effort) as Effort;
    const user = offerPrompt.user(ctx, { brief, claims, dossier, config: ctx.config });
    const run = (eff: Effort, retry: boolean) =>
      call({
        model: p.model ?? d.model,
        effort: eff,
        maxTokens: Math.min(p.maxTokens ?? d.maxTokens, MAX_TOKENS_PER_CALL),
        timeoutMs: remainingBudgetMs(ctx),
        system: p.system,
        user,
        schema: OfferConstruction,
        log: {
          db: ctx.db,
          workspaceId: ctx.generation.workspace_id,
          generationId: ctx.generation.id,
          step: "offer",
          attempt: ctx.attempt,
          purpose: retry ? "offer.construction.retry_less_thinking" : "offer.construction",
          promptVersionId: p.promptVersionId,
        },
      });
    let res;
    try {
      res = await run(effort, false);
    } catch (e) {
      // Thinking and the answer share max_tokens: when the thinking eats the budget, run once more with one rung
      // less thinking in this invocation, as the review steps do. Three identical truncations was the old failure.
      if (!(e instanceof TruncatedError) || effort === "low" || remainingBudgetMs(ctx) < RETRY_MIN_BUDGET_MS) throw e;
      await ctx.progress("The offer ran past its output budget; designing it again with less thinking");
      res = await run(lowerEffort(effort), true);
    }
    const output = ensureOfferLedgerRows(OfferConstruction.parse(res.output));

    const result: StepResult<OfferConstruction> = {
      output,
      model: res.model,
      summary: `Offer variant ${output.chosen.variant}: guarantee "${output.chosen.guarantee.denominated_text}"; deadline ${output.chosen.deadline ? `${output.chosen.deadline.mechanism} (${output.chosen.deadline.date_or_rule})` : "none"}; ${output.chosen.premiums.length} premium${output.chosen.premiums.length === 1 ? "" : "s"}; ${output.ledger_rows_to_add.length} ledger rows pending approval`,
      effects: {
        offerVariant: {
          optionsSheet: output.options_sheet,
          chosen: output.chosen,
          reasons: output.chosen.reasons,
          guarantee: output.chosen.guarantee,
          deadline: output.chosen.deadline,
          gapNote: output.promise_delivery_gap_note,
        },
        claimsToAdd: output.ledger_rows_to_add,
      },
      pause: { reason: OFFER_PAUSE_REASON },
    };
    return result;
  };
}

export const offerStep: StepFn = makeOfferStep();
