/**
 * Revise prompt, version 27: version 26's messages with the writer's words of draft v27 (the promise with the
 * product's name or right after it, never before; the announced turn is a tell).
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v26.ts";
import { REVISION_V21 } from "./revise.v21.ts";
import { NEVER, WRITER, writerTells } from "./draft.v27.ts";
import type { PromptModule } from "./types.ts";

export type { ReviseArgs };

const SYSTEM = [WRITER, "", REVISION_V21, "", NEVER, "", writerTells()].join("\n");

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 27, system: SYSTEM };
