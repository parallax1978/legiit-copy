/**
 * Revise prompt, version 28: version 27's messages with the writer's words of draft v28 (a sentence that can be
 * taken one way only, with its doer; a reread line from the cold read is said one way).
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v27.ts";
import { REVISION_V21 } from "./revise.v21.ts";
import { NEVER, WRITER, writerTells } from "./draft.v28.ts";
import type { PromptModule } from "./types.ts";

export type { ReviseArgs };

const SYSTEM = [WRITER, "", REVISION_V21, "", NEVER, "", writerTells()].join("\n");

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 28, system: SYSTEM };
