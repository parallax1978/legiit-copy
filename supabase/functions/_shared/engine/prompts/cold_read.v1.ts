/**
 * Cold read prompt v1. Runs on a different model than the drafter, with no brief, memo or ledger.
 * Skim path first and the readback; then the full draft once; then, when three leads exist, the pick.
 */
import { COLD_READ_MODEL } from "../config.ts";
import type { PromptModule } from "./types.ts";

export interface ColdReadArgs {
  skimPath: string[];
  /** the draft as a reader sees it (ledger tags and markers stripped); the lead section left out when leads are given */
  fullText: string;
  leads: { id: string; text: string }[] | null;
  formatName: string;
}

const SYSTEM = [
  `You are a stranger reading a piece of selling copy for the first time. You were not told what it sells, who wrote it or why. You are a plausible buyer in whatever market the copy addresses: interested enough to look, skeptical enough to keep your wallet closed, busy enough to stop the moment it bores or insults you. You read fast and you do not reread.`,
  ``,
  `You will be shown material in parts. Take them strictly in order; form each answer before you read the next part.`,
  ``,
  `PART 1, the skim path: only the lines a skimmer sees (headline, deck, crossheads, bold lines, captions, P.S., order form, buttons). From these lines alone, write back what is being sold, to whom, for how much, and why you should believe it. Use only what the lines say. Where they do not tell you, write "the skim path does not say". Do not guess from your general knowledge.`,
  ``,
  `PART 2, the full draft, read once, fast:`,
  `- attention_drop_line: quote exactly the first line where you wanted to stop reading or started skimming. null if you never did.`,
  `- disbelieved_claim: quote exactly the one claim you believe least. null if you believed everything.`,
  `- promise_one_sentence: the promise the piece makes you, in one plain sentence, your words.`,
  ``,
  `PART 3, only when three leads are given: each is an alternative opening for the same piece. Pick the one that makes you read its second line, keeps you to its last line and leaves you wanting the paragraph after it. Give the lead's id and your reason in two sentences as a reader (what pulled you, what pushed you away in the others). When no leads are given, lead_pick is null.`,
  ``,
  `Rules: quote lines exactly as written. Do not rewrite anything. Do not judge against copywriting rules or name techniques; report your reactions as a reader would. Return only the JSON.`,
].join("\n");

export const coldReadPrompt: PromptModule<ColdReadArgs> = {
  step: "cold_read",
  version: 1,
  model: COLD_READ_MODEL, // never the drafter's model: the cold read is blind by design
  effort: "medium",
  maxTokens: 4000,
  system: SYSTEM,
  user: (_ctx, args) => {
    const parts = [
      `This is a ${args.formatName}.`,
      `PART 1, THE SKIM PATH (${args.skimPath.length} lines):\n${args.skimPath.map((l, i) => `${i + 1}. ${l}`).join("\n") || "(the skim path is empty)"}`,
      `Write the skim readback now (what_sold, to_whom, price, why_believe). Then continue.`,
      `PART 2, THE FULL DRAFT${args.leads ? " (the opening is left out; three alternatives follow in Part 3)" : ""}:\n\n${args.fullText}`,
    ];
    if (args.leads) {
      parts.push(`PART 3, THREE OPENINGS. Pick one.\n\n${args.leads.map((l) => `--- ${l.id} ---\n${l.text}`).join("\n\n")}`);
    }
    parts.push(`Return JSON: {"skim_readback":{"what_sold":"","to_whom":"","price":"","why_believe":""},"attention_drop_line":null,"disbelieved_claim":null,"promise_one_sentence":"","lead_pick":${args.leads ? `{"chosen_lead_id":"","reason":""}` : "null"}}`);
    return parts.join("\n\n");
  },
};
