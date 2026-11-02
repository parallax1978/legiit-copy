/**
 * Revise prompt, version 29: version 28's messages with the writer's words of draft v29 (every sentence tells him
 * something he did not know; a thing is named inside the sentence that does work with it, never in a setup sentence).
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v28.ts";
import { REVISION_V21 } from "./revise.v21.ts";
import { NEVER, WRITER, writerTells } from "./draft.v29.ts";
import type { PromptModule } from "./types.ts";

export type { ReviseArgs };

const SYSTEM = [WRITER, "", REVISION_V21, "", NEVER, "", writerTells()].join("\n");

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 29, system: SYSTEM };
