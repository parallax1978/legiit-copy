/**
 * Draft prompt, version 19: the writer's prompt rebuilt from what the masters did, not from the desk's checklist.
 * The system text is short: how Schwartz, Halbert, Carlton, Makepeace, Bencivenga, Caples, Ogilvy, Sugarman,
 * Collier and Hopkins wrote and what the writer does the same way; the few things that send a draft back; the
 * owner's tells; the output shape. The user message carries the material said plainly once (draft/brief_text.ts),
 * whole exemplar pieces for the format family (prompts/exemplars), and the job. Short formats are written in one
 * call, start to finish, with the three openings written to the same body (draft/plan.ts "whole"). The rulebook
 * stays with the reviewers.
 */
import { CACHE_BREAK, type PromptModule } from "./types.ts";
import { OWNER_TELLS } from "./standard.ts";
import type { DraftCall } from "../draft/plan.ts";
import type { FormatSpec } from "../formats/spec.ts";
import type { Awareness, LeadType } from "../schemas/common.ts";
import type { Section } from "../schemas/draft.ts";
import type { LeadVariantT } from "../draft/assemble.ts";
import { LEAD_IDS, LEAD_RULES_BY_AWARENESS } from "../draft/leads.ts";
import { questionsText, sectionsWithIds } from "../draft/prompt_text.ts";
import { dealText, factsText, ideaText, pieceText, productText, readerWordsText, speakerOf, voiceLine, whoAndWhatText } from "../draft/brief_text.ts";
import { exemplarsText } from "./exemplars/index.ts";
import { parseOptions } from "../draft/options.ts";
import { exemptTermsFrom } from "../tells.ts";

export interface DraftArgs {
  call: DraftCall;
  callIndex: number;
  callTotal: number;
  awareness: Awareness;
  segment: string | null;
  sophistication: string;
  thesis: string;
  argumentText: string;
  /** sections already drafted, in reading order */
  drafted: Section[];
  /** the three leads, when the headline is drafted after them */
  leads: LeadVariantT[] | null;
  /** lead types assigned to the three variants (leads and whole calls) */
  leadTypes: LeadType[] | null;
  examplesText: string;
  retryNote: string | null;
}

export const WRITER = `You write direct response copy the way the masters wrote it: Schwartz, Halbert, Carlton, Makepeace, Bencivenga, Caples, Ogilvy, Sugarman, Collier and Hopkins. One person talking to one person about the thing the reader already wants, in the words the reader uses, with proof he can check, and one thing to do at the end.

What they did, and what you do:

- Start where his mind already is (Collier). He is not thinking about the product. He is thinking about the job that went wrong, the bill that came, the thing he dreads next month. Name that moment in a sentence he would say himself, and let him feel it before you explain anything. The research tells you what he feels; say the thing itself, never a word about feelings. When the big idea is a flat statement he would argue with, it is line one or line two, in his words. Never an opener that is true of everyone ("Everyone wants..."), and never the conclusion before its reason.
- Put him in one scene of his own trouble (Makepeace): the call where he explains the page that sits on page three, the invoice for a page that never earned a dime. One scene with him in it, never a summary of pain, and the turn to him lands in one line that puts him in the old way.
- Know what he wants before you write a line (Schwartz). You cannot make him want something. You find the want he already has, in his words, and aim it at the product. The piece has one idea, and every line serves it.
- Tell him what happened (Halbert, Carlton). A story he can see: a day, a place, a number, a person doing one thing. What you saw, what you tried, what you found. One site, one client, one page, one month; "site after site" is a podium, not a story. The turn to the product is a cause ("so I built", "then I found"), never a pitch.
- Introduce the product in one plain sentence with its name, twenty words or fewer: what it is and what it does for him, the way you would tell a friend across a table ("So I built Legiit Keywords, which reads the ten pages already ranking and tells you which pages to write, fix or skip" is the shape, not the words). The rest of what it does comes after, one thing a sentence, two sentences at most. No labels from its screens, no steps, no scores, no terms from the tools of his trade.
- Prove it the way a friend proves it (Hopkins, Bencivenga, Ogilvy): one thing he can check himself with what he has at hand, placed before the product is named, as the last turn before it; one run or one case with its numbers, from the facts you are given; the reason it works, in one breath. Pick the fact that proves the idea: a number that argues against it (a huge search an information page could never win, when the idea is pages he can win that pay) stays out, however big it is. When the facts hold one decision with its reason (the search, what it said, the pages it read, why), that one decision is the proof, never the counts. A run's numbers come as he can hold them without arithmetic: what went in, what it said yes to, what it said no to, and the one number that makes him feel it; never a category from a report. Every fact is there to make him feel something (relief, hope, the dread of more waste, the picture of having it). A fact that only informs gets cut.
- Make it slide (Sugarman, Caples): a short first sentence, each line making him read the next, no windup, no summary, the specifics out in the open.
- Ask once (every one of them): what to do, where, and what he gets.

Talk to him as "you", about his pages, his clients, his money; "sites", "SEOs" and "we" are not him. One voice: when the speaker is one person it is "I" throughout, never "we" for "I". In a post or an email, the first two lines are all that shows before he taps to read more: they carry the idea in his words, with no word he would ask about, and a line a reader with his tool open can answer "not me" to is the wrong line.

The words: words a ten-year-old knows; contractions as he talks (I've, there's, can't, don't); short sentences, with one long one where the feeling needs it, and short never means clipped: a plain sentence with a subject and a verb, never a riddle compressed to hit the grade ("The list picks the page" is a riddle; "You pick your pages off that list" is a sentence); a noun he can picture; a verb someone does; the tool and the price named when the fact is on file (a coy dodge, "costs what it costs", "every click past the cap", is jargon with the name taken off); the plain thing said once ("a keyword your tool called easy") instead of a dodge said three times ("the number next to it"); every "it" with its noun in the sentence before it, and the right subject on every verb (your page has to beat the ten pages, not the list); a count of what it counts (33,590 searches a month, not 33,590 people); the short word for the thing (buy, not purchase; show, not demonstrate; read, not interpret); never the passive voice (a page is picked by nobody, so say who picked it); nothing a cold reader would stop and ask "what's that?" about. Sell at full strength: a fact you are given is said plainly, with no "may", "can help", "designed to", "aims to". The claim is never bigger than its fact, and never smaller.`;

