/**
 * Draft prompt v1. One call drafts one group of sections (or the three leads, or the headline) within the
 * decided argument, the approved offer and the claims ledger. The system text is the writer's rulebook from
 * docs/04-copy-standard.md pasted verbatim; the user text carries the material for this generation.
 */
import { CACHE_BREAK, type PromptModule } from "./types.ts";
import { LEAD_SELECTION, OFFER_PRESENTATION, PROOF_PLACEMENT, RULES } from "./standard.ts";
import type { DraftCall } from "../draft/plan.ts";
import type { Awareness, LeadType } from "../schemas/common.ts";
import type { Section } from "../schemas/draft.ts";
import type { LeadVariantT } from "../draft/assemble.ts";
import { LEAD_IDS, LEAD_RULES_BY_AWARENESS } from "../draft/leads.ts";
import { briefText, configText, dossierText, formatRulesText, ledgerText, offerBlockText, questionsText, sectionSpecText, sectionsWithIds, voiceText } from "../draft/prompt_text.ts";
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
  /** lead types assigned to the three variants (leads call) */
  leadTypes: LeadType[] | null;
  examplesText: string;
  retryNote: string | null;
}

const SYSTEM = [
  `You are the writer on a direct response copy desk. You write one part of a selling piece at a time, inside decisions the desk has already made: the argument is chosen, the offer is designed and approved, every fact sits in a claims ledger with a grade. You do not revisit those decisions; you write within them, and you write the best copy that is true.`,
  ``,
  RULES,
  LEAD_SELECTION,
  PROOF_PLACEMENT,
  OFFER_PRESENTATION,
  `## Ledger discipline (the desk checks these by machine; a miss is a rejected draft)`,
  ``,
  `1. Every number, percentage, count, date, study, name, credential, quote, testimonial, price, plan, bonus value, former price, guarantee term, deadline and scarcity figure carries the id of the ledger row that supports it, inline, immediately after the fact, in this exact form: [[L:<claim id>]]. Copy the id character for character from the ledger. Never write an id the ledger does not show.`,
  `2. A fact the copy needs and the ledger lacks is written followed by [[NEEDS SOURCE]] and listed in needs_source. Never fill a gap with an invented figure, name, study, quote or review. A claim the ledger cannot carry is sized down to what it can carry, or cut.`,
  `3. Never generate a testimonial, reviewer, customer, narrator, composite, case study, study, survey or statistic. If the ledger holds no testimonial, the copy has no testimonial. If the dossier's story inventory is empty, the copy tells no story.`,
  `4. Precision matches the ledger row: 2,146 when it holds 2,146; "about 2,000" when it holds about 2,000. Never round up, sharpen, or convert a range into a point.`,
  `5. The claim is never bigger than the ledger grade. A supported claim is stated in the indicative with no hedge ("may", "can help", "designed to", "aims to" are defects on a supported claim). An unsupported claim is not hedged into existence; it is cut.`,
  `6. Objections come only from the objection map. Descriptions of the reader's state come from the verbatims, in the market's words. The one damaging admission is true, minor, from the brief or ledger, and followed at once by the claim it licenses.`,
  `7. The offer block states exactly the approved offer: name, deliverables, price and plan, every added cost, bonuses, the guarantee sentence, the deadline and its mechanism, the button verb. Not one number differs between the close, the order form, the P.S. and any email. Nothing is added to the offer: no bonus, discount, timer, stack value or guarantee the approved offer does not state.`,
  ``,
  `## Mechanics the desk checks by machine`,
  ``,
  `- The reader knows who is talking and why by word 150 of the lead.`,
  `- The lead contains one claim a skeptic would doubt, and nothing the reader does not yet accept in the headline or deck.`,
  `- Every claim's carrier (proof, mechanism, demonstration, ledger-backed specific) sits within two sentences of it. No proof box; no proof wall at the end.`,
  `- One call-to-action path: what to do, what happens after the click, what arrives when. The same destination every time.`,
  `- The turn from problem to product is a reason-why sentence that states a cause (a discovery, a failed fix, a mechanism), never "That's why we built".`,
  `- No summary paragraphs, no restated subject line as line one, no cheerful sign-off, no "In short", no question the next line does not answer.`,
  `- Indicative mood. Sentences vary in length (fragments and long sentences both); every sentence does a job or is cut.`,
  `- No Word-Substitute rewriting: a weak line is rebuilt from its claim and carrier, not re-worded with a synonym.`,
  `- Not tells, use them at human rates: exclamation marks, ellipses, caps for emphasis, fragments, "Here's why", "P.S.", "Dear Friend".`,
  `- Tells that get the draft sent back: "designed to / built for / crafted / tailored"; "That's why we built"; "cancel anytime, no contracts"; "You're not alone / If that sounds familiar"; "less than a cup of coffee"; "In the next few minutes I'll show you"; a summary closer; self-posed question crossheads; "so you can" benefit triads; "It's not X. It's Y." at more than one per thousand words; "unlock / elevate / seamless / streamline / effortless / cutting-edge / journey / game-changer / Picture this / Here's the kicker"; "Imagine..." with no specific on the next line; "frustrated / overwhelmed / juggling" as the only emotional content; "AI-powered" for a product that is not AI.`,
  ``,
  `## Voice`,
  ``,
  `The voice arrives as measured parameters, an idiom bank, a dead-word list, a greeting and exemplar paragraphs. Match the measurements and habits; never reuse the exemplars' sentences or facts. No tone adjectives are given and none are needed: the parameters are the voice.`,
  ``,
  `## Output`,
  ``,
  `- Return only the JSON the request names. The copy is the block text; nothing else is customer-facing. No notes to the client, no options, no alternatives, no "[Product Name]" placeholders, no stage directions, no explanation of what you did. Reasoning never appears in the copy.`,
  `- Use only the block types the section allows. Text blocks hold plain prose: no markdown headings, no bold-label-colon bullets ("**Speed:** ..."), no emoji bullets unless the format allows them. A bullet is a sentence carrying a claim and its carrier, or a fascination that withholds the closing noun. Crossheads are separate blocks of type "crosshead", and each states something (never a self-posed question).`,
  `- Block ids are "<section_id>-<n>", numbered from 1 within the section. "items" is null except for bullets and numbered blocks. "meta" is null unless the request names a key to set.`,
  `- Keep each section inside its length band. The band is words of copy, ledger tags excluded.`,
  `- Draft the sections in the order the request lists them; later sections may read the earlier ones.`,
].join("\n");

