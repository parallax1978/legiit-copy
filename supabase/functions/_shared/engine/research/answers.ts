/**
 * What research settles, the user is not asked again: the speaker, the refund terms and the first-week experience
 * answer their open questions, and the facts behind them become ledger rows so the writer can cite them.
 */
import type { ClaimRowInput } from "../schemas/brief.ts";
import type { Dossier } from "../schemas/research.ts";

export interface OpenQuestionLike {
  id: string;
  question: string;
  answer?: string | null;
}

const UNKNOWN = /^\s*(unknown|not found|none found|n\/a|null|no information|not stated|unclear)\b/i;
const known = (s: string | null | undefined): s is string => !!s && s.trim().length > 0 && !UNKNOWN.test(s);

const SPEAKER_Q = /\b(who\b.*\b(speak|speaks|speaking|spokesperson|voice|sender|signs?|sign-off|signature|named person))|named person|whose name|who is .*(behind|the founder)/i;
const REFUND_Q = /refund|money.?back|guarantee/i;
const FIRST_WEEK_Q = /first.?week|first (day|session|login)|onboarding|what happens after (they|you|I) (buy|sign up|pay)/i;

export function speakerLine(d: Dossier): string | null {
  const s = d.speaker;
  if (!known(s.name)) return null;
  return `${s.name.trim()}${known(s.role) ? `, ${s.role.trim()}` : ""}${known(s.stake) ? ` (${s.stake.trim()})` : ""}`;
}

/** Answers research can give to the offer's open questions, with their source when the dossier names one. */
export function answersFromDossier(d: Dossier, questions: OpenQuestionLike[]): { id: string; answer: string }[] {
  const out: { id: string; answer: string }[] = [];
  const speaker = speakerLine(d);
  const src = known(d.speaker.source) ? ` Source: ${d.speaker.source!.trim()}` : "";
  for (const q of questions) {
    if (q.answer && q.answer.trim()) continue;
    if (speaker && SPEAKER_Q.test(q.question)) out.push({ id: q.id, answer: `From research: ${speaker}.${src}` });
    else if (known(d.refund_history) && REFUND_Q.test(q.question)) out.push({ id: q.id, answer: `From research: ${d.refund_history!.trim()}` });
    else if (known(d.first_week_experience) && FIRST_WEEK_Q.test(q.question)) out.push({ id: q.id, answer: `From research: ${d.first_week_experience!.trim()}` });
  }
  return out;
}

/** Ledger rows for what research settled, unless the ledger already carries them. Status unverified: the user can check them. */
export function ledgerRowsFromDossier(d: Dossier, existing: { claim_text: string | null; claim_type: string }[]): ClaimRowInput[] {
  const rows: ClaimRowInput[] = [];
  const has = (pred: (c: { claim_text: string | null; claim_type: string }) => boolean) => existing.some(pred);
  const speaker = speakerLine(d);
  if (speaker && d.speaker.name && !has((c) => (c.claim_text ?? "").toLowerCase().includes(d.speaker.name!.trim().toLowerCase()))) {
    rows.push(blank(speaker, "credential", "credential", d.speaker.source ?? null, speaker));
  }
  if (known(d.refund_history) && !has((c) => c.claim_type === "guarantee" && /refund|money.?back/i.test(c.claim_text ?? ""))) {
    rows.push(blank(d.refund_history!.trim(), "guarantee", "offer_term", null, d.refund_history!.trim()));
  }
  rows.push(...verbatimRows(d, existing));
  return rows;
}

/** A verbatim's wording as the ledger stores it: quotation marks and spacing normalised, for matching. */
export function verbatimKey(text: string): string {
  return text.replace(/[\u201c\u201d"]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** The words of a market verbatim row, without the "Market verbatim (...):" lead-in. */
export function verbatimWords(claimText: string): string {
  return claimText.replace(/^Market verbatim \([^)]*\):\s*/, "");
}

/** The market verbatim row's claim text: who said it and where, then the words. */
export function verbatimClaimText(v: Dossier["verbatims"][number]): string {
  const who = [v.source_type.replace(/_/g, " "), v.speaker_role, v.date].filter((x): x is string => !!x && x.trim().length > 0).join(", ");
  return `Market verbatim (${who}): ${v.text.trim()}`;
}

/**
 * Every verbatim the research kept becomes an audience-language ledger row, so the copy can quote the market in
 * its own words with a ledger tag: the standard wants a row behind every quote, and the factual review treats a
 * quote with no row as invented. Rows that already hold the words (an earlier research run) are not repeated.
 */
export function verbatimRows(d: Dossier, existing: { claim_text: string | null; claim_type: string }[]): ClaimRowInput[] {
  const held = new Set(existing.filter((c) => c.claim_type === "audience_language").map((c) => verbatimKey(verbatimWords(c.claim_text ?? ""))));
  const rows: ClaimRowInput[] = [];
  for (const v of d.verbatims) {
    const key = verbatimKey(v.text);
    if (!key || held.has(key)) continue;
    held.add(key);
    rows.push(blank(verbatimClaimText(v), "audience_language", "other", v.source_url ?? null, v.text.trim()));
  }
  return rows;
}

function blank(claim_text: string, claim_type: ClaimRowInput["claim_type"], role: ClaimRowInput["role"], source_ref: string | null, quote: string): ClaimRowInput {
  return {
    claim_text,
    claim_type,
    role,
    evidence_grade: null,
    evidence: { source_ref: source_ref ?? "research", quote, endpoint: null, population: null, dose: null, duration: null, effect_size: null, provenance: null },
    precision: null,
    typical_result: null,
    earnings_context: null,
    material_connection: false,
    guarantee_terms: claim_type === "guarantee" ? { text: claim_text, days: null, conditions: null, approver: null } : null,
    former_price: null,
    scarcity: null,
    deadline: null,
    trial_terms: null,
    story_claim: false,
    establishment_signal: false,
    status: "unverified",
    flag: null,
  };
}
