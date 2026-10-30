/**
 * The material as the writer reads it (draft v19, revise v19): who is talking, to whom, to do what; the idea; the
 * product; his words; the facts; the deal; the piece. Each said once, plainly, with no rule text in the headers:
 * the rules are in the system text, and a writer who reads a lecture before every block writes a lecture. The
 * reviewers keep the fuller renderers in prompt_text.ts.
 */
import type { FormatSpec, SectionSpec } from "../formats/spec.ts";
import type { AngleRow, ClaimRow, OfferConfigRow, OfferRow, OfferVariantRow, VoiceProfileRow } from "../steps/types.ts";
import { type OfferBrief, parseSetup } from "../schemas/brief.ts";
import type { Dossier } from "../schemas/research.ts";
import { Candidate } from "../schemas/argument.ts";
import type { Awareness } from "../schemas/common.ts";
import { provenanceNote } from "../prompts/intake.v1.ts";
import { ONE_LINE_OFFER_FAMILIES, offerBlockText, rowFacts, verbatimLedgerTags, voiceText } from "./prompt_text.ts";
import { verbatimKey } from "../research/answers.ts";
import { GRADE_CEILING, GRADE_CEILING_BY_FORMAT } from "../tells.ts";
import { ADMISSION_TELL_RE } from "./admissions.ts";
import type { GenerationOptions } from "./options.ts";

/** A ledger reference as the dossier may hold it ("L:<id>", "[[L:<id>]]" or the bare id) reduced to the id. */
const ledgerId = (ref: string) => ref.replace(/^\[\[|\]\]$/g, "").replace(/^L:/, "");

const clip = (s: string | null | undefined, n: number) => (s ? (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s) : "");

export interface Speaker {
  name: string | null;
  role: string | null;
}

/** The person who signs the piece: the brief's speaker, else the setup's. */
export function speakerOf(brief: OfferBrief | null, offer: OfferRow | null): Speaker {
  const setup = parseSetup(offer?.setup);
  return { name: brief?.speaker?.name ?? setup.speaker_name ?? null, role: brief?.speaker?.role ?? setup.speaker_role ?? null };
}

