/**
 * Revise prompt, version 22: version 21's messages with the writer's words of draft v22 (a yes and a no shown
 * together say what decided each; one fact never argues both ways). The system text carries the standard as of this
 * version (Gate C reads a proof that contradicts another).
 */
import { revisePrompt as revisePrev, REVISION_V21, type ReviseArgs } from "./revise.v21.ts";
import { NEVER, WRITER, writerTells } from "./draft.v22.ts";
import type { PromptModule } from "./types.ts";

export type { ReviseArgs };

const SYSTEM = [WRITER, "", REVISION_V21, "", NEVER, "", writerTells()].join("\n");

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 22, system: SYSTEM };
