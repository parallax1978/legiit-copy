/**
 * Research prompt, version 11: version 10's messages. A page that is an example of the product's output (a shared
 * report, a sample plan, a demo) is a demonstration proof item naming its subject; nothing in it is recorded as the
 * product's mechanism, a feature or a comparison with a competitor, and the facts in it about the example's own site
 * are that site's. The system text carries the standard as of this version (8.1's where a fact comes from).
 */
import researchV10 from "./research.v10.ts";
import { amend, type PromptModule } from "./types.ts";

export * from "./research.v10.ts";

type Args = Parameters<typeof researchV10.user>[1];

const SYSTEM = amend(researchV10.system, [
  [
    `Hunt for the facts a hook can stand on (Section 3):`,
    `A page that is an example of the product's output (a shared report, a sample plan, a demo, a case's deliverable) is one demonstration item, evidence_type demonstration, naming its subject and what it shows; nothing in it is recorded as the product's mechanism, a feature or a comparison with a competitor, and the facts in it about the example's own site, market or rivals are that site's facts, never the product's (Section 8.1, where a fact comes from). Hunt for the facts a hook can stand on (Section 3):`,
  ],
]);

const researchPrompt: PromptModule<Args> = { ...researchV10, version: 11, system: SYSTEM };

export default researchPrompt;
