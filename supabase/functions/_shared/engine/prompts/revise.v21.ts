/**
 * Revise prompt, version 21: version 20's messages with the writer's words of draft v21 (a thing is named the first
 * time it appears; the cold reader's "what list?" lines are rewritten naming the thing).
 */
import { revisePrompt as revisePrev, REVISION_V20, type ReviseArgs } from "./revise.v20.ts";
import { NEVER, WRITER, writerTells } from "./draft.v21.ts";
import { amend, type PromptModule } from "./types.ts";

export type { ReviseArgs };

export const REVISION_V21 = amend(REVISION_V20, [
  [
    `with the same facts and tags, the reader's own phrasing a hint and never pasted.`,
    `with the same facts and tags, the reader's own phrasing a hint and never pasted; a line he could not place ("what list?") is rewritten naming the thing the first time ("the keyword list Ahrefs gives you").`,
  ],
]);

const SYSTEM = [WRITER, "", REVISION_V21, "", NEVER, "", writerTells()].join("\n");

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 21, system: SYSTEM };
