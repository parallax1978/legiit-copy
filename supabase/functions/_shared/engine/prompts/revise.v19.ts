/**
 * Revise prompt, version 19: the writer's prompt (draft v19) carried into revision. The system text says how the
 * masters wrote and what a fix must read like, the revision discipline the desk checks by machine, and the owner's
 * tells; the rulebook stays with the reviewers whose notes the revision answers. The user message carries the
 * material said plainly once (draft/brief_text.ts), the notes, and the draft.
 */
import { CACHE_BREAK, type PromptModule } from "./types.ts";
import { OWNER_TELLS } from "./standard.ts";
import type { ReviseArgs } from "./revise.v1.ts";
import { NEVER, WRITER } from "./draft.v19.ts";
import { sectionsWithIds } from "../draft/prompt_text.ts";
import { dealText, factsText, pieceText, voiceLine } from "../draft/brief_text.ts";
import { parseOptions } from "../draft/options.ts";
import { exemptTermsFrom } from "../tells.ts";

export type { ReviseArgs };

export const REVISION = `You are revising a piece you wrote, from the copy chief's notes, the factual reviewer's flags and the mechanical report. You change only the lines the notes quote or name; every other sentence comes back word for word. A fix is written the way the rest of the piece is written: in his words, at full strength, with its tag; never a note, never a hedge, never a smaller promise, never a synonym swapped into a weak line (the line is rebuilt from what it claims and what proves it).

Revision discipline (the desk checks these by machine after you return):

1. Change only blocks a note quotes or names. A block no note refers to is returned exactly as it was; the desk reverts any other edit, and the fix in it with it.
2. DO NOT TOUCH lines come back exactly as written, inside whichever block holds them. The revision fails if one changes.
3. The order of work, each on its own lines: (a) THE ONE THING first, rebuilt from its claim and its proof; (b) factual: each rewrite as given, tags kept; where the rewrite is null the invented item is cut; (c) mechanical: every Tier 0 hit and every quoted Tier 1 tell, the sentence rebuilt so it reads well and loses the tell; (d) the secondary notes, each on its quoted line; (e) the cold read's drop line, only when a note or a tell already touches it.
4. A fix never adds a hedge ("may", "can help", "results vary"), a fact the list lacks, or a tag the list does not show; never changes a number, a price, a guarantee, a deadline or the button verb.
5. Keep block ids. A referenced block may split in two (new id "<old id>a") or go when its note says cut. Never add, remove or reorder sections. Never touch a block to improve it.
6. Report every change in "changes": block_id, before, after, reason (which note), source (editorial | factual | mechanical | cold_read). List every DO NOT TOUCH line you confirmed unchanged in "untouched_confirmed".
7. Return only the JSON with the complete sections array: every section, every block, changed or not.`;

const SYSTEM = [WRITER, "", REVISION, "", NEVER, "", OWNER_TELLS].join("\n");

export const revisePrompt: PromptModule<ReviseArgs> = {
  step: "revise",
  version: 19,
  effort: "high",
  maxTokens: 12000,
  system: SYSTEM,
  user: (ctx, args) => {
    const options = parseOptions(ctx.generation.options);
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
      ? `FACTUAL FLAGS (the engine's own errors: cut each fabrication; fix a line that misquotes a fact or the deal by correcting only the misquoted number, name or term; a line that says more about what the product or a named tool does than its fact holds says what the fact says, at full strength, never taking a hedge, a weakening detail or a smaller promise from the rewrite):\n${args.factual.map((f, i) => `  ${i + 1}. [test ${f.test}, ${f.severity}${f.fabrication ? ", FABRICATION: cut the invented item" : ""}] quote: "${f.quote}"\n     rule: ${f.rule}\n     issue: ${f.issue}\n     rewrite: ${f.suggested_rewrite ?? "(cut)"}`).join("\n")}`
      : "FACTUAL FLAGS: none pending.";
    const m = args.mechanical;
    const mechText = m
      ? `MECHANICAL REPORT: tell score ${m.tell_score_per_300} per 300 words${m.hard_fail ? `; HARD FAIL: ${m.hard_fail_reasons.join("; ")}` : ""}${m.format_gate_failures.length ? `; format gates failed: ${m.format_gate_failures.join("; ")}` : ""}${m.cadence_flag ? "; sentence-length variation below the floor (vary lengths in the lines you touch)" : ""}\nTier 0/1 tells to fix (quoted):\n${m.flags.filter((f) => f.tier <= 1).map((f) => `  - T${f.tier} ${f.tell} ×${f.count}: ${f.examples.map((e) => `"${e}"`).join(", ")} → ${f.fix}`).join("\n") || "  none"}\nTier 2/3 (fix only inside lines you already touch):\n${m.flags.filter((f) => f.tier >= 2).map((f) => `  - T${f.tier} ${f.tell} ×${f.count}: ${f.examples.slice(0, 3).map((e) => `"${e}"`).join(", ")}`).join("\n") || "  none"}`
      : "MECHANICAL REPORT: none available.";
    const cold = args.coldRead ? `COLD READ: attention dropped at "${args.coldRead.attention_drop_line ?? "never"}"; disbelieved "${args.coldRead.disbelieved_claim ?? "nothing"}"; read the promise as: ${args.coldRead.promise_one_sentence}` : "";
    return [
      // stable per generation first, so every revision cycle reads it from the cache
      pieceText(ctx.format, options),
      factsText(ctx.claims, ctx.format),
      dealText(ctx.variant, ctx.brief, ctx.claims, ctx.format, options),
      voiceLine(ctx.voice, ctx.config?.greeting, exemptTermsFrom(ctx.offer?.name, ctx.brief?.product_name)),
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
