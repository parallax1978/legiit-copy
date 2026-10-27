/**
 * Research prompt, version 2: version 1's messages; the system text carries the standard as of this version (Section 3
 * hooks, the continuity row, the factual review's resize-or-cut rewrite that never announces missing proof).
 */
import researchV1 from "./research.v1.ts";
import type { ResearchArgs } from "./research.v1.ts";
import type { PromptModule } from "./types.ts";

export * from "./research.v1.ts";

const researchPrompt: PromptModule<ResearchArgs> = { ...researchV1, version: 2 };

export default researchPrompt;
