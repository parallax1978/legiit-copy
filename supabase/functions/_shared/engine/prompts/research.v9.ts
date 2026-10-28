/**
 * Research prompt, version 9: version 8's messages, with three hunts for the facts a hook and a claim can stand on:
 * each competitor's own documentation of what its tool computes and what it leaves the user to decide; what is odd,
 * against type or checkable about the product, with one named case from a public run; and the speaker's own record and
 * any stake against his own interest. All from sources, nothing composed. The system text carries the standard as of
 * this version (Section 3's hooks and the masters' opening moves).
 */
import researchV8 from "./research.v8.ts";
import { amend, type PromptModule } from "./types.ts";

export * from "./research.v8.ts";

type Args = Parameters<typeof researchV8.user>[1];

const SYSTEM = amend(researchV8.system, [
  [
    `so the argument can tell what is new to the reader; mechanism_named,`,
    `so the argument can tell what is new to the reader; read each competitor's own documentation (its help pages, docs or methodology page) for what its tool computes and what it leaves the user to decide, and record both among its top claims in the competitor's words with the page in sources, so the copy never says the reader's tool does or lacks something its makers say otherwise; mechanism_named,`,
  ],
  [
    `- proof_inventory: every proof item found, with evidence_type, grade A-F per Section 8.2, source, exact quote, and ledger_ref when <claims> already holds it (copy the id exactly).`,
    `- proof_inventory: every proof item found, with evidence_type, grade A-F per Section 8.2, source, exact quote, and ledger_ref when <claims> already holds it (copy the id exactly). Hunt for the facts a hook can stand on (Section 3): what is odd, against type or checkable about the product (a decision it makes that its category leaves to the user, a result it refuses to give, a public run with one named case and its reason), each with its source.`,
  ],
  [
    `- story_inventory: documented events only, with date, numbers, named people and the source. Nothing composed.`,
    `- story_inventory: documented events only, with date, numbers, named people and the source. Look for the speaker's own record (what he built, sold, counted or decided, with numbers and dates) and any stake he holds against his own interest (a seller telling buyers what not to buy), and put that stake in speaker.stake with its source. Nothing composed.`,
  ],
]);

const researchPrompt: PromptModule<Args> = { ...researchV8, version: 9, system: SYSTEM };

export default researchPrompt;
