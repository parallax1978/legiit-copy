/**
 * Revise prompt, version 16: version 15's messages, with the reading grade and the feeling: a readability failure in
 * the mechanical report is fixed on the quoted lines with shorter words and shorter sentences, every fact kept; a
 * flat line a note names gets the feeling the research holds, said as the thing itself; a word the cold read stumbled
 * on gets plain words. The system text carries the standard as of this version (rules 39 and 40; Gates B and D).
 */
import { revisePrompt as revisePrev, type ReviseArgs } from "./revise.v15.ts";
import { amend, type PromptModule } from "./types.ts";

export type { ReviseArgs };

const SYSTEM = amend(revisePrev.system, [
  [
    `(f) A rebuilt line stands on its own:`,
    `(g) A readability failure in the mechanical report (rule 40) is fixed on the lines the notes quote with shorter words and shorter sentences, every fact and tag kept, never by cutting a fact; a word the cold read stumbled on gets plain words once or goes. A flat line a note names gets the feeling the research holds (the resident emotion, the forces, a verbatim), said as the thing itself (the client's question, the page sitting on page four), never as an adjective (rule 39).
(f) A rebuilt line stands on its own:`,
  ],
]);

export const revisePrompt: PromptModule<ReviseArgs> = { ...revisePrev, version: 16, system: SYSTEM };
