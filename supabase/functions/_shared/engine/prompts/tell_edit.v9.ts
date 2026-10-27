/**
 * Tell edit prompt, version 9: version 8's messages, with one rule for which line of a repeat stays (the line whose
 * sentence carries a ledger tag, else the first use) wherever the system text names it, the point map's exceptions
 * (an alternative opening is read with the sections, never with another opening; a CTA, a price, a guarantee, a
 * caption, a P.S., a display field and any repeat the format asks for are not lines to cut), and the credential fixed
 * in its own paragraph, the name kept.
 */
import { tellEditPrompt as tellEditPrev, type TellEditArgs } from "./tell_edit.v8.ts";
import { amend, type PromptModule } from "./types.ts";

export type { TellEditArgs };

const SYSTEM = amend(tellEditPrev.system, [
  [
    `a phrase or a point said twice keeps its first use; the later one is cut, or rewritten so it adds something the first did not.`,
    `a phrase or a point said twice keeps one line, the one whose sentence carries a ledger tag (the proof), else the first use; the other is cut, or rewritten so it adds something the kept line did not.`,
  ],
  [
    `(for a repeat the checker found, list the text the checker names; otherwise the later line);`,
    `(for a repeat the checker found, list the text the checker names; otherwise the line that is neither the proof nor the first use);`,
  ],
  [
    `- A credential set as a paragraph of its own ("I'm Legiit's founder.") goes into the sentence that says why it matters: "I founded Legiit, and I stopped letting volume pick pages."`,
    `- A credential set as a paragraph of its own ("I'm Legiit's founder.") is rewritten in its own paragraph into the sentence that says why it matters, the name kept: "As Legiit's founder, I stopped letting volume pick pages."`,
  ],
  [
    `A point made by more than one line keeps its strongest line (a line with a ledger tag is the proof); each other line is cut, or rewritten so it adds something the first did not, and is listed in the audit as "said_again".`,
    `A point made by more than one line keeps one line, the one whose sentence carries a ledger tag (the proof), else the first; each other line is cut, or rewritten so it adds something the kept line did not, and is listed in the audit as "said_again". An alternative opening is read with the sections, never with another opening: openings may share their point. A CTA, a price, a guarantee, a caption, a P.S., a headline or other display field, and any repeat the format asks for are not lines to cut.`,
  ],
]);

export const tellEditPrompt: PromptModule<TellEditArgs> = { ...tellEditPrev, version: 9, system: SYSTEM };

export default tellEditPrompt;
