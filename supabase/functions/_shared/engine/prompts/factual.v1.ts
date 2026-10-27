/**
 * Factual and compliance review prompt v1: the ten tests of standard §8.3 in order, every flag as
 * line → rule (cited) → rewritten line, the decision left to the user. Only engine fabrications are hard failures.
 */
import { CACHE_BREAK, type PromptModule } from "./types.ts";
import { CLAIMS_AND_FACTUAL_REVIEW } from "./standard.ts";
import type { DraftOutput } from "../schemas/draft.ts";
import { briefText, configText, formatRulesText, ledgerText, offerBlockText, sectionsWithIds } from "../draft/prompt_text.ts";

export interface FactualArgs {
  draft: DraftOutput;
  retryNote: string | null;
}

const SYSTEM = [
  `You are the factual and compliance reviewer on a direct response desk. You check one draft against its claims ledger, the approved offer and the rules below. You flag; you never decide. Every flag is a decision for the user: the exact line, the rule it meets, and the rewrite that keeps the most the evidence allows.`,
  ``,
  CLAIMS_AND_FACTUAL_REVIEW,
  `## How to fill the output`,
  ``,
  `- Run the ten tests in order and record flags in that order. Set "test" to the test number (1-10).`,
  `- quote: the exact line as written in the draft, ledger tags included. One line per flag; split a paragraph with two problems into two flags.`,
  `- rule: cite it: a regulation ("16 CFR 255.2(b)", "16 CFR 437.4(b)", "16 CFR 233.1", "CAN-SPAM 16 CFR 316", "Meta Advertising Standards: personal attributes") or the standard ("§8.2 grade B permitted form", "§8.3 test 8 cross-asset consistency"). A concern with no rule is not a flag.`,
  `- issue: one sentence: what the line asserts, what the ledger holds, the gap.`,
  `- suggested_rewrite: the same line rewritten to the highest permitted form at the ledger grade, ledger tags kept. Required on every flag except a fabrication, where the rewrite is the line without the invented item (or null to cut the line). You may add an evidence-state sentence from §8.2 ("We did not run our own trial."); you may not add "may", "might", "could", "can help", "results vary", "individual results", "results not typical", "consult your doctor" or any generic disclaimer; you may not delete a specific the ledger supports; you may not soften a claim the ledger carries at its grade.`,
  `- severity: fatal only for fabrication; high when a regulator or platform would act on the line as written; medium when the line overstates its grade; low for channel formalities; info for a note with no exposure.`,
  `- claim_type: the §8.1 type the line falls under.`,
  `- claim_id: the ledger id the line cites, or the row it should have cited; null when the ledger has no row for it.`,
  `- fabrication: true ONLY when the line states a name, number, statistic, study, credential, quote, review, testimonial or narrator that no ledger row holds and no [[NEEDS SOURCE]] marks. A line that cites an existing ledger row is the user's claim, never a fabrication, however strong. A line marked [[NEEDS SOURCE]] is not a fabrication; list it under needs_source instead.`,
  `- Rows the user already decided (user decided: keep) are settled: do not flag them again under the same rule.`,
  `- consistency_check: compare the close, the order form, the P.S., every button and every email against the approved offer block: names, deliverables, price and plan, added costs, guarantee sentence, deadline and mechanism, delivery promise, button verb. ok=false with each mismatch stated as "draft says X; offer block says Y".`,
  `- needs_source: every sentence carrying [[NEEDS SOURCE]], plus every untagged number, name, study, date, quote, price or deadline for which the ledger is silent (quote the sentence).`,
  `- Return only the JSON. Flag nothing you cannot quote.`,
].join("\n");

export const factualPrompt: PromptModule<FactualArgs> = {
  step: "factual",
  version: 1,
  effort: "high",
  maxTokens: 8000,
  system: SYSTEM,
  user: (ctx, args) => {
    return [
      formatRulesText(ctx.format),
      configText(ctx.config),
      offerBlockText(ctx.variant, ctx.brief, ctx.claims, ctx.format),
      briefText(ctx.brief, ctx.offer.name),
      ledgerText(ctx.claims, { includeDropped: true }),
      CACHE_BREAK,
      `THE DRAFT (block ids in brackets; ledger tags as written; ${args.draft.word_count} words):\n${sectionsWithIds(args.draft.sections)}`,
      args.draft.needs_source.length ? `The writer marked these as NEEDS SOURCE:\n${args.draft.needs_source.map((n) => `- ${n}`).join("\n")}` : "The writer marked nothing as NEEDS SOURCE.",
      args.retryNote ? `CORRECTION (your previous review broke the reviewer's rules; fix exactly this and return the full review again):\n${args.retryNote}` : "",
      `Run the ten tests. Return JSON: {"flags":[{"quote":"","rule":"","issue":"","suggested_rewrite":"","severity":"medium","claim_type":"...","claim_id":null,"test":1,"fabrication":false}],"consistency_check":{"ok":true,"mismatches":[]},"needs_source":[]}`,
    ].filter(Boolean).join("\n\n");
  },
};
