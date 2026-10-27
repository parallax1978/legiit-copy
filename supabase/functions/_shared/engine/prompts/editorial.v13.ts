/**
 * Editorial prompt, version 13: version 12's messages. A reason to believe built from what the reader's current tool
 * already shows them fails Gate A; a note on a promise strengthens its carrier and never sizes it down; the copy chief reads the
 * proof standard (section 4: strength order, the no-results carriers, the demonstration that shows only the obvious). The system text carries the standard as of this version (sell the result, rule 8; precision never sizes a promise down, rule 10; a line true only with a weakening detail is rewritten, rule 12; the short-piece guarantee only when the offer leads with it, rule 16; indicative with no conditional voice, rule 20; section 2's promise, C8 and C9; section 4's no-results proof and the obvious demonstration; the first-week check, section 5; Gates A and C and the reviewer's directions, section 6; the outcome, reasoning and situation rows, grade F and the factual procedure, section 8).
 */
import { editorialPrompt as editorialPrev, type EditorialArgs } from "./editorial.v12.ts";
import { amend, type PromptModule } from "./types.ts";
import { PROOF_PLACEMENT } from "./standard.ts";

export type { EditorialArgs };

const SYSTEM = amend(editorialPrev.system, [
  [
    `check each against the ledger rows for existence, precision and grade. [[NEEDS SOURCE]] marks a fact the ledger lacks: a Gate C failure when the fact is load-bearing.`,
    `check each against the ledger rows for existence and precision, and a health claim also for its grade; a promise of the result that cites a feature, mechanism, process or offer row is carried at any grade (§8.2). [[NEEDS SOURCE]] marks a fact the ledger lacks: a Gate C failure when it marks a load-bearing number, name, study, quote, credential, price or date. On a promise of the result, reason-why logic, the reader's situation or what the product does, the mark is the writer's error: the note says to drop the mark and keep the line at full strength.`,
  ],
  // the proof standard (strength order, the no-results carriers, the obvious demonstration) is the copy chief's too
  [`## 7. AI tell checklist`, `${PROOF_PLACEMENT}\n## 7. AI tell checklist`],
  [
    `- one_thing and secondary_notes: quote exact lines; fails names the gate or rule in one sentence; do gives direction and at most one rewritten line.`,
    `- At Gate A, a reason to believe built only from what the reader's current tool already shows them (the competitor table's columns, scores and filters) is no reason: fail Gate A and point the do at what this product does with it that the reader's tool does not (the decision it makes for them). A reason-why that uses such a fact ("advertisers stop paying for clicks that never buy") is a reason the market accepts: it stays, as the reason for what this product does, and no note cuts the only line that carries part of the promise. At Gate C, a piece that describes the product and never says what the reader ends up with (the rankings, the customers, the money) fails, and so does one that says only part of a promise of two results (the rankings, never the customers they bring).\n- one_thing and secondary_notes: quote exact lines; fails names the gate or rule in one sentence; do gives direction and at most one rewritten line. A note on a promise strengthens its carrier from what is on file (a ledger row, the demonstration, the mechanism, reason-why logic the market accepts, the founder's call) and never with a number, name, quote or result the ledger lacks; it never sizes the promise down or adds a hedge ("some", "could").`,
  ],
]);

export const editorialPrompt: PromptModule<EditorialArgs> = { ...editorialPrev, version: 13, system: SYSTEM };
