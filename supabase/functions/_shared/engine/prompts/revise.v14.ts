/**
 * Revise prompt, version 14: version 13's messages. The system text carries the standard as of this version (rules 1,
 * 4 and 38: the product introduced in one plain sentence and said as what it does for the reader, never its work sent
 * to someone else; rule 8: no namedrop; rules 18 and 26: a time only when it is a reason to act; Section 7.1 tells 18
 * to 21).
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v13.ts";
import type { PromptModule } from "./types.ts";

export type { ReviseArgs };

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 14 };
