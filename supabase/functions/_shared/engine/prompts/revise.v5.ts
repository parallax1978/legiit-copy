/**
 * Revise prompt, version 5: version 4's messages; the system text carries the owner's tells and words (docs/04
 * §7.1) and the mechanical pass removes them with the em dashes, emojis and hashtags. Every line the revision writes
 * follows the list; the tell edit runs again after it.
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v4.ts";
import { amend, type PromptModule } from "./types.ts";
import { OWNER_TELLS } from "./standard.ts";

export type { ReviseArgs };

const SYSTEM = amend(revisePrev.system, [
  [
    `(c) mechanical: remove every Tier 0 hit (placeholders, assistant residue, unledgered authorities, bold-label-colon bullets, "AI" for a non-AI product) and every Tier 1 tell in the quoted examples by rebuilding the sentence from its claim and carrier;`,
    `(c) mechanical: remove every Tier 0 hit (placeholders, assistant residue, unledgered authorities, bold-label-colon bullets, "AI" for a non-AI product, em dashes, emojis, hashtags) and every Tier 1 tell in the quoted examples, the owner's tells and words among them, by rebuilding the sentence from its claim and carrier;`,
  ],
  [
    `## Revision discipline (verified by machine after you return)`,
    `${OWNER_TELLS}\n\nEvery line you write or change follows that list: no em dash, emoji or hashtag, none of its tells or words.\n\n## Revision discipline (verified by machine after you return)`,
  ],
]);

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 5, system: SYSTEM };
