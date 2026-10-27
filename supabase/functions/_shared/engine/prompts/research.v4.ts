/**
 * Research prompt, version 4: version 3's messages; the system text carries the standard as of this version (legal boilerplate on the owner's list, docs/04 §7.1; no detail volunteered that weakens the proof, rule 12; the factual review's flags are the user's decisions, §8.3).
 */
import researchV3 from "./research.v3.ts";
import type { PromptModule } from "./types.ts";

export * from "./research.v3.ts";

type Args = Parameters<typeof researchV3.user>[1];

const researchPrompt: PromptModule<Args> = { ...researchV3, version: 4 };

export default researchPrompt;
