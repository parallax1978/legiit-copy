/**
 * Intake prompt, version 17: version 16's messages, with the one_line written as a friend would say it (software is a
 * tool or an app, never "a service"; twenty words or fewer where the deliverables allow; no label from the product's
 * screens), and, when an example of the product's output shows its decisions, one row per decision (up to three): the
 * thing decided, the verdict, what it read or compared, and the reason, so copy can tell one decision whole instead
 * of counts. The system text carries the standard as of this version.
 */
import intakeV16 from "./intake.v16.ts";
import { amend, type PromptModule } from "./types.ts";

export * from "./intake.v16.ts";

type Args = Parameters<typeof intakeV16.user>[1];

const SYSTEM = amend(intakeV16.system, [
  [
    `- product_name; one_line (what it is, for whom, and everything it makes for the buyer, in one sentence, no adjectives: read the deliverables first, so a tool that finds the pages a site can rank for and also writes them is said to do both, never only the first thing it does);`,
    `- product_name; one_line (what it is, for whom, and everything it makes for the buyer, in one plain sentence a friend would say, twenty words or fewer where the deliverables allow, no adjectives, no label from the product's own screens: software is a tool or an app, never "a service", and a service is people doing the work; read the deliverables first, so a tool that finds the pages a site can rank for and also writes them is said to do both, never only the first thing it does);`,
  ],
  [
    `with claim_text naming the example's subject ("In the sample plan for Pull Shot Coffee, one run judged 12 keyword groups and skipped six").`,
    `with claim_text naming the example's subject ("In the sample plan for Pull Shot Coffee, one run judged 12 keyword groups and skipped six"). When the example shows its decisions, one row per decision for up to three decisions (role proof, story_claim true): the thing decided, the verdict, what it read or compared (the sites or pages it names, the numbers it shows) and the reason the example gives, in one claim_text, so copy can tell one decision whole ("In the sample plan for Pull Shot Coffee, the run said build the espresso bean subscription page: 33,590 searches a month, the top ten were two thin subscription pages and a forum thread, so a new page could take a spot").`,
  ],
]);

const intakePrompt: PromptModule<Args> = { ...intakeV16, version: 17, system: SYSTEM };

export default intakePrompt;