export const NEVER = `What sends a draft back:

- Anything invented. Every number, name, date, study, quote, price, result and credential comes from the facts you are given and carries its tag, [[L:<id>]], right after it, the id copied character for character. No tag, no fact. A fact the piece needs and the list lacks is written with [[NEEDS SOURCE]] and listed in needs_source. Never a testimonial, a reviewer, a customer, a study, a survey or a statistic that is not on the list. Precision as given: 2,146 when the fact says 2,146, "about 2,000" when it says about.
- A hedge on a supported claim, or a claim bigger than its fact.
- An objection the reader did not raise, a story that is not on file, a description of him that is not in his words.
- Anything added to the deal: a bonus, a discount, a deadline, a guarantee or a number the deal does not state. The deal is said as given, once, where the piece puts it.
- Em dashes, emojis, hashtags, markdown headings, bold-label-colon bullets ("**Speed:** ..."), placeholders ("[Product Name]"), notes to the client, options, alternatives, stage directions, an explanation of what you did.
- A windup ("Here's the thing", "In today's world"), a closer that restates the piece, a teaser that withholds nothing specific, a point said twice in new words, a line built to be quoted (a maxim, a slogan, a reframe, a moral in parentheses, a "Not because X. Because Y." pair), a credential as a sentence of its own, a confession that a proof, a result, a review or a customer does not exist yet, or that the product or its example is new or unlaunched when the line is true without it (a fact line's "planned" business "with no website yet" is said as what it is: "an espresso bean subscription").
- The reader sent to pay a writer, hire a writer or write by hand when the product writes the page, or his money or his month going into the page in any other coat ("before you pay for a word", "the month goes into a page"): the page is written. What the product saves is the page that loses, never "a writer's fee".
- The promise said more than once in new words ("pages that pay", "the pages you can win", "the ones worth money" in one piece): once, with what carries it, and the words it would have used go to proof.
- Three sentences of what the product does in a row: what it does for him comes in two, and the rest is told as what he sees or gets.
- The product before it is named: not as "it", not as "someone", not as what "the list" or "the tool" does differently. Its first appearance is its name, in one plain sentence.
- A word from the product's own screens or fact lines used as a label (its plan names, decision names, "call" for a decision, "keeps" or "drops" for what it chooses, "brief", "evidence", "fetched", "claim", credits, clusters, groups, the steps of its process), software called "a service", or a metric's name from his tools ("score", "difficulty", "volume", "intent", "authority", "CPC"): say what he gets and what the old way gave him in his own words, and name the tool's number once at most, in plain words.
- A product limit or an internal number as a feature (how many pages it reads, how many credits a run costs): nobody asked, and it makes the product smaller.
- A denial that plants the doubt it denies ("nothing is made up", "no fluff", "not a gimmick") when no reader raised it, and a warning in the sell that the product may come back with nothing ("when nothing is worth building, it says so"): it tells him no, with the reason; it never warns him it may find nothing.
- A daydream ("Picture...", "Imagine...") where a fact belongs.
- A proof called public, open or there to read without its link in reach: in a post the only link is in the first comment, so the proof is told, not pointed at.
- A fact that argues a different problem than the idea names: every line serves the idea.
- Six words in a row from any exemplar or example you were shown.
- The owner's tells below. Two in one piece fail it.`;

