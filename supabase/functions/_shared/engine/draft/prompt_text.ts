/**
 * Turns stored rows into prompt text. Pure string builders; every function tolerates missing data and says so,
 * because a prompt that silently omits the ledger invites invention.
 */
import type { FormatSpec, SectionSpec } from "../formats/spec.ts";
import type { ClaimRow, OfferVariantRow, VoiceProfileRow } from "../steps/types.ts";
import type { OfferBrief } from "../schemas/brief.ts";
import type { Dossier } from "../schemas/research.ts";
import { ChosenOffer } from "../schemas/offer.ts";
import type { Section } from "../schemas/draft.ts";
import { renderBlock } from "../render.ts";
import { verbatimKey, verbatimWords } from "../research/answers.ts";
import { FORMAT_SPECS } from "../prompts/standard.ts";
import { readerText } from "./ledger.ts";
import { stripNeverTells } from "./never_tells.ts";
import { ownerTellsIn } from "../tells.ts";

const clip = (s: string | null | undefined, n: number) => (s ? (s.length > n ? s.slice(0, n - 1) + "…" : s) : "");
const j = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v));

/** One ledger row per line with its inline tag, grade, status and the terms copy must repeat exactly. */
export function ledgerText(claims: ClaimRow[], opts: { includeDropped?: boolean } = {}): string {
  const rows = claims.filter((c) => opts.includeDropped || c.user_decision !== "drop");
  if (rows.length === 0) return "CLAIMS LEDGER: empty. Every number, name, study, price, guarantee and deadline the copy needs must be written with [[NEEDS SOURCE]].";
  const lines = rows.map((c) => {
    const decision = c.user_decision === "drop"
      ? ", DROPPED by the user: unusable, never cite"
      : c.user_decision === "keep"
      ? ", user decided: keep (flag risk accepted; do not re-flag)"
      : c.user_decision === "rewrite"
      ? ", user decided: rewrite (this claim text is the accepted wording; use it as written)"
      : "";
    const parts = [`[[L:${c.id}]] (${c.claim_type}${c.role ? `, role ${c.role}` : ""}, grade ${c.evidence_grade ?? "none"}, ${c.status}${decision})`];
    parts.push(`  claim: ${c.claim_text}`);
    if (c.precision) parts.push(`  precision: ${c.precision}`);
    const ev = (c.evidence ?? {}) as Record<string, unknown>;
    const evParts = ["source_ref", "endpoint", "population", "dose", "duration", "effect_size"].filter((k) => ev[k]).map((k) => `${k}=${j(ev[k])}`);
    if (evParts.length) parts.push(`  evidence: ${evParts.join("; ")}`);
    if (ev.quote) parts.push(`  source quote: ${clip(String(ev.quote), 300)}`);
    if (c.typical_result) parts.push(`  typical result: ${c.typical_result}`);
    if (c.earnings_context) parts.push(`  earnings context: ${j(c.earnings_context)}`);
    if (c.guarantee_terms) parts.push(`  guarantee terms: ${j(c.guarantee_terms)}`);
    if (c.former_price) parts.push(`  former price: ${j(c.former_price)}`);
    if (c.scarcity) parts.push(`  scarcity: ${j(c.scarcity)}`);
    if (c.deadline) parts.push(`  deadline: ${j(c.deadline)}`);
    if (c.trial_terms) parts.push(`  trial terms: ${j(c.trial_terms)}`);
    if (c.material_connection) parts.push(`  material connection: yes (disclose)`);
    if (c.story_claim) parts.push(`  story claim`);
    if (c.establishment_signal) parts.push(`  establishment signal`);
    if (c.flag) parts.push(`  flag: ${j(c.flag)}`);
    return parts.join("\n");
  });
  return `CLAIMS LEDGER (${rows.length} rows; cite the id inline immediately after the fact it supports; a row is the fact, not the wording: keep its numbers, names and every word that sets a claim's size or precision ("up to," "about," "most," "within") and say the rest the way the speaker would to one reader, never in the row's feature phrasing; a row the user decided "rewrite", a line the offer block says to repeat and a quotation of a documented person or source stay as written: rule 11):\n${lines.join("\n")}`;
}

