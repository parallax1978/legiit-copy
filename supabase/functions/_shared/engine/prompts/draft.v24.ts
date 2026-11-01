/**
 * Draft prompt, version 24: version 23's system with the manner, and the user message built for it (docs/04
 * Section 12). A piece is written in one master's manner: his way in, his shape of proof, his voice, with his
 * exemplar first among the pieces the writer studies; the structure of the case stays. The user chooses the manner
 * on the piece or the engine picks the family's default; the three openings of a piece are three ways in (the
 * manner's and two companions', each a different lead type), and the cold read picks.
 */
import { CACHE_BREAK, amend, type PromptModule } from "./types.ts";
import { draftPrompt as draftPrev, NEVER, OUTPUT, WRITER as WRITER_V23, writerTells, type DraftArgs } from "./draft.v23.ts";
import type { FormatSpec } from "../formats/spec.ts";
import type { Awareness, LeadType } from "../schemas/common.ts";
import { LEAD_IDS, LEAD_RULES_BY_AWARENESS } from "../draft/leads.ts";
import { questionsText, sectionsWithIds } from "../draft/prompt_text.ts";
import { dealText, factsText, ideaText, pieceText, productText, readerWordsText, speakerOf, voiceLine, whoAndWhatText } from "../draft/brief_text.ts";
import { exemplarsText } from "./exemplars/index.ts";
import { parseOptions } from "../draft/options.ts";
import { exemptTermsFrom } from "../tells.ts";
import { ArgumentOutput } from "../schemas/argument.ts";
import type { StepContext } from "../steps/types.ts";
import { type Manner, openingManners, pickManner } from "./manners.ts";

export type { DraftArgs };
export { NEVER, OUTPUT, writerTells };

export const MANNER_RULE = `The piece is written in one master's manner, named in the material (WRITTEN LIKE): his way in, his shape of proof, his voice, with his piece first among the ones you study. The case keeps its order under every manner; the manner decides how the piece gets in, what the proof looks like and how it sounds. Where the openings are three ways in, each is written in the manner it is given, and the body stays in the piece's manner under every one of them.`;

export const WRITER = amend(WRITER_V23, [
  [
    `- Ask once (every one of them): what to do, where, and what he gets.`,
    `- Ask once (every one of them): what to do, where, and what he gets.

${MANNER_RULE}`,
  ],
]);

const SYSTEM = amend(draftPrev.system, [[WRITER_V23, WRITER]]);

const LEAD_TYPE_WORDS: Record<LeadType, string> = {
  offer: "the deal in line one",
  promise: "the result he wants, said to him (you), with its reason beside it; never the speaker wanting it",
  problem_solution: "his trouble in his own words, then the way out",
  secret: "the thing he does not know that explains his trouble",
  proclamation: "a flat statement he would argue with, made of a fact (a number, a thing that happened), never a maxim or a slogan, then the proof",
  story: "what happened, with a day, a place and a number",
};

/** The three openings as manners when the step gave them the manners' lead types (Section 12), else null. */
function mannersFor(manner: Manner, types: LeadType[] | null): [Manner, Manner, Manner] | null {
  const ms = openingManners(manner);
  return types && ms.every((m, i) => m.lead_type === types[i]) ? ms : null;
}

function leadTypeLines(types: LeadType[], manners: Manner[] | null): string {
  return types.map((t, i) => {
    const m = manners?.[i];
    return m ? `${LEAD_IDS[i]}: ${t}, ${m.master}'s way in (${m.way_in})` : `${LEAD_IDS[i]}: ${t} (${LEAD_TYPE_WORDS[t]})`;
  }).join("; ");
}

function openingLines(awareness: Awareness): string {
  const rule = LEAD_RULES_BY_AWARENESS[awareness];
  return `He is ${awareness.replace("_", " ")}, so the opening ${rule.opening_move.charAt(0).toLowerCase()}${rule.opening_move.slice(1)}; the product is named ${rule.product_named.toLowerCase()}; never ${rule.do_not.charAt(0).toLowerCase()}${rule.do_not.slice(1)}.`;
}

const RETURN_LEADS = `"leads":[{"id":"${LEAD_IDS[0]}","lead_type":"...","reader_hypothesis":"one sentence: the reader this opening is written for","blocks":[{"id":"${LEAD_IDS[0]}-1","type":"...","text":"...","items":null,"meta":null}]}, ...three in all...]`;

function wholeJob(args: DraftArgs, speaker: string, spec: FormatSpec, manner: Manner): string {
  const call = args.call;
  const lead = call.lead!;
  const parts = [lead, ...call.units];
  const types = args.leadTypes ?? [];
  const manners = mannersFor(manner, args.leadTypes);
  return [
    `Write the whole piece now, start to finish, as one piece of talk from ${speaker} to this reader, in ${manner.master}'s manner: ${parts.map((u) => `${u.id} (${u.minWords} to ${u.maxWords} words)`).join(", ")}, in that order, ${spec.length_band_words[0]} to ${spec.length_band_words[1]} words in all. ${openingLines(args.awareness)}`,
    `The opening part, "${lead.id}", is lead ${LEAD_IDS[0]}. Then write ${LEAD_IDS[1]} and ${LEAD_IDS[2]}: two other openings to the same body, each a different way in, each inside the opening's band, each one the body follows without a change. The ways in: ${leadTypeLines(types, manners)}. ${manners ? `The body stays in ${manner.master}'s manner under every one of them.` : `Any of the three may open on the test he runs on his own screen in the next ten seconds (Hopkins), when the piece has one.`} Line one of each: one thought, in words a ten-year-old knows, about twelve words, the moment he recognizes or a fact with its tag, said as the speaker would say it across a table.`,
    `Return {"sections":[${call.units.map((u) => `{"section_id":"${u.id}","title":null,"blocks":[{"id":"${u.id}-1","type":"...","text":"...","items":null,"meta":null}]}`).join(",")}],${RETURN_LEADS},"ledger_refs_used":["<every tag you used>"],"needs_source":["<every sentence marked [[NEEDS SOURCE]]>"]}. The sections hold every part but the opening; the opening is in the leads.`,
  ].join("\n");
}