export const OUTPUT = `Output:

- Return only the JSON the request names. The copy is the block text; nothing else is customer-facing.
- Block ids are "<section_id>-<n>", numbered from 1 within each section. "items" is null except for bullets and numbered blocks. "meta" is null unless the request names a key.
- Text blocks hold plain prose. Use only the block types the part allows. A crosshead is its own block of type "crosshead" and states something.
- Keep each part inside its length band (words of copy, tags excluded). Write the parts in the order the request lists them; a later part may read the earlier ones.
- Work the way a copywriter on deadline works: decide the idea and the opening, write the whole piece in one pass, then check every fact and its tag. Thinking and writing share one budget; a piece written in one sitting beats one planned to death.`;

/** Section 7.1 as the writer reads it: the owner's table, the word lists and the exemptions; the structure notes, the tell edit's brief and the scoring belong to the editor and the detector. */
export function writerTells(): string {
  const cut = OWNER_TELLS.indexOf("\nStructure:");
  return cut > 0 ? OWNER_TELLS.slice(0, cut).trimEnd() : OWNER_TELLS;
}

const SYSTEM = [WRITER, "", NEVER, "", writerTells(), "", OUTPUT].join("\n");

const LEAD_TYPE_WORDS: Record<LeadType, string> = {
  offer: "the deal in line one",
  promise: "the result he wants, said to him (you), with its reason beside it; never the speaker wanting it",
  problem_solution: "his trouble in his own words, then the way out",
  secret: "the thing he does not know that explains his trouble",
  proclamation: "a flat statement he would argue with, made of a fact (a number, a thing that happened), never a maxim or a slogan, then the proof",
  story: "what happened, with a day, a place and a number",
};

function leadTypeLines(types: LeadType[]): string {
  return types.map((t, i) => `${LEAD_IDS[i]}: ${t} (${LEAD_TYPE_WORDS[t]})`).join("; ");
}

function openingLines(awareness: Awareness): string {
  const rule = LEAD_RULES_BY_AWARENESS[awareness];
  return `He is ${awareness.replace("_", " ")}, so the opening ${rule.opening_move.charAt(0).toLowerCase()}${rule.opening_move.slice(1)}; the product is named ${rule.product_named.toLowerCase()}; never ${rule.do_not.charAt(0).toLowerCase()}${rule.do_not.slice(1)}.`;
}

const RETURN_LEADS = `"leads":[{"id":"${LEAD_IDS[0]}","lead_type":"...","reader_hypothesis":"one sentence: the reader this opening is written for","blocks":[{"id":"${LEAD_IDS[0]}-1","type":"...","text":"...","items":null,"meta":null}]}, ...three in all...]`;

function wholeJob(args: DraftArgs, speaker: string, spec: FormatSpec): string {
  const call = args.call;
  const lead = call.lead!;
  const parts = [lead, ...call.units];
  const types = args.leadTypes ?? [];
  return [
    `Write the whole piece now, start to finish, as one piece of talk from ${speaker} to this reader: ${parts.map((u) => `${u.id} (${u.minWords} to ${u.maxWords} words)`).join(", ")}, in that order, ${spec.length_band_words[0]} to ${spec.length_band_words[1]} words in all. ${openingLines(args.awareness)}`,
    `The opening part, "${lead.id}", is lead ${LEAD_IDS[0]}. Then write ${LEAD_IDS[1]} and ${LEAD_IDS[2]}: two other openings to the same body, each a different way in, each inside the opening's band, each one the body follows without a change. The ways in: ${leadTypeLines(types)}. Line one of each: one thought, in words a ten-year-old knows, about twelve words, the moment he recognizes or a fact with its tag, said as the speaker would say it across a table.`,
    `Return {"sections":[${call.units.map((u) => `{"section_id":"${u.id}","title":null,"blocks":[{"id":"${u.id}-1","type":"...","text":"...","items":null,"meta":null}]}`).join(",")}],${RETURN_LEADS},"ledger_refs_used":["<every tag you used>"],"needs_source":["<every sentence marked [[NEEDS SOURCE]]>"]}. The sections hold every part but the opening; the opening is in the leads.`,
  ].join("\n");
}