export function briefText(brief: OfferBrief | null, offerName: string): string {
  if (!brief) return `OFFER BRIEF: not parsed. Offer name: ${offerName}. Treat every product fact as needing a ledger row.`;
  return [
    `OFFER BRIEF`,
    `product: ${brief.product_name}`,
    `one line: ${brief.one_line}`,
    `deliverables: ${brief.deliverables.join("; ") || "none listed"}`,
    `price: ${brief.price.text}${brief.price.plan ? ` (${brief.price.plan})` : ""}`,
    brief.terms ? `terms: ${brief.terms}` : "",
    `guarantee: ${brief.guarantee.text ?? "none"}${brief.guarantee.days ? ` (${brief.guarantee.days} days)` : ""}${brief.guarantee.denominated ? " denominated" : ""}`,
    `audience: ${brief.audience.who}${brief.audience.situation ? `; situation: ${brief.audience.situation}` : ""}`,
    brief.speaker?.name ? `signed by: ${brief.speaker.name}${brief.speaker.role ? `, ${brief.speaker.role}` : ""}` : "",
    brief.lead_offer ? `lead offer (every asset states this one deal): ${brief.lead_offer}` : "",
    brief.positioning ? `positioning: ${brief.positioning}` : "",
    brief.proof_available.length ? `proof available: ${brief.proof_available.map((p) => `${p.claim}: ${p.evidence}${p.source ? ` (${p.source})` : ""}`).join(" | ")}` : "",
    brief.competitors.length ? `competitors: ${brief.competitors.join(", ")}` : "",
    brief.unknowns.length ? `unknowns (never fill one in with a number, a name, a quote or a result someone got; an unknown about whether the product gets results never stops the promise of the result it produces, rule 8): ${brief.unknowns.join("; ")}` : "",
  ].filter(Boolean).join("\n");
}

/** Formats that do not take payment: they state the offer in one line and leave the terms to the page that does (rule 16). */
export const ONE_LINE_OFFER_FAMILIES = new Set<FormatSpec["family"]>(["social", "ad", "email", "message", "audio"]);

/** The approved offer: the single source of truth for price, guarantee, deadline, bonuses and the button. */
export function offerBlockText(variant: OfferVariantRow | null, brief: OfferBrief | null, claims: ClaimRow[], spec: FormatSpec | null = null): string {
  const oneLine = !!spec && ONE_LINE_OFFER_FAMILIES.has(spec.family);
  const terms = claims.filter((c) => c.user_decision !== "drop" && (c.role === "offer_term" || ["price_discount", "guarantee", "scarcity_urgency", "continuity_trial", "free"].includes(c.claim_type)));
  const termLines = terms.length
    ? `offer-term ledger rows (cite these${oneLine ? `; this ${spec!.name} does not take payment, so it states the offer once, in one line (the price, the trial and the action), where the format puts it, and leaves the guarantee's terms, the trial's limits (what opens when), the plan's credits and allowances, the cancel mechanics and the refund policy to the page that takes payment: rule 16` : ""}):\n${terms.map((c) => `  [[L:${c.id}]] ${c.claim_text}`).join("\n")}`
    : "offer-term ledger rows: none; any price, guarantee or deadline figure without a row is written with [[NEEDS SOURCE]]";
  if (!variant) {
    return [
      `APPROVED OFFER BLOCK: no constructed variant. The offer is the brief's deliverables, price and guarantee exactly as stated there. Nothing is added: no bonus, no discount, no deadline, no stack value.`,
      brief ? `price: ${brief.price.text}${brief.price.plan ? ` (${brief.price.plan})` : ""}; guarantee: ${brief.guarantee.text ?? "none"}; deliverables: ${brief.deliverables.join("; ")}` : "",
      termLines,
    ].filter(Boolean).join("\n");
  }
  const chosen = ChosenOffer.safeParse(variant.chosen);
  const lines = [
    `APPROVED OFFER BLOCK (status ${variant.status}; the close, the order form and every asset state exactly this deal):`,
    `This block fixes the deal (price, trial, guarantee, terms) and what arrives when. Nothing in it limits what the copy promises: the copy sells the result the product produces, the rankings, the customers, the sales and the money included (rule 8), and any note below that says to leave them out is overruled.`,
  ];
  if (chosen.success) {
    const c = chosen.data;
    lines.push(`variant: ${c.variant}; reasons: ${c.reasons}`);
    lines.push(`price presentation: ${c.price_presentation}`);
    if (brief) lines.push(`price: ${brief.price.text}${brief.price.plan ? ` (${brief.price.plan})` : ""}`);
    lines.push(oneLine
      ? `guarantee (in this piece the low price of trying is the risk reversal; say the guarantee only when the offer leads with it, as one plain promise in the speaker's words such as "your plan finishes, or your credits come back", never its conditions, units or mechanics, which stay on the page that takes payment, rule 16): ${c.guarantee.denominated_text}`
      : `guarantee (repeat this sentence): ${c.guarantee.denominated_text}; terms: ${c.guarantee.terms}${c.guarantee.days ? `; ${c.guarantee.days} days` : ""}`);
    lines.push(c.deadline ? `deadline: ${c.deadline.date_or_rule}; mechanism: ${c.deadline.mechanism}` : "deadline: none (no urgency device; do not invent one)");
    lines.push(c.premiums.length ? `premiums: ${c.premiums.map((p) => `${p.name} (answers: ${p.answers_worry}${p.value_basis ? `; value basis: ${p.value_basis}` : "; no dollar value: none may be stated"})`).join(" | ")}` : "premiums: none");
    lines.push(`first visible win: ${c.first_visible_win.what} within ${c.first_visible_win.interval}`);
    lines.push(`biggest reason a buyer would fail: ${c.biggest_failure_reason}`);
    lines.push(`why the bundle cannot be compared: ${c.bundle_uncomparable_how}`);
  } else {
    lines.push(`chosen: ${j(variant.chosen)}`);
    if (variant.guarantee) lines.push(`guarantee: ${j(variant.guarantee)}`);
    lines.push(variant.deadline ? `deadline: ${j(variant.deadline)}` : "deadline: none");
  }
  if (variant.gap_note) lines.push(`delivery timing note (the offer architect's note to the user on what arrives when; the copy never says anything arrives sooner than this, and the note never limits the result the copy sells, rule 8): ${variant.gap_note}`);
  lines.push(termLines);
  return lines.join("\n");
}

