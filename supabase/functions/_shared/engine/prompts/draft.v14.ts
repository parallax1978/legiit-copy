/**
 * Draft prompt, version 14: version 13's messages, with the leads job written from the masters' hooks (docs/04
 * Section 3): the three leads stand on three different facts with three different opening moves, line one holds one
 * thought and line two pays it off, and the four rejected opening shapes are named; a long lead opens the same way.
 * Ledger discipline 6 says the reader's state plainly, never in a hook as an account of what he did, and Section 11's
 * exemplars from the masters sit before the voice rules, studied and never reproduced. The system text
 * carries the standard as of this version (Section 3's hooks and the masters' opening moves; rules 2, 7 and 11 say the
 * reader's state plainly as his situation, never in a hook as an account of what he did; Section 7.1 tells 14 to 17).
 */
import { draftPrompt as draftPrev, type DraftArgs } from "./draft.v13.ts";
import { amend, type PromptModule } from "./types.ts";
import { EXEMPLARS } from "./standard.ts";

export type { DraftArgs };

const HOOK_JOB_V1 = `Each lead is a hook: inside the section's band; line one says the reader's problem plainly, in words the reader would use, with a concrete thing from the reader's world (the tool, the task, the money or the hours) and what it costs them; it states the claim directly: no reframe that presents one thing as another, no "Here's the..." windup, no teaser that withholds nothing specific; read aloud, it is a sentence the speaker would say to one reader across a table, not a line for a poster; a number about the product's own output is proof for the next line, never the hook; one claim a skeptic would doubt; ends on an open loop that the body pays off; the speaker's credentials and the product's name wait for the body; ledger tags on every fact.`;

const HOOK_JOB = `Each lead is a hook (Section 3, Hooks), inside the section's band. Write it from facts, not phrasing. Pick three different facts a hook can stand on (from the reader's world in the verbatims and the plain facts of his work, the ledger rows, the story inventory, the proof the reader can open) and a different opening move from Section 3 for each; the plan is one line per lead, written as the start of its reader_hypothesis (the move's name, then the fact), and that is all the planning it needs. Then write each lead once, with no alternative drafts. When the ledger holds the speaker's own record or a number this reader has not seen, one of the three leads with it. Line one: one thought; a first sentence of about twelve words or fewer (an If-clause carrying the reader's own want may run longer); a concrete thing from the reader's world or a ledger number; said as the speaker would say it to one reader across a table. Line two pays line one off at once: the specifics, the proof with its ledger tag, the next beat or the objection answered. Never tell the reader his own history or habit as a fact; a mistake is named so he convicts himself (a question he answers, an If, someone else, "we"). A tool, score or list is never the subject that says, rates, hides, hands or leaves him something. Line one never ends on a verdict about itself. No reframe, aphorism, slogan, windup, or teaser that withholds nothing specific. Never say what the reader's current tool does or leaves him to do unless a ledger row says it. A number about the product's own output is proof for line two or three, never line one. One claim a skeptic would doubt; end on an open loop the body pays off. The product's name waits for the body, and so does the speaker's credential unless it is the surprise the hook turns on. Ledger tags on every fact. The examples in Section 3 teach the moves; six words in a row from one never appear in a lead.`;

const LONG_LEAD_V1 = `Each lead: inside the section's band; cut from the top (the first sentence is already inside the story or the claim); the speaker identified by word 150; one claim a skeptic would doubt; the mechanism named at most, never explained; ends on an open loop that the body pays off; ledger tags on every fact.`;

const LONG_LEAD = `Each lead: inside the section's band; cut from the top (the first sentence is already inside the story or the claim); the three leads stand on three different facts, and each opens with one of the moves in Section 3, Hooks, never telling the reader his own history, making a tool the one that speaks, ending its first line on a verdict or reading as a slogan (Section 7.1, tells 14 to 17); the speaker identified by word 150; one claim a skeptic would doubt; the mechanism named at most, never explained; ends on an open loop that the body pays off; ledger tags on every fact.`;

/** Version 13's user message with version 14's leads job: each old text, when the call carries it, occurs once and is replaced. */
export function leadsJob(user: string): string {
  let out = user;
  for (const [old, next] of [[HOOK_JOB_V1, HOOK_JOB], [LONG_LEAD_V1, LONG_LEAD]] as const) {
    const n = out.split(old).length - 1;
    if (n > 1) throw new Error(`draft v14: the leads job occurs ${n} times`);
    if (n === 1) out = out.replace(old, () => next);
  }
  return out;
}

const SYSTEM = amend(draftPrev.system, [
  // the masters' exemplars for the jobs after the hook (docs/04 Section 11): studied, never reproduced
  [`## Voice\n`, `${EXEMPLARS}\n\n## Voice\n`],
  [
    `The substance of the reader's state comes from the verbatims and the plain facts of the reader's work, said as one concrete thing that happened to the reader, at full strength, in the speaker's words (rule 11), never in a verbatim's survey wording and never sized down.`,
    `The substance of the reader's state comes from the verbatims and the plain facts of the reader's work, said plainly at full strength in the speaker's words (rule 11), never in a verbatim's survey wording and never sized down; a hook never recounts it as something the reader did, with or without what it cost him (Section 3).`,
  ],
]);

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 14, system: SYSTEM, user: (ctx, args) => leadsJob(draftPrev.user(ctx, args)) };