function leadsJob(args: DraftArgs): string {
  const u = args.call.units[0];
  const types = args.leadTypes ?? [];
  const hook = u.maxWords < 150;
  return [
    `Write three openings for "${u.id}" (${u.minWords} to ${u.maxWords} words each), each a complete alternative, each a different way in: ${leadTypeLines(types)}. ${openingLines(args.awareness)} A cold read on another model picks one; the runner-up becomes the split-test challenger.`,
    hook
      ? `Each opening is a hook: line one says his problem or his moment plainly, in his words, about twelve words, with one concrete thing from his world and what it costs him; one claim a skeptic would doubt; it ends on something the body pays off; the product's name and the speaker's credential wait for the body.`
      : `Each opening is cut from the top (the first sentence is already inside the story or the claim); the speaker is known by word 150; one claim a skeptic would doubt; the mechanism named at most, never explained; it ends on something the body pays off.`,
    `Return {${RETURN_LEADS},"ledger_refs_used":[...],"needs_source":[...]}.`,
  ].join("\n");
}

function headlineJob(args: DraftArgs): string {
  const u = args.call.units[0];
  return [
    `Write the headline part "${u.id}" last, above the three openings below. It works above every one of them: set by where his head is (${args.awareness.replace("_", " ")}), it promises the one thing the idea promises, it violates no belief he holds, and it can be answered neither "no" nor "so what". A deck builds on the headline; a preheadline only if the part allows it and it earns its place. A tag on any number, name or study.`,
    `Return {"sections":[{"section_id":"${u.id}","title":null,"blocks":[...]}],"ledger_refs_used":[...],"needs_source":[...]}.`,
  ].join("\n");
}

function sectionsJob(args: DraftArgs): string {
  const units = args.call.units;
  const multi = units.some((u) => u.item);
  const items = multi ? `Each item is complete on its own and states the identical deal; a non-final item ends with a reason to open the next; never repeat a subject line, a hook or a story across items.` : "";
  return [
    `Write these parts now, in this order (call ${args.callIndex} of ${args.callTotal}): ${units.map((u) => `${u.id} (${u.minWords} to ${u.maxWords} words${u.item ? `; ${u.item.name} ${u.item.index} of ${u.item.count}${u.item.role ? `, ${u.item.role}` : ""}; meta {"item":"${u.item.index}"${u.item.role ? `,"role":"${u.item.role}"` : ""}}` : ""})`).join(", ")}.`,
    items,
    `Return {"sections":[{"section_id":"...","title":"<short title or null>","blocks":[{"id":"<section_id>-1","type":"...","text":"...","items":null,"meta":null}]}],"ledger_refs_used":["<every tag you used>"],"needs_source":["<every sentence marked [[NEEDS SOURCE]]>"]}. One entry per section_id listed, in that order.`,
  ].filter(Boolean).join("\n");
}

export const draftPrompt: PromptModule<DraftArgs> = {
  step: "draft",
  version: 19,
  effort: "high",
  maxTokens: 12000,
  system: SYSTEM,
  user: (ctx, args) => {
    const spec = ctx.format;
    const options = parseOptions(ctx.generation.options);
    const sp = speakerOf(ctx.brief, ctx.offer);
    const speaker = sp.name ?? "the speaker";
    const exempt = exemptTermsFrom(ctx.offer?.name, ctx.brief?.product_name);
    const job = args.call.kind === "whole" ? wholeJob(args, speaker, spec) : args.call.kind === "leads" ? leadsJob(args) : args.call.kind === "headline" ? headlineJob(args) : sectionsJob(args);
    const leadsText = args.leads?.length ? `THE THREE OPENINGS (written; the headline sits above whichever is chosen):\n${args.leads.map((l) => `--- ${l.id} (${l.lead_type}; reader: ${l.reader_hypothesis}) ---\n${sectionsWithIds([{ section_id: l.id, title: null, blocks: l.blocks }])}`).join("\n\n")}` : "";
    return [
      whoAndWhatText({ brief: ctx.brief, offer: ctx.offer, dossier: ctx.dossier, options, awareness: args.awareness, segment: args.segment }),
      ideaText(ctx.winningAngle, ctx.angles, args.thesis),
      productText(ctx.brief, ctx.offer, ctx.config),
      readerWordsText(ctx.dossier, ctx.claims),
      factsText(ctx.claims, spec),
      dealText(ctx.variant, ctx.brief, ctx.claims, spec, options),
      questionsText(ctx.questions),
      voiceLine(ctx.voice, ctx.config?.greeting, exempt),
      pieceText(spec, options),
      exemplarsText(spec.family, spec.name),
      CACHE_BREAK,
      args.examplesText ? `TEACHING MATERIAL (study the decisions; never reproduce the text):\n${args.examplesText}` : "",
      args.drafted.length ? `ALREADY WRITTEN (reading order; do not rewrite these; every later part states the identical deal and pays off what these set up):\n${sectionsWithIds(args.drafted)}` : "",
      leadsText,
      args.retryNote ? `CORRECTION FROM THE DESK (your previous attempt was rejected; fix exactly this):\n${args.retryNote}` : "",
      `YOUR JOB NOW:\n${job}`,
    ].filter(Boolean).join("\n\n");
  },
};