/** Ledger rows that hold a verbatim's words, keyed by the words: the tag a quote of that verbatim must carry. */
export function verbatimLedgerTags(claims: (Pick<ClaimRow, "id" | "claim_type" | "claim_text"> & { user_decision?: string | null })[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of claims) {
    if (c.claim_type !== "audience_language" || !c.claim_text || c.user_decision === "drop") continue;
    const key = verbatimKey(verbatimWords(c.claim_text));
    if (key && !m.has(key)) m.set(key, c.id);
  }
  return m;
}

export function dossierText(d: Dossier | null, opts: { maxVerbatims?: number; claims?: (Pick<ClaimRow, "id" | "claim_type" | "claim_text"> & { user_decision?: string | null })[] } = {}): string {
  if (!d) return "RESEARCH DOSSIER: none. No verbatims are available: describe the reader's situation only from the plain facts of the work every reader in this market does (rule 2), with no invented number, name or event; raise no objection the brief does not name; tell no story the brief or ledger does not hold. Sell the result on the brief and the ledger (rule 8).";
  const maxV = opts.maxVerbatims ?? 80;
  const themed = new Set(d.themes.flatMap((t) => t.verbatim_ids));
  const verbatims = [...d.verbatims].sort((a, b) => Number(themed.has(b.id)) - Number(themed.has(a.id))).slice(0, maxV);
  const tags = verbatimLedgerTags(opts.claims ?? []);
  const tagOf = (text: string) => {
    const id = tags.get(verbatimKey(text));
    return id ? ` [[L:${id}]]` : "";
  };
  const out = [
    `RESEARCH DOSSIER`,
    `speaker: ${d.speaker.name ?? "unnamed"}${d.speaker.role ? `, ${d.speaker.role}` : ""}${d.speaker.stake ? `; stake: ${d.speaker.stake}` : ""}`,
    `awareness by segment: ${d.awareness_by_segment.map((s) => `${s.label} [${s.traffic}] → ${s.awareness} (${clip(s.evidence, 160)})`).join(" | ") || "none"}`,
    `sophistication: stage ${d.sophistication.stage} (${clip(d.sophistication.evidence, 200)})`,
    `resident emotion: ${d.resident_emotion.emotion} (${clip(d.resident_emotion.evidence, 200)})`,
    `forces: push=${clip(d.forces.push, 160)}; pull=${clip(d.forces.pull, 160)}; anxiety=${clip(d.forces.anxiety, 160)}; habit=${clip(d.forces.habit, 160)}; dominant=${d.forces.dominant}`,
    `logo-swap result: ${clip(d.logo_swap_result, 300)}`,
    d.first_week_experience ? `first-week experience: ${d.first_week_experience}` : "first-week experience: unknown",
    d.refund_history ? `refund history: ${d.refund_history}` : "",
    `THEMES: ${d.themes.map((t) => `${t.name} [${t.tag}, n=${t.count}, ${t.confidence}] ← ${t.verbatim_ids.slice(0, 5).join(",")}`).join(" | ") || "none"}`,
    `VERBATIMS (exact wording: what the reader lived and the words that matter to them; say that thing as one concrete thing that happened to the reader, in the speaker's words, at full strength, with the details a verbatim, the story inventory or the plain facts of the reader's work hold, never sized down ("some of your," "a few") and never stretched into a share of the market no verbatim counts; borrow a verbatim's own words only where they are vivid and specific, never its survey wording ("poor results," "for the price") and never hedged; never paraphrase into generic emotion words; a verbatim with a ledger tag beside it may be quoted and carries that tag; one with no tag is never quoted or attributed ("one buyer wrote," "a reviewer said"), rule 11):\n${verbatims.map((v) => `  ${v.id}${tagOf(v.text)} [${v.tags.join(",")}${v.desire_cluster ? `; cluster ${v.desire_cluster}` : ""}${v.date ? `; ${v.date}` : ""}] "${clip(v.text, 400)}"`).join("\n") || "  none"}`,
    `OBJECTION MAP (the only objections the copy may raise or answer):\n${d.objection_map.map((o) => `  - ${o.text} ← ${o.verbatim_ids.join(",")}`).join("\n") || "  none: raise no objections"}`,
    `PROOF INVENTORY:\n${d.proof_inventory.map((p) => `  - [${p.grade}] ${p.evidence_type}: ${p.claim}${p.ledger_ref ? ` → [[L:${p.ledger_ref}]]` : " (no ledger row: not citable)"}${p.source ? ` src ${p.source}` : ""}`).join("\n") || "  none"}`,
    `STORY INVENTORY (the only stories the copy may tell):\n${d.story_inventory.map((s) => `  - ${s.event}${s.date ? ` (${s.date})` : ""}${s.numbers ? `; numbers: ${s.numbers}` : ""}${s.people ? `; people: ${s.people}` : ""}${s.source ? `; src ${s.source}` : ""}`).join("\n") || "  none: no story lead is possible"}`,
    `COMPETITORS: ${d.competitor_table.map((c) => `${c.name}: ${c.headline_outcome ?? ""}${c.mechanism_named ? " (names a mechanism)" : ""}${c.logo_swap_passes ? " (our copy would survive their logo: differentiate)" : ""}`).join(" | ") || "none"}`,
    d.unsourced_hypotheses.length ? `UNSOURCED HYPOTHESES (outranked by any verbatim; never quoted as fact): ${d.unsourced_hypotheses.join("; ")}` : "",
  ];
  return out.filter(Boolean).join("\n");
}

