/**
 * Revise prompt, version 13: version 12's messages. The system text adds Section 3's hooks paragraph, so a hook
 * rewritten from the copy chief's note follows the masters' opening moves and never rebuilds a rejected shape, and
 * Section 11's exemplars from the masters (studied, never reproduced), and
 * carries the standard as of this version (rules 2, 7 and 11; Section 7.1 tells 14 to 17).
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v12.ts";
import { amend, type PromptModule } from "./types.ts";
import { EXEMPLARS, LEAD_SELECTION } from "./standard.ts";

export type { ReviseArgs };

const HOOKS = LEAD_SELECTION.slice(LEAD_SELECTION.indexOf("Hooks. Where the opening line is the whole lead"));

const SYSTEM = amend(revisePrev.system, [
  [
    `## Revision discipline (verified by machine after you return)`,
    `## Hooks (docs/04 Section 3)\n\n${HOOKS}\n\n${EXEMPLARS}\n\n## Revision discipline (verified by machine after you return)`,
  ],
]);

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 13, system: SYSTEM };
