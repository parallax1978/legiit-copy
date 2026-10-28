/**
 * Argument prompt, version 16: version 15's messages. The mechanism is what the product does for the reader, in his
 * words: what it looks at and what it decides or makes for him, covering everything in the brief's deliverables the
 * promise needs (a product that also makes the thing the reader would otherwise make or pay for is sold on making it),
 * never a technical input it computes, one step of its process or one of its internal labels; the search for
 * mechanism candidates reads the product that way, and C10 holds such a mechanism to at most 1. The system text carries
 * the standard as of this version (rules 1, 4 and 38: the product said as what it does for the reader and introduced
 * plainly; rule 8: no namedrop; rule 18: a time only when it is a reason to act; Section 2's mechanism; Gates C and D;
 * Section 7.1 tells 18 to 21).
 */
import argumentV15 from "./argument.v15.ts";
import { amend, type PromptModule } from "./types.ts";

export * from "./argument.v15.ts";

type Args = Parameters<typeof argumentV15.user>[1];

const SYSTEM = amend(argumentV15.system, [
  [
    `at least five from the mechanism in the process (how the product produces the result, step by step, mapped to ledger rows)`,
    `at least five from the mechanism (what the product does that produces the result, said as the reader would say it and mapped to ledger rows; one step of its process or a technical input it computes is never the mechanism)`,
  ],
  [
    `mechanism: a noun phrase that completes "prove that [mechanism] is a different and superior way";`,
    `mechanism: what the product does for the reader, in his words, as a noun phrase that completes "prove that [mechanism] is a different and superior way": what it looks at and what it decides or makes for him, covering everything in the brief's deliverables the promise needs (a product that also makes the thing the reader would otherwise make or pay for, the page, the email, the ad, is sold on making it); never a technical input it computes, one step of its process or one of its internal labels (a count, a score, a data source, a check it runs);`,
  ],
  [
    `C10 against the mechanism's two parts (why the usual fixes fail, why this one works) in one step;`,
    `C10 against the mechanism's two parts (why the usual fixes fail, why this one works) in one step, at most 1 for a mechanism told as a technical input, one step of the process or the product's internal labels;`,
  ],
]);

const argumentPrompt: PromptModule<Args> = { ...argumentV15, version: 16, system: SYSTEM };

export default argumentPrompt;
