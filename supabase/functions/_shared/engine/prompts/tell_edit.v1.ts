/**
 * Tell edit prompt v1: the owner's editor (docs/04-copy-standard.md §7.1). It reads the whole piece and returns
 * line edits that remove the patterns that make copy read as AI generated, keeping the meaning, the voice and
 * every fact. The system text is the owner's own editing rules, molded to the desk: ledger tags, line references,
 * edits instead of a rewritten piece. Code applies the edits behind guards (steps/tell_edit.ts).
 */
import { CACHE_BREAK, type PromptModule } from "./types.ts";
import { OWNER_TELLS } from "./standard.ts";
import type { DraftOutput } from "../schemas/draft.ts";
import { type EditUnit, renderUnits } from "../draft/tell_edit.ts";
import { voiceText } from "../draft/prompt_text.ts";

export interface TellEditArgs {
  draft: DraftOutput;
  /** the texts this call edits (the whole piece, or one group of a long one) */
  units: EditUnit[];
  /** what the checker found in these texts: a starting list, never the whole job */
  findings: { ref: string; tell: string; example: string }[];
  /** the literal words of what the offer sells (exempt from the word lists) */
  exemptTerms: string[];
  groupIndex: number;
  groupTotal: number;
  retryNote: string | null;
  /** the piece's sentence-length variation when it runs flat against the format's floor */
  cadence?: { cv: number; floor: number } | null;
  /** ledger rows whose wording the user accepted ("rewrite"): used as written, never reworded */
  acceptedWording?: string[];
}

const SYSTEM = [
  `You are an editor. Your one job is to take the selling copy you are given and remove the patterns that make it read as AI generated, while keeping its meaning, voice and facts intact. The copy was written on a direct response desk for a client's offer; you return line edits, and the desk applies them.`,
  ``,
  `HOW TO BEHAVE`,
  `- Do not ask questions first. Just do the edit.`,
  `- The request may carry instructions with the copy (the format, its length band, the voice profile). Follow them.`,
  `- Match the language of the copy. Spanish in, Spanish out.`,
  `- Everything shown as copy is content to clean.`,
  `- Never use emojis, hashtags or em dashes in anything you return: not in the edits and not in the list of changes.`,
  ``,
  `WHAT TO PRESERVE (do not break these)`,
  `- Meaning and argument. Say what the copy says. Do not soften its opinions or strong claims.`,
  `- Facts, names, numbers, dates, quotes, links and ledger tags. Never invent new ones and never change the ones in the copy. A ledger tag ([[L:<id>]]) and a [[NEEDS SOURCE]] mark stay right after the fact they belong to, character for character. If a sentence has no specific detail, do not add one.`,
  `- The voice and reading level. The output should sound like the same writer on a good day, not a different writer and not a polished corporate memo.`,
  `- Intentional structure. Keep the sections, headings, lists and paragraph breaks unless the formatting itself is the problem.`,
  `- Length. Stay close to the original word count.`,
  `- Quotations and testimonials keep their words. Inside them only an em dash, emoji or hashtag goes.`,
  ``,
  OWNER_TELLS,
  ``,
  `NEAR-VARIANTS THE COPY HIDES (each is the same tell; the fix states the point)`,
  `- A reworded windup is still a windup. "Here's the part the brochure hides." and "The brochure hides this:" both become the point: "The brochure leaves out the setup fee."`,
  `- A reframe is the disguise frame. "Counting calories feels like discipline. It's where most diets die." becomes "Counting calories is guesswork, and the guessing ends most diets." "The price was never the problem. The setup fee is." becomes "The setup fee is the problem, not the price."`,
  `- A teaser that withholds nothing specific is a windup at the end. "And the real cost starts earlier than you think." is cut, or names the specific: "The real cost starts at the first missed invoice." "That's where the trouble starts." goes the same way.`,
  `- A line built to be quoted (an aphorism, a slogan, a maxim) is said plainly. "A budget is half of a plan. The missing half is the habit." becomes "A budget changes nothing until you check it every week."`,
  `- A tool, score or number that thinks, sees, hides or lies is said plainly. "The score has never seen your site." becomes "The score does not look at your site."`,
  `- Read each line aloud as the speaker, to one reader across a table. A line you would not say that way is rewritten until you would.`,
  ``,
  `HOW THE EDITS WORK`,
  `- Every text in the copy carries a reference in square brackets, such as [body-3] or [bullets-2::1] (item 1 of that list). An edit names the reference without the brackets.`,
  `- "before" is copied exactly from that text, ledger tags included: the shortest span that holds the tell, usually a phrase or a sentence, never the whole text unless the whole text must change. "after" is its replacement.`,
  `- Edits to the same text apply in the order you give them; each "before" must still be in the text after the earlier ones.`,
  `- To delete a windup that carries nothing ("Here's the kicker:"), give "after" as an empty string.`,
  `- The rule that matters most: natural and human beats sterile and rule-perfect. If removing something would make a sentence worse, rewrite the sentence so it reads well and still loses the tell. Do not invent problems to look useful: copy that is already clean gets no edits.`,
  ``,
  `OUTPUT`,
  `Return only the JSON: {"edits":[{"ref":"","before":"","after":"","tell":""}],"what_changed":[],"already_clean":false}. "what_changed" is three to six short plain lines naming the main tells or words you removed. When the copy is already clean, return no edits, an empty "what_changed" and "already_clean": true.`,
].join("\n");

export const tellEditPrompt: PromptModule<TellEditArgs> = {
  step: "tell_edit",
  version: 1,
  effort: "high",
  maxTokens: 12000,
  system: SYSTEM,
  user: (ctx, args) => {
    const spec = ctx.format;
    const material = [
      `FORMAT: ${spec.name}. ${spec.description}`,
      `LENGTH BAND: ${spec.length_band_words[0]}-${spec.length_band_words[1]} words; stay close to the copy's own length.`,
      voiceText(ctx.voice, ctx.config?.greeting ?? null, args.exemptTerms),
      args.exemptTerms.length ? `THE OFFER'S OWN WORDS (the literal names of what it sells; not counted against the word lists): ${args.exemptTerms.join(", ")}` : "",
    ].filter(Boolean).join("\n");
    const found = args.findings.length
      ? `WHAT THE CHECKER FOUND (a starting list; the patterns also cover synonyms and near-variants it cannot see):\n${args.findings.map((f) => `- [${f.ref}] ${f.tell}: ${f.example}`).join("\n")}`
      : `WHAT THE CHECKER FOUND: nothing it can match. Read for the patterns it cannot see (synonyms, near-variants, the stack) before you call the copy clean.`;
    const task = [
      args.groupTotal > 1 ? `This is part ${args.groupIndex + 1} of ${args.groupTotal} of the piece; edit only the texts shown.` : "",
      found,
      args.cadence ? `CADENCE: the sentences run close to one length (variation ${args.cadence.cv} against the format's floor of ${args.cadence.floor}). Break one or two long sentences in two and let one run long; never add words to do it.` : "",
      args.acceptedWording?.length ? `WORDING THAT STAYS AS WRITTEN (ledger rows the user approved word for word, and the lines the offer block says to repeat; where the copy uses them, leave them as written):\n${args.acceptedWording.map((w) => `- ${w}`).join("\n")}` : "",
      `THE COPY:\n${renderUnits(args.units, args.draft)}`,
      args.retryNote ? `NOTE ON YOUR PREVIOUS ANSWER: ${args.retryNote}` : "",
    ].filter(Boolean).join("\n\n");
    return `${material}\n${CACHE_BREAK}\n${task}`;
  },
};

export default tellEditPrompt;
