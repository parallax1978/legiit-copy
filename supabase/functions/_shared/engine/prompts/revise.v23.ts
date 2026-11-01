/**
 * Revise prompt, version 23: version 22's messages with the writer's words of draft v23 (the shape of the case: the
 * discovery before the product). The system text carries the standard as of this version (Gate B reads a pitch
 * before the discovery).
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v22.ts";
import { REVISION_V21 } from "./revise.v21.ts";
import { NEVER, WRITER, writerTells } from "./draft.v23.ts";
import type { PromptModule } from "./types.ts";

export type { ReviseArgs };

const SYSTEM = [WRITER, "", REVISION_V21, "", NEVER, "", writerTells()].join("\n");

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 23, system: SYSTEM };
