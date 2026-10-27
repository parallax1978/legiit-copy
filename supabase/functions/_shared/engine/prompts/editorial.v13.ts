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
  // the proof standard (strength order, the no-results carriers, the obvious demonstration) is the copy chief's too
  [`## 7. AI tell checklist`, `${PROOF_PLACEMENT}\n## 7. AI tell checklist`],
  [
    `- one_thing and secondary_notes: quote exact lines; fails names the gate or rule in one sentence; do gives direction and at most one rewritten line.`,
    `- At Gate A, a reason to believe built only from what the reader's current tool already shows them (the competitor table's columns, scores and filters) is no reason: fail Gate A and point the do at what the reader's tool does not do. At Gate C, a piece that describes the product and never says what the reader ends up with (the rankings, the customers, the money) fails.\n- one_thing and secondary_notes: quote exact lines; fails names the gate or rule in one sentence; do gives direction and at most one rewritten line. A note on a promise strengthens its carrier and never sizes the promise down or adds a hedge ("some", "could").`,
  ],
]);

export const editorialPrompt: PromptModule<EditorialArgs> = { ...editorialPrev, version: 13, system: SYSTEM };
