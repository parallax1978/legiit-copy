/**
 * Tell edit prompt, version 2: version 1's messages, sharper on what the judges still found after it ran. A label
 * ("My rule:") or a count ("Two questions decide it.") is a windup; "in my view" is a hedge; "exactly" and "really"
 * are the filler of tell 7; the last line of a text is read alone for a quote-card line. The copy's language
 * outranks any default in the request.
 */
import { tellEditPrompt as tellEditPrev, type TellEditArgs } from "./tell_edit.v1.ts";
import { amend, type PromptModule } from "./types.ts";

export type { TellEditArgs };

const SYSTEM = amend(tellEditPrev.system, [
  [
    `- Match the language of the copy. Spanish in, Spanish out.`,
    `- Match the language of the copy, whatever a voice profile or default in the request says. Spanish in, Spanish out.`,
  ],
  [
    `- A line built to be quoted (an aphorism, a slogan, a maxim) is said plainly. "A budget is half of a plan. The missing half is the habit." becomes "A budget changes nothing until you check it every week."`,
    `- A label or a count is a windup too. "My rule: build only the pages you can win." becomes "Build only the pages you can win." "Two questions decide it. Who searches, and what do they buy?" becomes "Check who searches for it and what they buy."\n` +
      `- A hedge in other words is still a hedge. "Difficulty is a guess, in my view." becomes "Difficulty is a guess."\n` +
      `- Filler in other words is still filler. "Exactly", "really", "truly" and "actually" go when the sentence means the same without them: "exactly the pages your buyers search for" becomes "the pages your buyers search for".\n` +
      `- A line built to be quoted (an aphorism, a slogan, a maxim) is said plainly. "A budget is half of a plan. The missing half is the habit." becomes "A budget changes nothing until you check it every week." "A keyword list is raw material." becomes "A keyword list tells you what people type, not what they buy."`,
  ],
  [
    `- Read each line aloud as the speaker, to one reader across a table. A line you would not say that way is rewritten until you would.`,
    `- Read each line aloud as the speaker, to one reader across a table. A line you would not say that way is rewritten until you would.\n` +
      `- Before you call a text clean, read its last line on its own. A closing line that would fit on a poster or a quote card is rewritten as the plain point.`,
  ],
]);

export const tellEditPrompt: PromptModule<TellEditArgs> = { ...tellEditPrev, version: 2, system: SYSTEM };

export default tellEditPrompt;