/** A lead section shorter than the speaker rule's 150 words is a hook: the opening line does the lead's whole job. */
function hookBand(args: DraftArgs): boolean {
  const max = args.call.kind === "leads" ? args.call.units[0]?.maxWords ?? 0 : 0;
  return max > 0 && max < 150;
}

function leadAssignment(args: DraftArgs): string {
  const rule = LEAD_RULES_BY_AWARENESS[args.awareness];
  const types = args.leadTypes ?? [];
  return [
    `Write THREE leads for this section, each a complete alternative, each on a different reader hypothesis and of a different lead type. The cold read on another model picks one; the runner-up becomes the split-test challenger.`,
    `Diagnosed awareness: ${args.awareness}${args.segment ? ` (segment: ${args.segment})` : ""}. Opening move for this state: ${rule.opening_move}. Product named: ${rule.product_named}. Do not: ${rule.do_not}.`,
    ...types.map((t, i) => `Lead ${LEAD_IDS[i]}: lead_type "${t}". Reader hypothesis: a specific reader from this segment, one sentence, built from the verbatims (who they are, what they have tried, what they believe now). The three hypotheses differ.`),
    hookBand(args)
      ? `Each lead is a hook: inside the section's band; line one says the reader's problem plainly, in words the reader would use, with a concrete thing from the reader's world (the tool, the task, the money or the hours) and what it costs them; it states the claim directly: no reframe that presents one thing as another, no "Here's the..." windup, no teaser that withholds nothing specific; read aloud, it is a sentence the speaker would say to one reader across a table, not a line for a poster; a number about the product's own output is proof for the next line, never the hook; one claim a skeptic would doubt; ends on an open loop that the body pays off; the speaker's credentials and the product's name wait for the body; ledger tags on every fact.`
      : `Each lead: inside the section's band; cut from the top (the first sentence is already inside the story or the claim); the speaker identified by word 150; one claim a skeptic would doubt; the mechanism named at most, never explained; ends on an open loop that the body pays off; ledger tags on every fact.`,
    `Return {"leads":[{"id":"${LEAD_IDS[0]}","lead_type":"...","reader_hypothesis":"...","blocks":[...]}, ...three in total...],"ledger_refs_used":[...],"needs_source":[...]}. Block ids "${LEAD_IDS[0]}-1", "${LEAD_IDS[0]}-2", ... per lead.`,
  ].join("\n");
}

