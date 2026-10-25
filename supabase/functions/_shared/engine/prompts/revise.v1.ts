/**
 * Revise prompt v1. Changes only referenced blocks, honors DO NOT TOUCH, applies factual rewrites as given,
 * fixes Tier 0/1 tells. The step verifies all of that in code afterwards.
 */
import { CACHE_BREAK, type PromptModule } from "./types.ts";
import { RULES } from "./standard.ts";
import type { DraftOutput } from "../schemas/draft.ts";
import type { ColdRead, EditorialVerdict, FactualOutput, MechanicalReport } from "../schemas/review.ts";
import { formatRulesText, ledgerText, offerBlockText, sectionsWithIds, voiceText } from "../draft/prompt_text.ts";

export interface ReviseArgs {
  draft: DraftOutput;
  editorial: EditorialVerdict | null;
  factual: FactualOutput["flags"];
  mechanical: MechanicalReport | null;
  coldRead: ColdRead | null;
  cycle: number;
  retryNote: string | null;
}

const SYSTEM = [
  `You are the writer on a direct response copy desk, revising your draft from the copy chief's notes, the factual reviewer's flags and the mechanical report. You change only the lines the notes reference. Everything else stays exactly as written.`,
  ``,
  RULES,
  `## Revision discipline (verified by machine after you return)`,
  ``,
  `1. Change only blocks a note quotes. A block no note refers to is returned byte for byte as it was; the desk reverts any other edit.`,
  `2. DO NOT TOUCH lines are returned exactly as written, inside whichever block holds them. The revision fails if one of them changes.`,
  `3. Passes, in this order, each on its own lines: (a) strategy: THE ONE THING first, rebuilt from its claim and carrier, not re-worded; (b) factual: apply each suggested rewrite as given, ledger tags kept; where the rewrite is null the invented item is cut; (c) mechanical: remove every Tier 0 hit (placeholders, assistant residue, unledgered authorities, bold-label-colon bullets, "AI" for a non-AI product) and every Tier 1 tell in the quoted examples by rebuilding the sentence from its claim and carrier; (d) secondary notes, each on its quoted line; (e) the cold read's attention-drop line, only if a note or tell already touches it.`,
  `4. No Word-Substitute rewriting: a weak line is rebuilt from what it claims and what proves it, never re-worded with synonyms. A fix never adds a hedge ("may", "can help", "results vary"), never adds a fact the ledger lacks, never adds a ledger id the ledger does not show, never changes a number, price, guarantee, deadline or button verb.`,
  `5. Keep block ids. You may split a referenced block into two (new id "<old id>a") or delete a referenced block whose note says cut. Never add, remove or reorder sections. Never touch a block to "improve" it.`,
  `6. Report every change in "changes": block_id, before (the old text), after (the new text), reason (which note), source (editorial | factual | mechanical | cold_read). List every DO NOT TOUCH line you confirmed unchanged in "untouched_confirmed".`,
  `7. Return only the JSON with the complete sections array: every section, every block, changed or not.`,
].join("\n");

export const revisePrompt: PromptModule<ReviseArgs> = {
  step: "revise",
  version: 1,
  effort: "high",
  maxTokens: 12000,
  system: SYSTEM,
  user: (ctx, args) => {
    const ed = args.editorial;
    const edText = ed
      ? [
          `COPY CHIEF VERDICT: ${ed.verdict}${ed.reject_gate ? ` at Gate ${ed.reject_gate}` : ""}; prediction ${ed.prediction} (${ed.prediction_reason})`,
          ed.one_thing ? `THE ONE THING:\n  quote: "${ed.one_thing.quote}"\n  fails: ${ed.one_thing.fails}\n  do: ${ed.one_thing.do}` : "THE ONE THING: none",
          ed.secondary_notes.length ? `SECONDARY NOTES:\n${ed.secondary_notes.map((n, i) => `  ${i + 1}. quote: "${n.quote}"\n     fails: ${n.fails}\n     do: ${n.do}`).join("\n")}` : "SECONDARY NOTES: none",
          ed.do_not_touch.length ? `DO NOT TOUCH (return these exactly):\n${ed.do_not_touch.map((l) => `  - "${l}"`).join("\n")}` : "DO NOT TOUCH: none listed",
          ed.what_works.length ? `WHAT WORKS (kept on purpose):\n${ed.what_works.map((w) => `  - "${w.quote}" (${w.why})`).join("\n")}` : "",
        ].filter(Boolean).join("\n")
      : "COPY CHIEF VERDICT: none available.";
    const factText = args.factual.length
      ? `FACTUAL FLAGS (apply each rewrite as given; the user has not decided to keep these):\n${args.factual.map((f, i) => `  ${i + 1}. [test ${f.test}, ${f.severity}${f.fabrication ? ", FABRICATION: cut the invented item" : ""}] quote: "${f.quote}"\n     rule: ${f.rule}\n     issue: ${f.issue}\n     rewrite: ${f.suggested_rewrite ?? "(cut)"}`).join("\n")}`
      : "FACTUAL FLAGS: none pending.";
    const m = args.mechanical;
    const mechText = m
      ? `MECHANICAL REPORT: tell score ${m.tell_score_per_300} per 300 words${m.hard_fail ? `; HARD FAIL: ${m.hard_fail_reasons.join("; ")}` : ""}${m.format_gate_failures.length ? `; format gates failed: ${m.format_gate_failures.join("; ")}` : ""}${m.cadence_flag ? "; sentence-length variation below the floor (vary lengths in the lines you touch)" : ""}\nTier 0/1 tells to fix (quoted):\n${m.flags.filter((f) => f.tier <= 1).map((f) => `  - T${f.tier} ${f.tell} ×${f.count}: ${f.examples.map((e) => `"${e}"`).join(", ")} → ${f.fix}`).join("\n") || "  none"}\nTier 2/3 (fix only inside lines you already touch):\n${m.flags.filter((f) => f.tier >= 2).map((f) => `  - T${f.tier} ${f.tell} ×${f.count}: ${f.examples.slice(0, 3).map((e) => `"${e}"`).join(", ")}`).join("\n") || "  none"}`
      : "MECHANICAL REPORT: none available.";
    const cold = args.coldRead ? `COLD READ: attention dropped at "${args.coldRead.attention_drop_line ?? "never"}"; disbelieved "${args.coldRead.disbelieved_claim ?? "nothing"}"; read the promise as: ${args.coldRead.promise_one_sentence}` : "";
    return [
      // stable per generation first, so every revision cycle reads it from the cache
      formatRulesText(ctx.format),
      offerBlockText(ctx.variant, ctx.brief, ctx.claims),
      ledgerText(ctx.claims),
      voiceText(ctx.voice, ctx.config?.greeting),
      CACHE_BREAK,
      `REVISION CYCLE ${args.cycle}.`,
      edText,
      factText,
      mechText,
      cold,
      `THE DRAFT (block ids in brackets; return every block, changed or not):\n${sectionsWithIds(args.draft.sections)}`,
      args.retryNote ? `CORRECTION (your previous revision was rejected; fix exactly this):\n${args.retryNote}` : "",
      `Revise. Return JSON: {"sections":[{"section_id":"","title":null,"blocks":[{"id":"","type":"","text":"","items":null,"meta":null}]}],"changes":[{"block_id":"","before":"","after":"","reason":"","source":"editorial"}],"untouched_confirmed":[]}`,
    ].filter(Boolean).join("\n\n");
  },
};