/** Who is talking, to whom, and what the user asked the piece to do. */
export function whoAndWhatText(input: { brief: OfferBrief | null; offer: OfferRow; dossier: Dossier | null; options: GenerationOptions; awareness: Awareness; segment: string | null }): string {
  const { brief, offer, dossier, options } = input;
  const setup = parseSetup(offer.setup);
  const sp = speakerOf(brief, offer);
  const seg = dossier?.awareness_by_segment.find((s) => s.label === input.segment) ?? null;
  const reader = setup.reader ?? brief?.audience.who ?? offer.audience ?? "the reader the offer is for";
  const lines = [
    `WHO IS TALKING, TO WHOM, AND WHAT THIS PIECE MUST DO`,
    `Speaker: ${sp.name ?? "the owner of the business"}${sp.role ? `, ${sp.role}` : ""}. The piece carries his name, so it never says his title or his company for its own sake.`,
    `Reader: ${reader}.`,
    seg ? `Where his head is: ${input.awareness.replace("_", " ")}. ${clip(seg.evidence, 260)}` : `Where his head is: ${input.awareness.replace("_", " ")}.`,
    brief?.audience.situation ? `His situation: ${brief.audience.situation}.` : "",
    dossier ? `What he feels about the way he does it now: ${dossier.resident_emotion.emotion}. ${clip(dossier.resident_emotion.evidence, 260)}` : "",
    dossier ? `What pushes him to look for something else: ${clip(dossier.forces.push, 240)}` : "",
    dossier ? `What keeps him where he is: ${clip(dossier.forces.habit, 240)}` : "",
    dossier ? `What he is afraid of: ${clip(dossier.forces.anxiety, 240)}` : "",
    dossier ? `What he hopes for: ${clip(dossier.forces.pull, 240)}` : "",
    options.purpose ? `What the user asked this piece to do: ${options.purpose.trim()}` : "",
    options.cta ? `The call to action the user asked for: ${options.cta.trim()}` : "",
    options.instructions ? `The user's instructions for this piece: ${options.instructions.trim()}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

/** The chosen argument as an idea, not a memo: the big idea, the promise, what he believes now, what the product does, the proof. */
export function ideaText(winner: AngleRow | null, angles: AngleRow[], thesis: string | null): string {
  const c = winner ? Candidate.safeParse(winner.candidate) : null;
  if (!c || !c.success) return thesis ? `THE IDEA (chosen; every line serves it)\n${thesis}` : "THE IDEA: none recorded.";
  const k = c.data;
  const losers = angles.filter((a) => a.kept_as_loser && a.id !== winner!.id).map((a) => Candidate.safeParse(a.candidate)).filter((r) => r.success).map((r) => r.data);
  return [
    `THE IDEA (chosen; every line serves it)`,
    `The big idea: ${k.big_idea}`,
    `The promise: ${k.promise}`,
    `What he believes now, which this piece replaces: ${k.belief_to_displace}`,
    `What the product does for him, in his words: ${k.mechanism}`,
    `What he wants most here: ${k.core_desire}`,
    `The proof that carries the promise: ${k.proof_asset}${k.proof_ledger_refs.length ? ` (facts ${k.proof_ledger_refs.map((r) => `[[L:${r}]]`).join(" ")})` : ""}`,
    k.lead_verbatim_id ? `The thing he said that opens the door: ${k.lead_verbatim_id}` : "",
    losers.length ? `Other angles, usable inside the body, never as the opening:\n${losers.map((l) => `  - ${l.big_idea}: ${l.promise}`).join("\n")}` : "",
  ].filter(Boolean).join("\n");
}

/** The page the piece sends him to: the first source URL that is the site itself, not its terms, help, login or a shared report. */
export function siteLink(brief: OfferBrief | null): string | null {
  const urls = brief?.urls ?? [];
  const site = urls.find((u) => !/\/(terms|help|login|share|privacy|pricing|docs|blog)\b/i.test(u) && !/[?#]/.test(u)) ?? urls[0] ?? null;
  return site ? site.replace(/\/+$/, "") : null;
}

/** The product in plain words, what to leave out, who it is up against, what nobody knows. */
export function productText(brief: OfferBrief | null, offer: OfferRow, config: OfferConfigRow | null): string {
  const setup = parseSetup(offer.setup);
  const name = brief?.product_name ?? offer.name;
  const link = siteLink(brief);
  const humor = config?.humor_policy && typeof config.humor_policy === "object" && (config.humor_policy as { allowed?: boolean }).allowed === false;
  return [
    `THE PRODUCT`,
    `${name}: ${setup.product_sentence ?? brief?.one_line ?? offer.positioning ?? "(no plain sentence on file)"}`,
    link ? `The site: ${link}` : "",
    brief?.positioning && brief.positioning !== setup.product_sentence ? `Against the others: ${brief.positioning}` : "",
    setup.leave_out ? `Leave out of every piece: ${setup.leave_out}` : "",
    brief?.competitors.length ? `What he uses or compares now: ${brief.competitors.join(", ")}` : "",
    brief?.unknowns.length ? `Nobody knows these yet (never fill one in with a number, a name, a quote or a result): ${brief.unknowns.map((u) => clip(u, 120)).join("; ")}` : "",
    humor ? `Humor: none in this piece.` : "",
    config?.greeting ? `Greeting: ${config.greeting}` : "",
  ].filter(Boolean).join("\n");
}

/** His own words, the objections he raises, the stories and proof on file, the competitors' lines. */
export function readerWordsText(d: Dossier | null, claims: Pick<ClaimRow, "id" | "claim_type" | "claim_text" | "user_decision">[], opts: { maxVerbatims?: number } = {}): string {
  if (!d) return `WHAT HE HAS SAID: nothing on file. Describe his situation from the plain facts of the work everyone in his trade does; no invented number, name or event; no objection the brief does not name; no story.`;
  const maxV = opts.maxVerbatims ?? 40;
  const themed = new Set(d.themes.flatMap((t) => t.verbatim_ids));
  const verbatims = [...d.verbatims].sort((a, b) => Number(themed.has(b.id)) - Number(themed.has(a.id))).slice(0, maxV);
  const tags = verbatimLedgerTags(claims);
  const tagOf = (text: string) => {
    const id = tags.get(verbatimKey(text));
    return id ? ` [[L:${id}]]` : "";
  };
  return [
    `WHAT HE HAS SAID (his own words from reviews and forums: use his words and his details; a line is quoted or attributed only when it carries a tag)`,
    ...verbatims.map((v) => `  ${v.id}${tagOf(v.text)} [${v.tags.join(", ")}] "${clip(v.text, 320)}"`),
    d.objection_map.length ? `Objections he raises (the only ones the piece may raise or answer):\n${d.objection_map.map((o) => `  - ${o.text}`).join("\n")}` : `Objections he raises: none on file; raise none.`,
    d.story_inventory.length ? `Stories you may tell (the only ones):\n${d.story_inventory.map((s) => `  - ${s.event}${s.date ? ` (${s.date})` : ""}${s.numbers ? `; numbers: ${s.numbers}` : ""}${s.people ? `; people: ${s.people}` : ""}`).join("\n")}` : `Stories you may tell: none on file; tell none.`,
    d.proof_inventory.length ? `Proof on file:\n${d.proof_inventory.map((p) => `  - ${p.claim}${p.ledger_ref ? ` [[L:${ledgerId(p.ledger_ref)}]]` : " (no fact line: not usable as a fact)"}`).join("\n")}` : "",
    d.competitor_table.length ? `What the others say: ${d.competitor_table.map((c) => `${c.name}${c.headline_outcome ? ` ("${clip(c.headline_outcome, 90)}")` : ""}`).join("; ")}` : "",
  ].filter(Boolean).join("\n");
}

const STOP = new Set(["a", "an", "the", "to", "of", "and", "or", "in", "on", "at", "for", "with", "by", "from", "it", "its", "is", "are", "was", "be", "that", "this", "you", "your", "he", "his", "they", "their", "as", "if", "so", "but", "not", "no", "do", "does", "has", "have", "will", "can", "one", "every", "each", "when", "then", "than", "into", "out", "up"]);
const factWords = (text: string) => new Set(rowFacts(text).toLowerCase().replace(/[^a-z0-9$%]+/g, " ").split(" ").filter((w) => w && !STOP.has(w)));
/** Two rows that say the same thing: most of the words of one are in the other (the offer step writes a row each time it runs; the intake a row per source). */
export const SAME_FACT_SHARE = 0.6;
function sameFact(a: Set<string>, b: Set<string>): boolean {
  if (!a.size || !b.size) return false;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / Math.min(a.size, b.size) >= SAME_FACT_SHARE;
}

/** Offer terms a piece that takes no payment never states (rule 16): legal and payment boilerplate. */
const TERMS_ONLY_TYPES = new Set(["other"]);
/** Plan mechanics that stay on the page that takes payment: credits, maps, packs, seats, the API. */
const PLAN_MECHANICS = /\bcredits?\b|topical map|knowledge base|white label|\bapi\b|credit pack|agency \$/i;
const LEAD_OFFER = /\$1\b|\btrial\b|\b7 days\b|\bseven days\b|\bday seven\b|\bcancel\b/i;

/**
 * The rows a writer reads: the user's dropped rows gone, the same fact said once, and for a piece that takes no
 * payment the legal terms and the plan mechanics left to the page that does (rule 16).
 */
export function writerClaims(claims: ClaimRow[], spec: FormatSpec | null = null): ClaimRow[] {
  const oneLine = !!spec && ONE_LINE_OFFER_FAMILIES.has(spec.family);
  const kept: { row: ClaimRow; words: Set<string> }[] = [];
  for (const c of claims) {
    if (c.user_decision === "drop") continue;
    if (oneLine && c.role === "offer_term" && TERMS_ONLY_TYPES.has(c.claim_type)) continue;
    if (oneLine && c.role === "offer_term" && PLAN_MECHANICS.test(c.claim_text) && !LEAD_OFFER.test(c.claim_text)) continue;
    const words = factWords(c.claim_text);
    // the user's own wording and decisions outrank an engine duplicate: a later row the user acted on replaces the earlier one
    const dup = kept.findIndex((k) => sameFact(k.words, words));
    if (dup >= 0) {
      if (c.user_decision && !kept[dup].row.user_decision) kept[dup] = { row: c, words };
      continue;
    }
    kept.push({ row: c, words });
  }
  return kept.map((k) => k.row);
}

const GRADE_WORDS: Record<string, string> = { A: "a controlled result", B: "a measured result", C: "a documented result", D: "a reported result", E: "a demonstration, not a result a customer got", F: "the seller's own statement" };

/** The facts as the writer reads them: one line each, the tag first, the grade and where it comes from in a parenthesis. */
export function factsText(claims: ClaimRow[], spec: FormatSpec | null = null): string {
  const rows = writerClaims(claims, spec);
  if (!rows.length) return `THE FACTS: none on file. Every number, name, price, quote and result the piece needs is written with [[NEEDS SOURCE]].`;
  const lines = rows.map((c) => {
    const notes: string[] = [];
    if (c.evidence_grade) notes.push(`grade ${c.evidence_grade}: ${GRADE_WORDS[c.evidence_grade] ?? c.evidence_grade}`);
    const prov = provenanceNote(c.evidence);
    if (prov) notes.push(prov.replace(/^provenance:\s*/i, ""));
    if (c.precision) notes.push(`precision: ${c.precision}`);
    if (c.user_decision === "rewrite") notes.push("the user's wording: use as written");
    if (c.user_decision === "keep") notes.push("the user decided: keep");
    const ev = (c.evidence ?? {}) as Record<string, unknown>;
    if (ev.quote && (c.claim_type === "statistic" || c.claim_type === "narrative" || c.claim_type === "testimonial")) notes.push(`source says: "${clip(String(ev.quote), 200)}"`);
    if (c.flag && c.user_decision !== "keep") notes.push("a note for the user is pending on this line; the copy says it at full strength and takes no rewrite from the note");
    // "a planned subscription", "no website yet": the line's wording, which the piece never repeats (docs/04 rule 12)
    ADMISSION_TELL_RE.lastIndex = 0;
    if (ADMISSION_TELL_RE.test(rowFacts(c.claim_text))) notes.push("the words that say it is planned, new or without a site yet are this line's wording, not the fact: the piece names the thing as what it is");
    return `- [[L:${c.id}]] ${rowFacts(c.claim_text)}${notes.length ? ` (${notes.join("; ")})` : ""}`;
  });
  return `THE FACTS (every number, name, date, price, quote, result and credential the piece may use, each with its tag written right after it; a line is the fact, not the wording: keep its numbers and names and the words that bound a number, and say the rest in your own words to him; a sentence that repeats a line's phrasing is sent back; a "could", "may" or "can help" inside a line is the line's wording, not the fact, so the piece says what the product does in the indicative; nothing outside this list exists)\n${lines.join("\n")}`;
}

const DEAL_TYPES = new Set(["continuity_trial", "price_discount", "free", "guarantee"]);

/** The deal: one line for a piece that takes no payment, the approved block for one that does. */
export function dealText(variant: OfferVariantRow | null, brief: OfferBrief | null, claims: ClaimRow[], spec: FormatSpec, options: GenerationOptions): string {
  if (!ONE_LINE_OFFER_FAMILIES.has(spec.family)) return offerBlockText(variant, brief, claims, spec);
  const rows = writerClaims(claims, spec).filter((c) => c.role === "offer_term" && DEAL_TYPES.has(c.claim_type)).sort((a, b) => rowFacts(a.claim_text).length - rowFacts(b.claim_text).length).slice(0, 8);
  return [
    `THE DEAL (this ${spec.name.toLowerCase()} takes no payment, so it says the deal once, in one plain line where the piece puts it: the price, the trial and the action; the guarantee's conditions, the plan's credits and the cancel mechanics stay on the page that takes payment)`,
    brief ? `Price: ${brief.price.text}` : "",
    ...rows.map((c) => `- [[L:${c.id}]] ${rowFacts(c.claim_text)}`),
    siteLink(brief) ? `The link (written out where the piece carries the link): ${siteLink(brief)}` : "The link: none on file; write the link line without a URL.",
    options.cta ? `The user's call to action: ${options.cta.trim()}` : "",
  ].filter(Boolean).join("\n");
}

