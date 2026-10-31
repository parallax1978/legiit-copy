/**
 * Revise prompt, version 20: version 19's messages with the writer's spoken-order rule (draft v20) and the cold
 * reader's read-twice lines: each rewritten as a person says it aloud, same facts and tags, the reader's own
 * phrasing a hint and never pasted.
 */
import { revisePrompt as revisePrev, REVISION, type ReviseArgs } from "./revise.v19.ts";
import { NEVER, WRITER, writerTells } from "./draft.v20.ts";
import { amend, type PromptModule } from "./types.ts";

export type { ReviseArgs };

export const REVISION_V20 = amend(REVISION, [
  [
    `(e) the cold read's drop line, only when a note or a tell already touches it.`,
    `(e) the cold read's drop line, only when a note or a tell already touches it; (f) every sentence a cold reader had to read twice, rewritten in the order a person speaks it (who, does, what; the verb where speech puts it; a question asked as you would ask it across a table), with the same facts and tags, the reader's own phrasing a hint and never pasted.`,
  ],
]);

const SYSTEM = [WRITER, "", REVISION_V20, "", NEVER, "", writerTells()].join("\n");

const COLD_V19 = /COLD READ: attention dropped at "/;

export const revisePrompt: PromptModule<ReviseArgs> = {
  ...revisePrev,
  version: 20,
  system: SYSTEM,
  user: (ctx, args) => {
    const base = revisePrev.user(ctx, args);
    const reread = (args.coldRead?.reread ?? []).filter((r) => r.line.trim());
    if (!reread.length) return base;
    const block = `SENTENCES A COLD READER HAD TO READ TWICE (rewrite each as a person says it aloud, same facts and tags; the reader's phrasing is a hint, not a quote to paste):\n${reread.map((r, i) => `  ${i + 1}. "${r.line}"\n     the reader would say: ${r.say_it || "(no suggestion)"}`).join("\n")}`;
    // after the cold read line when the draft has one, else before the draft
    if (COLD_V19.test(base)) {
      const i = base.indexOf("THE DRAFT (block ids in brackets");
      return i > 0 ? `${base.slice(0, i)}${block}\n\n${base.slice(i)}` : `${base}\n\n${block}`;
    }
    const i = base.indexOf("THE DRAFT (block ids in brackets");
    return i > 0 ? `${base.slice(0, i)}${block}\n\n${base.slice(i)}` : `${base}\n\n${block}`;
  },
};