/** A measurement or habit about em dashes, emojis or hashtags: Section 7.1 bans them whatever the samples do. */
const NEVER_HABIT = /em[_ -]?dash|\bdash(?:es)?\b|emoji|hashtag/i;

/**
 * The profile as the writer sees it, minus what Section 7.1 bans (docs/04 §10 rule 9): no em dash rate or dash,
 * emoji or hashtag habit; no idiom, stance marker or exemplar carrying one of the owner's tells or words; never-tells
 * stripped from the exemplars that stay.
 */
export function voiceForWriter(v: VoiceProfileRow, exemptTerms: string[] = []): { parameters: unknown; idioms: string[]; exemplars: unknown[] } {
  const params = (v.parameters && typeof v.parameters === "object" && !Array.isArray(v.parameters) ? { ...(v.parameters as Record<string, unknown>) } : {}) as Record<string, unknown>;
  for (const k of Object.keys(params)) if (NEVER_HABIT.test(k)) delete params[k];
  for (const k of ["formatting_habits", "stance_markers"]) {
    if (Array.isArray(params[k])) params[k] = (params[k] as unknown[]).map(String).filter((h) => !NEVER_HABIT.test(h) && ownerTellsIn(h, exemptTerms) === 0);
  }
  const idioms = (Array.isArray(v.idiom_bank) ? v.idiom_bank.map(String) : []).filter((p) => ownerTellsIn(p, exemptTerms) === 0);
  const exemplars = (Array.isArray(v.exemplar_paragraphs) ? (v.exemplar_paragraphs as unknown[]) : []).flatMap((e) => {
    const text = typeof e === "string" ? e : e && typeof e === "object" && typeof (e as { text?: unknown }).text === "string" ? (e as { text: string }).text : null;
    if (text === null) return [e];
    const clean = stripNeverTells(text);
    if (ownerTellsIn(clean, exemptTerms) > 0) return [];
    return [typeof e === "string" ? clean : { ...(e as object), text: clean }];
  });
  return { parameters: params, idioms, exemplars };
}

