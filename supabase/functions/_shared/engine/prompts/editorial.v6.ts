/**
 * Editorial prompt, version 6: version 5's messages; the system text carries the standard as of this version (the
 * owner's tells and words in §7.1 inside the checklist, Gate D failing on two or more of them or on any em dash,
 * emoji or hashtag), and every example line the copy chief writes follows the list.
 */
import { editorialPrompt as editorialPrev, type EditorialArgs } from "./editorial.v5.ts";
import { amend, type PromptModule } from "./types.ts";

export type { EditorialArgs };

const SYSTEM = amend(editorialPrev.system, [
  [
    `- The mechanical report, when present, is the tell score for Gate D. When absent, judge Gate D from the text and the checklist.`,
    `- The mechanical report, when present, is the tell score for Gate D and counts the owner's tells and words (Section 7.1); two or more of them in the piece, or any em dash, emoji or hashtag, fail Gate D. When the report is absent, judge Gate D from the text and the checklist. Every line you write as an example ("do") follows Section 7.1.`,
  ],
]);

export const editorialPrompt: PromptModule<EditorialArgs> = { ...editorialPrev, version: 6, system: SYSTEM };
