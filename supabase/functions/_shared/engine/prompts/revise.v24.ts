/**
 * Revise prompt, version 24: version 23's messages with the writer's words of draft v24 (the manner the piece is
 * written in; the material names it, and a fix keeps it).
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v23.ts";
import { REVISION_V21 } from "./revise.v21.ts";
import { NEVER, WRITER, writerTells } from "./draft.v24.ts";
import type { PromptModule } from "./types.ts";

export type { ReviseArgs };

const SYSTEM = [WRITER, "", REVISION_V21, "", NEVER, "", writerTells()].join("\n");

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 24, system: SYSTEM };