/** The voice profile for a writer's request; `exemptTerms` are the offer's own words (a brand named "Elevate" is not an owner word). */
export function voiceText(v: VoiceProfileRow | null, configGreeting: string | null | undefined, exemptTerms: string[] = []): string {
  if (!v) {
    return `VOICE PROFILE: none. Write as one named person to one reader in plain spoken English (or the copy's own language when it is another) at consumer grade 6-8; sentence length varies (coefficient of variation above 0.7); fragments allowed; ${configGreeting ? `greeting: "${configGreeting}"` : "greeting per the format"}.`;
  }
  const arr = (x: unknown): string[] => (Array.isArray(x) ? x.map(String) : []);
  const w = voiceForWriter(v, exemptTerms);
  return [
    `VOICE PROFILE "${v.name}" (parameters and habits; match the measurements, never imitate the exemplars' content; Section 7.1 outranks it: no habit, idiom or exemplar brings back an em dash, emoji, hashtag or any of the owner's tells and words):`,
    `parameters: ${j(w.parameters)}`,
    v.readability_band ? `readability band: ${v.readability_band}` : "",
    `greeting: ${v.greeting ?? configGreeting ?? "per format"}`,
    w.idioms.length ? `idiom bank: ${w.idioms.join(" | ")}` : "",
    arr(v.dead_words).length ? `dead words (never use): ${arr(v.dead_words).join(", ")}` : "",
    w.exemplars.length ? `exemplar paragraphs:\n${w.exemplars.map((p, i) => `  ${i + 1}. ${typeof p === "string" ? p : j(p)}`).join("\n")}` : "",
    Array.isArray(v.story_inventory) && v.story_inventory.length ? `story inventory: ${j(v.story_inventory)}` : "",
  ].filter(Boolean).join("\n");
}

/** The paragraph of §9 this format encodes, found by its standard_section title. */
export function formatParagraph(spec: FormatSpec): string {
  const lines = FORMAT_SPECS.split("\n");
  const hit = lines.find((l) => l.startsWith(spec.standard_section));
  return hit ?? `${spec.name}: ${spec.description}`;
}

export function sectionSpecText(s: SectionSpec, extra: { id?: string; itemRole?: string | null } = {}): string {
  return [
    `- section_id "${extra.id ?? s.id}": ${s.name}${extra.itemRole ? ` [role: ${extra.itemRole}]` : ""}`,
    `  job: ${s.job}`,
    `  length: ${s.band_words[0]}-${s.band_words[1]} words`,
    s.must.length ? `  must: ${s.must.join("; ")}` : "",
    s.must_not.length ? `  must not: ${s.must_not.join("; ")}` : "",
    s.block_types?.length ? `  block types allowed: ${s.block_types.join(", ")}` : "",
    s.optional ? `  optional: write it only if the material supports it; otherwise return the section with no blocks` : "",
  ].filter(Boolean).join("\n");
}

