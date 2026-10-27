/**
 * Factual review prompt, version 10: version 9's messages; the consistency check compares the guarantee sentence on a
 * page that takes payment, and the guarantee's condition and remedy in a piece that does not (docs/04 rule 16, §8.1
 * and §8.3 test 8), so a short piece's one-line promise is not flagged back to the full sentence. The system text
 * carries the standard's sections 7.1 and 8 as of this version (a quotation of a documented person or source keeps
 * its words, test 8's guarantee scope).
 */
import { factualPrompt as factualPrev, type FactualArgs } from "./factual.v9.ts";
import { amend, type PromptModule } from "./types.ts";

export type { FactualArgs };

const SYSTEM = amend(factualPrev.system, [
  [
    `names, deliverables, price and plan, added costs, guarantee sentence, deadline and mechanism, delivery promise, button verb. ok=false with each mismatch stated as "draft says X; offer block says Y".`,
    `names, deliverables, price and plan, added costs, the guarantee sentence on a page that takes payment (in a post, an ad, an email, a message or a podcast read, which state the offer in one line, the guarantee's condition and remedy, not its sentence: rule 16), deadline and mechanism, delivery promise, button verb. ok=false with each mismatch stated as "draft says X; offer block says Y".`,
  ],
]);

export const factualPrompt: PromptModule<FactualArgs> = { ...factualPrev, version: 10, system: SYSTEM };
