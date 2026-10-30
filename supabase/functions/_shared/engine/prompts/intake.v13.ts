/**
 * Intake prompt, version 13: version 12's messages, with where a fact comes from (docs/04 8.1). Each source and each
 * passage is read for what it is: the seller describing the product, an example of the product's output, the terms,
 * a third party or the user's own words; a <source> tag the app has already classified says so. What the product
 * does, how it produces the result and what it promises come only from the seller describing it and from the user;
 * an example of its output yields rows about that run only, naming its subject, and never what the product does,
 * checks or uses; a data provider or an internal computation is a technical input, never a mechanism or proof; a
 * credential is the source's own words, never upgraded; one_line covers everything the product makes for the buyer.
 * The code drops a selling row written from a sample and records it in unknowns. The system text carries the
 * standard as of this version (8.1's where a fact comes from; 8.3's fabrication guard).
 */
import intakeV12 from "./intake.v12.ts";
import { amend, type PromptModule } from "./types.ts";

export * from "./intake.v12.ts";

type Args = Parameters<typeof intakeV12.user>[1];

const SYSTEM = amend(intakeV12.system, [
  [
    `- Quote exactly. A number is the number the source states; a name is the name as written; a price is the price as written.`,
    `- Quote exactly. A number is the number the source states; a name is the name as written; a price is the price as written.

Where a fact comes from (Section 8.1)
- Before anything else, decide what each source is: the seller describing the product (its site, sales page, help pages), an example of the product's output (a shared, sample or demo report, an example plan, a case's deliverable, a screenshot, a "what you get" or "the plan" section that shows one named customer's run), the terms (legal, billing, data providers), a third party (a review, press, a competitor's page), or the user's own words. A <source> tag that carries provenance= is already decided by the app; decide the rest yourself. A sales page holds several of these at once: an example embedded in it is still an example, and every passage is read for what it is.
- Every row's evidence.provenance says which it came from: seller, sample_output, terms, third_party or user.
- What the product does (feature), how it produces the result (mechanism) and what it promises (benefit) come only from the seller describing it and from the user. An example of the output yields rows about that run only: a case or a result, role proof or story, story_claim true, with claim_text naming the example's subject ("In the sample plan for Pull Shot Coffee, one run judged 12 keyword groups and skipped six"). What the example did, showed, checked, read or used is never written as what the product does; the facts in it about the example's own site, market or rivals (its links, its rankings, its competitors) are that site's facts, never the product's. The app drops a feature, mechanism, promise or comparison row whose source is an example and records it in unknowns.
- A data provider, a model, a library, an API or an internal computation the product performs (a count, a score, a check, a data source it reads) is a technical input: at most one row, role other, never a mechanism row, never a feature to sell, never in proof_available. The mechanism row says what the product looks at and what it decides or makes for the buyer, in his words.
- A credential row quotes the source's own words ("From the team behind Legiit"), never upgraded to a founder, an owner or a person the source does not name.`,
  ],
  [
    `- product_name; one_line (what it is, for whom, in one sentence, no adjectives);`,
    `- product_name; one_line (what it is, for whom, and everything it makes for the buyer, in one sentence, no adjectives: read the deliverables first, so a tool that finds the pages a site can rank for and also writes them is said to do both, never only the first thing it does);`,
  ],
  [
    `proof_available (claim, evidence, source);`,
    `proof_available (claim, evidence, source: proof of the product, never a data provider, a technical input or a clause of the terms; an example of the product's output is listed as what it shows for its named subject);`,
  ],
]);

const intakePrompt: PromptModule<Args> = { ...intakeV12, version: 13, system: SYSTEM };

export default intakePrompt;
