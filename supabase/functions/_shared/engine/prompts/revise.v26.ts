/**
 * Revise prompt, version 26: version 25's messages with the writer's words of draft v26 (the promise's place: at the
 * turn, with the product's first mention, after the trouble is told whole). A mechanical note that the promise sits
 * early is fixed by moving it, never by cutting the promise.
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v25.ts";
import { REVISION_V21 } from "./revise.v21.ts";
import { NEVER, WRITER, writerTells } from "./draft.v26.ts";
import type { PromptModule } from "./types.ts";

export type { ReviseArgs };

const SYSTEM = [WRITER, "", REVISION_V21, "", NEVER, "", writerTells()].join("\n");

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 26, system: SYSTEM };
