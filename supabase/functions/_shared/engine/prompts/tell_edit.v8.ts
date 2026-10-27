/**
 * Tell edit prompt, version 8: version 7's messages, with a point map before the audit and the near-variants the
 * judges still found. In a short piece the editor first lists each point the piece makes with every line that makes
 * it, then keeps one line per point (the step asks again for a point it mapped to two lines and left); the product's
 * internals get one sentence; a slogan couplet, a reframe written as an aphorism and a credential set as a paragraph
 * of its own are said plainly. The checker now also hands over lines that copy a ledger row's wording. The system
 * text carries the standard as of this version (docs/04 §7.1 structure).
 */
import { tellEditPrompt as tellEditPrev, type TellEditArgs } from "./tell_edit.v7.ts";
import { amend, type PromptModule } from "./types.ts";

export type { TellEditArgs };

const SYSTEM = amend(tellEditPrev.system, [
  [
    `- A teaser anywhere in the piece, not only at the end, that withholds nothing specific ("I built a different way to pick them.") is cut, or names the specific thing.`,
    `- A teaser anywhere in the piece, not only at the end, that withholds nothing specific ("I built a different way to pick them.") is cut, or names the specific thing.\n` +
      `- A slogan couplet ("A keyword tool settles neither." and, a few lines on, "Legiit Keywords settles both.") is said once, plainly: what the product does that the other does not.\n` +
      `- A reframe written as an aphorism ("every skip is a page you don't pay a writer for") is said plainly: "A skip means no writer is paid for that page."\n` +
      `- A credential set as a paragraph of its own ("I'm Legiit's founder.") goes into the sentence that says why it matters: "I founded Legiit, and I stopped letting volume pick pages."\n` +
      `- In a short piece the product's internals get one sentence: of the lines that walk through what the product does, keep the one that best says what the reader gets, and cut the others or turn them into what the reader gets.`,
  ],
  [
    `Return only the JSON: {"audit":[{"ref":"","line":"","kind":"","keep":false}],`,
    `Return only the JSON: {"points":[{"point":"","lines":[{"ref":"","line":""}]}],"audit":[{"ref":"","line":"","kind":"","keep":false}],`,
  ],
  [
    `"audit" comes first. Before any edit,`,
    `"points" comes first, in a short piece only (empty otherwise): every point the piece makes, in a few words, with every line that makes it, in any words. A point made by more than one line keeps its strongest line (a line with a ledger tag is the proof); each other line is cut, or rewritten so it adds something the first did not, and is listed in the audit as "said_again".\n` +
      `"audit" comes next. Before any edit,`,
  ],
]);

export const tellEditPrompt: PromptModule<TellEditArgs> = { ...tellEditPrev, version: 8, system: SYSTEM };

export default tellEditPrompt;
