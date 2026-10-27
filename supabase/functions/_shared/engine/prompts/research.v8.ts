/**
 * Research prompt, version 8: version 7's messages. The competitor table lists, among each competitor's top claims,
 * what its users already get from it (the columns, scores and reports they see), so the argument can tell what is new
 * to the reader (C8). the system text carries the standard as of this version (sell the result, rule 8; precision never sizes a promise down, rule 10; a line true only with a weakening detail is rewritten, rule 12; the short-piece guarantee only when the offer leads with it, rule 16; indicative with no conditional voice, rule 20; section 2's promise, C8 and C9; section 4's no-results proof and the obvious demonstration; the first-week check, section 5; Gates A and C and the reviewer's directions, section 6; the outcome, reasoning and situation rows, grade F and the factual procedure, section 8).
 */
import researchV7 from "./research.v7.ts";
import { amend, type PromptModule } from "./types.ts";

export * from "./research.v7.ts";

type Args = Parameters<typeof researchV7.user>[1];

const SYSTEM = amend(researchV7.system, [
  [
    `its top claims with the proof each offers (null when none), mechanism_named,`,
    `its top claims with the proof each offers (null when none), and among them what its users already get from it (the columns, scores and reports they see, each as a claim with proof null), so the argument can tell what is new to the reader; mechanism_named,`,
  ],
]);

const researchPrompt: PromptModule<Args> = { ...researchV7, version: 8, system: SYSTEM };

export default researchPrompt;