export function formatRulesText(spec: FormatSpec): string {
  return [
    `FORMAT: ${spec.name} (${spec.id}, ${spec.family}): ${spec.description}`,
    `length band: ${spec.length_band_words[0]}-${spec.length_band_words[1]} words`,
    `standard: ${formatParagraph(spec)}`,
    `skim path block types: ${spec.skim_path_block_types.join(", ")}`,
    `hard gates (checked by machine): ${spec.hard_gates.join("; ") || "none"}`,
    `formatting: ${spec.allow_markdown_headings ? "markdown headings allowed" : "no markdown headings"}; no em dashes, emojis or hashtags (Section 7.1); ${spec.allow_caps ? "caps allowed at human rates" : "no caps"}`,
    spec.platform_limits ? `platform limits: ${Object.entries(spec.platform_limits).map(([k, v]) => `${k}=${v}`).join(", ")}` : "",
    spec.multi_item ? `items: ${spec.multi_item.min}-${spec.multi_item.max} ${spec.multi_item.item_name}s${spec.multi_item.item_roles ? `; roles in order: ${spec.multi_item.item_roles.join(", ")}` : ""}` : "",
  ].filter(Boolean).join("\n");
}

/**
 * Sections rendered with ids so a reviewer can quote and a reviser can address blocks. Ledger tags kept. The
 * text is the block's own, without markdown decoration: the type label says what the block is, and a heading
 * mark the renderer added once read to the copy chief as a markdown heading the drafter wrote (a gate D reject
 * that cost a revision cycle).
 */
export function sectionsWithIds(sections: Section[]): string {
  return sections
    .map((s) => {
      const head = `=== section ${s.section_id}${s.title ? `: ${s.title}` : ""} ===`;
      const body = s.blocks.map((b) => `[${b.id} | ${b.type}${b.meta?.role ? ` | ${b.meta.role}` : ""}] ${renderBlock(b, { plain: true })}`).join("\n\n");
      return `${head}\n${body || "(empty)"}`;
    })
    .join("\n\n");
}

/** The copy as a reader sees it: no ids, no ledger tags, no markers. */
export function sectionsPlain(sections: Section[]): string {
  return sections.map((s) => s.blocks.map((b) => readerText(renderBlock(b, { stripLedger: true }))).filter(Boolean).join("\n\n")).filter(Boolean).join("\n\n");
}

export function questionsText(questions: { question: string; why: string | null; answer: string | null }[]): string {
  const answered = questions.filter((q) => (q.answer ?? "").trim());
  const open = questions.filter((q) => !(q.answer ?? "").trim());
  if (!answered.length && !open.length) return "";
  return [
    "USER ANSWERS AND OPEN QUESTIONS",
    answered.length ? "Answered by the user (facts you may use; cite the ledger row intake made from each, or mark [[NEEDS SOURCE]] if none exists):" : "",
    ...answered.map((q) => `- Q: ${q.question}\n  A: ${q.answer!.trim()}`),
    open.length ? "Still open (unknown: never state an answer to these as a number, a name, a quote or a result someone got; an open question about results never stops the promise of the result the product produces, rule 8):" : "",
    ...open.map((q) => `- ${q.question}`),
  ].filter(Boolean).join("\n");
}

export function configText(c: { vertical: string | null; business_opportunity: boolean; notice_recipient: boolean; humor_policy: unknown; greeting: string | null; edge_tolerance: string | null; refund_window_days: number | null; first_week_experience: string | null } | null): string {
  if (!c) return "OFFER CONFIG: none (vertical unknown; treat as consumer; no business-opportunity rules assumed).";
  return [
    `OFFER CONFIG`,
    `vertical: ${c.vertical ?? "unknown"}`,
    `business opportunity: ${c.business_opportunity ? "yes (16 CFR 437 earnings rules apply)" : "no"}; FTC Notice recipient: ${c.notice_recipient ? "yes (civil penalties exposure)" : "no"}`,
    `humor policy: ${j(c.humor_policy)}`,
    c.greeting ? `greeting: ${c.greeting}` : "",
    c.edge_tolerance ? `edge tolerance: ${c.edge_tolerance}` : "",
    c.refund_window_days != null ? `refund window: ${c.refund_window_days} days` : "refund window: unknown",
    c.first_week_experience ? `first-week experience: ${c.first_week_experience}` : "",
  ].filter(Boolean).join("\n");
}
