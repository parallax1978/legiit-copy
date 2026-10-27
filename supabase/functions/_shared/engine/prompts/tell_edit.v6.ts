/**
 * Tell edit prompt, version 6: version 5's messages, with an audit before the edits. The judges still found lines
 * built to be quoted, points said again in other words, windups and the reader's pain in a survey's wording that the
 * checker cannot match and the editor had called clean; the editor now lists every such line first (with "keep" only
 * for a line carrying a fact the piece needs) and edits each one it does not keep, and the step asks again for the
 * lines it listed and left. The repeat rule is scoped to short pieces with the exceptions the formats ask for (a
 * restated guarantee, a repeated CTA, a code and URL said twice). The system text carries the standard as of this
 * version (rule 11, a ledger row is the fact and a verbatim the substance; rule 16; section 4 item 8; section 7.1).
 */
import { tellEditPrompt as tellEditPrev, type TellEditArgs } from "./tell_edit.v5.ts";
import { amend, type PromptModule } from "./types.ts";

export type { TellEditArgs };

const SYSTEM = amend(tellEditPrev.system, [
  [
    `- A phrase or a point the piece says twice keeps its first use; the later one is cut or said another way. The checker lists each run of five words it found said again, on the text that says it second ("repeated_phrase"); a sentence that makes the same point again in new words goes the same way.`,
    `- In a short piece (organic social, TikTok/Reels, Meta ad, Google RSA, a single, sequence or cold email, SMS), a phrase or a point said twice keeps its first use; the later one is cut, or rewritten so it adds something the first did not. The checker lists each run of five words it found said again ("repeated_phrase") on the text to change; a sentence that makes the same point again in new words goes the same way. A CTA, a price, a guarantee, a disclosure, a P.S. that restates the offer, a caption that shows the spoken line, and any repeat the format asks for (a restated guarantee, a repeated CTA, a code and URL said twice) stay as they are.\n` +
      `- The reader's pain in a survey's wording or hedged ("the pages you build have often brought poor results for the price") is said as the thing that happened, plainly: "You paid a writer for pages that never ranked." Keep every number, name and tag; add no fact.\n` +
      `- A line that copies a ledger row's feature or terms phrasing ("judged against the pages you would have to beat", "every credit it charged comes back to your balance") is said the way the speaker would say the same fact to one reader, its numbers, names and tags kept.`,
  ],
  [
    `Return only the JSON: {"edits":[{"ref":"","before":"","after":"","tell":""}],"what_changed":[],"already_clean":false}. "what_changed" is three to six short plain lines naming the main tells or words you removed. When the copy is already clean, return no edits, an empty "what_changed" and "already_clean": true.`,
    `Return only the JSON: {"audit":[{"ref":"","line":"","kind":"","keep":false}],"edits":[{"ref":"","before":"","after":"","tell":""}],"what_changed":[],"already_clean":false}.\n` +
      `"audit" comes first. Before any edit, read the piece once as its one reader and list every line that is one of these, with its reference: "quote_card", a line built to be quoted (a maxim, a slogan, an aphorism, a "was never" reveal, a one-line paragraph that lands a general truth instead of a specific thing); "said_again", a point the piece already made, in any words (list the later line); "windup", a label, a count, a colon reveal or a "What ... is" opener that announces the point; "survey_wording", the reader's pain in a survey's wording or hedged; "ledger_wording", a line that copies a ledger row's feature or terms phrasing; "tool_tour", in a short piece, a line that walks through what the product does instead of what the reader gets; "other", any other tell above. "keep" is true only when the line carries a fact the piece needs and a plainer sentence would lose it; every line with "keep": false gets its edit in "edits".\n` +
      `"what_changed" is three to six short plain lines naming the main tells or words you removed. When the copy is already clean, return an empty "audit", no edits, an empty "what_changed" and "already_clean": true.`,
  ],
]);

export const tellEditPrompt: PromptModule<TellEditArgs> = { ...tellEditPrev, version: 6, system: SYSTEM };

export default tellEditPrompt;