function partText(s: SectionSpec, id = s.id): string {
  return [
    `- ${id} (${s.band_words[0]} to ${s.band_words[1]} words): ${s.name}. ${s.job}`,
    s.must.length ? `  it has: ${s.must.join("; ")}` : "",
    s.must_not.length ? `  never: ${s.must_not.join("; ")}` : "",
    s.block_types?.length ? `  block types: ${s.block_types.join(", ")}` : "",
    s.optional ? `  optional: leave it empty when the material does not support it` : "",
  ].filter(Boolean).join("\n");
}

/** The piece: what it is, its parts in reading order, its length, its limits. */
export function pieceText(spec: FormatSpec, options: GenerationOptions): string {
  const length = options.length === "longer"
    ? `Length: the user asked for a longer piece. Each part runs toward the top of its band with new material (more of his world, the case told as he will see it, the exact thing he gets); a point said twice is padding, and when the new material runs out the part ends.`
    : options.length === "shorter"
    ? `Length: the user asked for a shorter piece. Each part stays in the lower half of its band; cut setup, keep claims and their proof.`
    : "";
  const grade = GRADE_CEILING_BY_FORMAT[spec.id] ?? GRADE_CEILING[spec.family];
  return [
    `THE PIECE: ${spec.name}, ${spec.length_band_words[0]} to ${spec.length_band_words[1]} words in all. ${spec.description}`,
    `Its parts, in reading order:`,
    ...spec.sections.map((s) => partText(s)),
    length,
    `Reading grade: ${grade} or below, as the Hemingway app grades it (a machine checks it): short words, most sentences under fifteen words, one long one where the feeling needs it. A sentence over thirty words is two sentences.`,
    spec.hard_gates.length ? `Checked by machine: ${spec.hard_gates.join("; ")}` : "",
    spec.platform_limits ? `Platform limits: ${Object.entries(spec.platform_limits).map(([k, v]) => `${k}=${v}`).join(", ")}` : "",
    `${spec.allow_markdown_headings ? "Markdown headings allowed" : "No markdown headings"}; ${spec.allow_caps ? "caps at human rates" : "no caps"}; no em dashes, emojis or hashtags.`,
  ].filter(Boolean).join("\n");
}

/** The voice: the profile when there is one, else his own. */
export function voiceLine(voice: VoiceProfileRow | null, greeting: string | null | undefined, exemptTerms: string[]): string {
  if (voice) return voiceText(voice, greeting, exemptTerms);
  return `VOICE: his own. One person talking to one, in plain spoken English; sentence lengths vary; fragments allowed${greeting ? `; greeting: "${greeting}"` : ""}.`;
}