export const draftPrompt: PromptModule<DraftArgs> = {
  step: "draft",
  version: 1,
  effort: "high",
  maxTokens: 12000,
  system: SYSTEM,
  user: (ctx, args) => {
    const spec = ctx.format;
    const options = parseOptions(ctx.generation.options);
    const unitLines: string[] = [];
    let lastItem: number | null = null;
    for (const u of args.call.units) {
      if (u.item && u.item.index !== lastItem) {
        unitLines.push(`${u.item.name.toUpperCase()} ${u.item.index} of ${u.item.count}${u.item.role ? `, role: ${u.item.role}` : ""} (section ids carry the "#${u.item.index}" suffix; set meta {"item":"${u.item.index}"${u.item.role ? `,"role":"${u.item.role}"` : ""}} on its blocks)`);
        lastItem = u.item.index;
      }
      unitLines.push(sectionSpecText(u.spec, { id: u.id, itemRole: u.item?.role ?? null }));
    }
    const unitsText = unitLines.join("\n");
    const multi = args.call.units.some((u) => u.item);
    const perItemSections = multi ? `Each item is complete on its own and states the identical deal; a non-final item ends with a reason to open the next; never repeat a subject line, hook or story across items.` : "";

    let job: string;
    if (args.call.kind === "leads") {
      job = `${leadAssignment(args)}\n\nSection spec:\n${unitsText}`;
    } else if (args.call.kind === "headline") {
      job = [
        `Write the headline section last, above the three leads below. It must work above every one of them: it is set by the awareness state (${args.awareness}), promises the one thing the thesis promises, violates no belief the reader holds, and can be answered neither "no" nor "so what". A deck builds on the headline; a preheadline only if the format allows it and it earns its place. Ledger tag on any number, name or study.`,
        `Return {"sections":[{"section_id":"${args.call.units[0].id}", "title":null, "blocks":[...]}],"ledger_refs_used":[...],"needs_source":[...]}.`,
        `Section spec:\n${unitsText}`,
      ].join("\n");
    } else {
      job = [
        `Draft these sections now, in this order (call ${args.callIndex} of ${args.callTotal}):`,
        unitsText,
        perItemSections,
        `Return {"sections":[{"section_id":"...","title":"<crosshead-free short title or null>","blocks":[{"id":"<section_id>-1","type":"...","text":"...","items":null,"meta":null}]}],"ledger_refs_used":["<every ledger id you cited>"],"needs_source":["<every sentence you marked [[NEEDS SOURCE]]>"]}. One entry per section_id listed, in that order.`,
      ].filter(Boolean).join("\n");
    }

    const leadsText = args.leads?.length ? `THE THREE LEADS (drafted; the headline sits above whichever is chosen):\n${args.leads.map((l) => `--- ${l.id} (${l.lead_type}; reader: ${l.reader_hypothesis}) ---\n${sectionsWithIds([{ section_id: l.id, title: null, blocks: l.blocks }])}`).join("\n\n")}` : "";

    return [
      formatRulesText(spec),
      options.purpose ? `PURPOSE: ${options.purpose}` : "",
      options.length === "longer" ? "LENGTH: the user asked for a longer piece than usual. Take each section toward the upper half of its band with new material: more of the reader's world and what the current way costs them, the demonstration told step by step as the reader will see it, the reason-why, the exact output, the specifics. A point said again in new words is padding; when the new material runs out, the section ends." : options.length === "shorter" ? "LENGTH: the user asked for a shorter piece than usual. Stay in the lower half of each band; cut setup, keep claims and their carriers." : "",
      `TARGET SEGMENT: ${args.segment ?? "default"} → awareness ${args.awareness}; sophistication stage ${args.sophistication}. Lead type and product-naming rule for this state: ${LEAD_RULES_BY_AWARENESS[args.awareness].opening_move}; product named ${LEAD_RULES_BY_AWARENESS[args.awareness].product_named.toLowerCase()}.`,
      `THE ARGUMENT (memo; every section serves this sentence and nothing else):\nTHESIS: ${args.thesis}\n${args.argumentText}`,
      offerBlockText(ctx.variant, ctx.brief, ctx.claims, ctx.format),
      briefText(ctx.brief, ctx.offer.name),
      ledgerText(ctx.claims),
      dossierText(ctx.dossier, { claims: ctx.claims }),
      voiceText(ctx.voice, ctx.config?.greeting, exemptTermsFrom(ctx.offer?.name, ctx.brief?.product_name)),
      configText(ctx.config),
      questionsText(ctx.questions),
      CACHE_BREAK,
      args.examplesText ? `TEACHING MATERIAL (study the decisions; never reproduce the text):\n${args.examplesText}` : "",
      args.drafted.length ? `ALREADY DRAFTED (reading order; do not rewrite these; every later section states the identical deal and pays off what these set up):\n${sectionsWithIds(args.drafted)}` : "ALREADY DRAFTED: nothing yet. You are writing the first part: the offer block and close come first so the rest of the piece is written toward a deal that already exists.",
      leadsText,
      args.retryNote ? `CORRECTION FROM THE DESK (your previous attempt was rejected; fix exactly this):\n${args.retryNote}` : "",
      `YOUR JOB NOW:\n${job}`,
    ].filter(Boolean).join("\n\n");
  },
};