function leadsJob(args: DraftArgs, manner: Manner): string {
  const u = args.call.units[0];
  const types = args.leadTypes ?? [];
  const manners = mannersFor(manner, args.leadTypes);
  const hook = u.maxWords < 150;
  return [
    `Write three openings for "${u.id}" (${u.minWords} to ${u.maxWords} words each), each a complete alternative, each a different way in: ${leadTypeLines(types, manners)}. ${openingLines(args.awareness)} ${manners ? `The body that follows is in ${manner.master}'s manner, and every one of the three leads into it. ` : ""}A cold read on another model picks one; the runner-up becomes the split-test challenger.`,
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

function sectionsJob(args: DraftArgs, manner: Manner): string {
  const units = args.call.units;
  const multi = units.some((u) => u.item);
  const items = multi ? `Each item is complete on its own and states the identical deal; a non-final item ends with a reason to open the next; never repeat a subject line, a hook or a story across items.` : "";
  return [
    `Write these parts now, in this order (call ${args.callIndex} of ${args.callTotal}), in ${manner.master}'s manner: ${units.map((u) => `${u.id} (${u.minWords} to ${u.maxWords} words${u.item ? `; ${u.item.name} ${u.item.index} of ${u.item.count}${u.item.role ? `, ${u.item.role}` : ""}; meta {"item":"${u.item.index}"${u.item.role ? `,"role":"${u.item.role}"` : ""}}` : ""})`).join(", ")}.`,
    items,
    `Return {"sections":[{"section_id":"...","title":"<short title or null>","blocks":[{"id":"<section_id>-1","type":"...","text":"...","items":null,"meta":null}]}],"ledger_refs_used":["<every tag you used>"],"needs_source":["<every sentence marked [[NEEDS SOURCE]]>"]}. One entry per section_id listed, in that order.`,
  ].filter(Boolean).join("\n");
}

/** The product sentence the argument step wrote for this run, when the step ran a version that writes one. */
function argumentSentence(ctx: StepContext): string | null {
  const r = ArgumentOutput.safeParse(ctx.stepOutputs.argument);
  return r.success ? r.data.product_sentence ?? null : null;
}

export const draftPrompt: PromptModule<DraftArgs> = {
  step: "draft",
  version: 24,
  effort: "high",
  maxTokens: 12000,
  system: SYSTEM,
  user: (ctx, args) => {
    const spec = ctx.format;
    const options = parseOptions(ctx.generation.options);
    const sp = speakerOf(ctx.brief, ctx.offer);
    const speaker = sp.name ?? "the speaker";
    const exempt = exemptTermsFrom(ctx.offer?.name, ctx.brief?.product_name);
    const { manner } = pickManner(spec, options.manner);
    const job = args.call.kind === "whole" ? wholeJob(args, speaker, spec, manner) : args.call.kind === "leads" ? leadsJob(args, manner) : args.call.kind === "headline" ? headlineJob(args) : sectionsJob(args, manner);
    const leadsText = args.leads?.length ? `THE THREE OPENINGS (written; the headline sits above whichever is chosen):\n${args.leads.map((l) => `--- ${l.id} (${l.lead_type}; reader: ${l.reader_hypothesis}) ---\n${sectionsWithIds([{ section_id: l.id, title: null, blocks: l.blocks }])}`).join("\n\n")}` : "";
    return [
      whoAndWhatText({ brief: ctx.brief, offer: ctx.offer, dossier: ctx.dossier, options, awareness: args.awareness, segment: args.segment }),
      ideaText(ctx.winningAngle, ctx.angles, args.thesis),
      productText(ctx.brief, ctx.offer, ctx.config, argumentSentence(ctx)),
      readerWordsText(ctx.dossier, ctx.claims),
      factsText(ctx.claims, spec),
      dealText(ctx.variant, ctx.brief, ctx.claims, spec, options),
      questionsText(ctx.questions),
      voiceLine(ctx.voice, ctx.config?.greeting, exempt),
      pieceText(spec, options),
      exemplarsText(spec.family, spec.name, manner.master),
      CACHE_BREAK,
      args.examplesText ? `TEACHING MATERIAL (study the decisions; never reproduce the text):\n${args.examplesText}` : "",
      args.drafted.length ? `ALREADY WRITTEN (reading order; do not rewrite these; every later part states the identical deal and pays off what these set up):\n${sectionsWithIds(args.drafted)}` : "",
      leadsText,
      args.retryNote ? `CORRECTION FROM THE DESK (your previous attempt was rejected; fix exactly this):\n${args.retryNote}` : "",
      `YOUR JOB NOW:\n${job}`,
    ].filter(Boolean).join("\n\n");
  },
};
