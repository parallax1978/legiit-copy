/**
 * Draft prompt, version 6: version 5's messages; the system text carries the owner's tells and words (docs/04 §7.1,
 * rules 22, 23, 27 and 28) and drops what they ban: "Here's why" as a non-tell, a question the next line answers,
 * the emoji allowance. The writer follows the list; the tell edit removes what slips through.
 */
import { draftPrompt as draftPrev, type DraftArgs } from "./draft.v5.ts";
import { amend, type PromptModule } from "./types.ts";
import { OWNER_TELLS } from "./standard.ts";

export type { DraftArgs };

const SYSTEM = amend(draftPrev.system, [
  [
    `- No summary paragraphs, no restated subject line as line one, no cheerful sign-off, no "In short", no question the next line does not answer.`,
    `- Open on the point and end on it: no windup, no summary paragraph, no restated subject line as line one, no cheerful sign-off, no "In short" or "In conclusion". Never ask a question and answer it yourself.`,
  ],
  [
    `- Not tells, use them at human rates: exclamation marks, ellipses, caps for emphasis, fragments, "Here's why", "P.S.", "Dear Friend".`,
    `- Not tells, use them at human rates: exclamation marks, ellipses, caps for emphasis, fragments, "P.S.", "Dear Friend".`,
  ],
  [
    `- Tells that get the draft sent back: "designed to / built for / crafted / tailored"; "That's why we built"; "cancel anytime, no contracts"; "You're not alone / If that sounds familiar"; "less than a cup of coffee"; "In the next few minutes I'll show you"; a summary closer; self-posed question crossheads; "so you can" benefit triads; "It's not X. It's Y." at more than one per thousand words; "unlock / elevate / seamless / streamline / effortless / cutting-edge / journey / game-changer / Picture this / Here's the kicker"; "Imagine..." with no specific on the next line; "frustrated / overwhelmed / juggling" as the only emotional content; "AI-powered" for a product that is not AI.`,
    `- Tells that get the draft sent back: every tell and word in the owner's list below (Section 7.1), as patterns, synonyms and near-variants included; "designed to / built for / crafted"; "That's why we built"; "cancel anytime, no contracts"; "You're not alone / If that sounds familiar"; "less than a cup of coffee"; "In the next few minutes I'll show you"; self-posed question crossheads; "so you can" benefit triads; "It's not X. It's Y." at more than one per thousand words; "streamline / effortless / journey / Picture this"; "Imagine..." with no specific on the next line; "frustrated / overwhelmed / juggling" as the only emotional content; "AI-powered" for a product that is not AI.`,
  ],
  [`no emoji bullets unless the format allows them.`, `no emojis, no hashtags, no em dashes, in any format.`],
  [`## Voice\n`, `${OWNER_TELLS}\n\n## Voice\n`],
]);

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 6, system: SYSTEM };
