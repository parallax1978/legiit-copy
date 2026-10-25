// Tolerant readers for the JSON columns on the offer tables. No server imports: used by client and server code.
import type { Json, Database } from "@/lib/supabase/database.types";
import type { OfferBrief, Dossier } from "@engine/schemas/mod.ts";
import type { VariantKind } from "./constants";

type Tables = Database["public"]["Tables"];
export type OfferRow = Tables["offers"]["Row"];
export type OfferSourceRow = Tables["offer_sources"]["Row"];
/** A source row without the extracted text, which can be long; the client only needs its size. */
export type OfferSourceView = Omit<OfferSourceRow, "extracted_text"> & { extracted_chars: number };
export function toSourceView(s: OfferSourceRow): OfferSourceView {
  const { extracted_text, ...rest } = s;
  return { ...rest, extracted_chars: extracted_text?.length ?? 0 };
}
export type OfferClaimRow = Tables["offer_claims"]["Row"];
export type OfferConfigRow = Tables["offer_config"]["Row"];
export type OfferVariantRow = Tables["offer_variants"]["Row"];
export type OfferResearchRow = Tables["offer_research"]["Row"];
export type OfferQuestionRow = Tables["offer_questions"]["Row"];
export type VoiceProfileRow = Tables["voice_profiles"]["Row"];
export type GenerationRow = Tables["generations"]["Row"];

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

type Rec = Record<string, unknown>;
export const obj = (v: unknown): Rec => (v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {});
export const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
export const nstr = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
export const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
export const bool = (v: unknown): boolean => v === true;
export const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
export const objArr = (v: unknown): Rec[] => (Array.isArray(v) ? v.map(obj) : []);
export const isNonEmpty = (v: unknown) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim().length > 0 : v != null);

// ---------- brief ----------
export function emptyBrief(): OfferBrief {
  return {
    product_name: "",
    one_line: "",
    deliverables: [],
    price: { text: "", amount: null, currency: null, plan: null },
    terms: null,
    guarantee: { text: null, type: null, days: null, denominated: false },
    audience: { who: "", situation: null, verbatim_sources: [] },
    positioning: null,
    proof_available: [],
    competitors: [],
    urls: [],
    unknowns: [],
    speaker: null,
    lead_offer: null,
  };
}

export function normalizeBrief(json: Json | null | undefined): OfferBrief {
  const b = obj(json);
  const price = obj(b.price);
  const guarantee = obj(b.guarantee);
  const audience = obj(b.audience);
  return {
    product_name: str(b.product_name),
    one_line: str(b.one_line),
    deliverables: strArr(b.deliverables),
    price: { text: str(price.text), amount: num(price.amount), currency: nstr(price.currency), plan: nstr(price.plan) },
    terms: nstr(b.terms),
    guarantee: { text: nstr(guarantee.text), type: nstr(guarantee.type), days: num(guarantee.days), denominated: bool(guarantee.denominated) },
    audience: { who: str(audience.who), situation: nstr(audience.situation), verbatim_sources: strArr(audience.verbatim_sources) },
    positioning: nstr(b.positioning),
    proof_available: objArr(b.proof_available).map((p) => ({ claim: str(p.claim), evidence: str(p.evidence), source: nstr(p.source) })),
    competitors: strArr(b.competitors),
    urls: strArr(b.urls),
    unknowns: strArr(b.unknowns),
    speaker: b.speaker && typeof b.speaker === "object" ? { name: nstr(obj(b.speaker).name), role: nstr(obj(b.speaker).role) } : null,
    lead_offer: nstr(b.lead_offer),
  };
}

export function isBriefEmpty(b: OfferBrief) {
  return !b.product_name && !b.one_line && b.deliverables.length === 0 && !b.price.text;
}

// ---------- claims ----------
export interface ClaimEvidence {
  source_ref: string | null;
  quote: string | null;
  endpoint: string | null;
  population: string | null;
  dose: string | null;
  duration: string | null;
  effect_size: string | null;
}
export function normalizeEvidence(json: Json | null | undefined): ClaimEvidence {
  const e = obj(json);
  return {
    source_ref: nstr(e.source_ref),
    quote: nstr(e.quote),
    endpoint: nstr(e.endpoint),
    population: nstr(e.population),
    dose: nstr(e.dose),
    duration: nstr(e.duration),
    effect_size: nstr(e.effect_size),
  };
}
export interface ClaimFlag {
  rule: string;
  severity: string;
  issue: string;
  suggested_rewrite: string | null;
}
export function normalizeFlag(json: Json | null | undefined): ClaimFlag | null {
  if (json == null) return null;
  const f = obj(json);
  if (!f.rule && !f.issue) return null;
  return { rule: str(f.rule), severity: str(f.severity, "medium"), issue: str(f.issue), suggested_rewrite: nstr(f.suggested_rewrite) };
}

// ---------- variants ----------
export interface OfferOptionView {
  variant: string;
  when_used: string;
  front_end_effect: string;
  back_end_effect: string;
  copy_must_say: string;
  fit_score: number;
  reason: string;
}
export interface ChosenOfferView {
  variant: string;
  reasons: string;
  price_presentation: string;
  premiums: { name: string; answers_worry: string; value_basis: string | null }[];
  guarantee: { denominated_text: string; terms: string; days: number | null; costs_seller: boolean } | null;
  deadline: { mechanism: string; date_or_rule: string } | null;
  first_visible_win: { what: string; interval: string } | null;
  biggest_failure_reason: string;
  bundle_uncomparable_how: string;
}
export function normalizeOptionsSheet(json: Json | null | undefined): OfferOptionView[] {
  return objArr(json).map((o) => ({
    variant: str(o.variant, "other"),
    when_used: str(o.when_used),
    front_end_effect: str(o.front_end_effect),
    back_end_effect: str(o.back_end_effect),
    copy_must_say: str(o.copy_must_say),
    fit_score: num(o.fit_score) ?? 0,
    reason: str(o.reason),
  }));
}
export function normalizeChosen(row: { chosen: Json | null; guarantee: Json | null; deadline: Json | null; reasons: string | null }): ChosenOfferView | null {
  const c = obj(row.chosen);
  const g = obj(c.guarantee ?? row.guarantee);
  const d = obj(c.deadline ?? row.deadline);
  const w = obj(c.first_visible_win);
  if (!c.variant && !g.denominated_text && !row.reasons) return null;
  return {
    variant: str(c.variant, "hard"),
    reasons: str(c.reasons, row.reasons ?? ""),
    price_presentation: str(c.price_presentation),
    premiums: objArr(c.premiums).map((p) => ({ name: str(p.name), answers_worry: str(p.answers_worry), value_basis: nstr(p.value_basis) })),
    guarantee: g.denominated_text || g.terms ? { denominated_text: str(g.denominated_text), terms: str(g.terms), days: num(g.days), costs_seller: bool(g.costs_seller) } : null,
    deadline: d.date_or_rule || d.mechanism ? { mechanism: str(d.mechanism), date_or_rule: str(d.date_or_rule) } : null,
    first_visible_win: w.what ? { what: str(w.what), interval: str(w.interval) } : null,
    biggest_failure_reason: str(c.biggest_failure_reason),
    bundle_uncomparable_how: str(c.bundle_uncomparable_how),
  };
}
export function chosenFromBrief(brief: OfferBrief): Record<string, Json> & { variant: VariantKind } {
  return {
    variant: "hard",
    reasons: "Offer used as written. Offer construction was skipped by the user.",
    price_presentation: brief.price.text || "Price as stated in the brief",
    premiums: [],
    guarantee: {
      denominated_text: brief.guarantee.text ?? "",
      terms: brief.terms ?? "",
      days: brief.guarantee.days,
      costs_seller: brief.guarantee.denominated,
    },
    deadline: null,
    first_visible_win: { what: "", interval: "" },
    biggest_failure_reason: "",
    bundle_uncomparable_how: "",
  };
}

// ---------- research ----------
export type DossierView = {
  [K in keyof Dossier]: Dossier[K] extends Array<infer U> ? U[] : Dossier[K] | null;
};
export function normalizeDossier(json: Json | null | undefined): DossierView {
  const d = obj(json) as Partial<Dossier> & Rec;
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const maybe = <T,>(v: unknown): T | null => (v && typeof v === "object" ? (v as T) : null);
  return {
    verbatims: arr(d.verbatims),
    themes: arr(d.themes),
    competitor_table: arr(d.competitor_table),
    logo_swap_result: typeof d.logo_swap_result === "string" ? d.logo_swap_result : null,
    awareness_by_segment: arr(d.awareness_by_segment),
    sophistication: maybe(d.sophistication),
    proof_inventory: arr(d.proof_inventory),
    objection_map: arr(d.objection_map),
    resident_emotion: maybe(d.resident_emotion),
    story_inventory: arr(d.story_inventory),
    speaker: maybe(d.speaker),
    forces: maybe(d.forces),
    first_week_experience: typeof d.first_week_experience === "string" ? d.first_week_experience : null,
    refund_history: typeof d.refund_history === "string" ? d.refund_history : null,
    unsourced_hypotheses: arr(d.unsourced_hypotheses),
    sources: arr(d.sources),
  };
}

// ---------- voice ----------
export interface VoiceSample {
  title: string | null;
  text: string;
}
export interface ExemplarParagraph {
  label: string;
  text: string;
}
export function normalizeSamples(json: Json | null | undefined): VoiceSample[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((s) => (typeof s === "string" ? { title: null, text: s } : { title: nstr(obj(s).title), text: str(obj(s).text) }))
    .filter((s) => s.text.length > 0);
}
export function normalizeExemplars(json: Json | null | undefined): ExemplarParagraph[] {
  if (Array.isArray(json)) {
    return json
      .map((e, i) => {
        if (typeof e === "string") return { label: `Exemplar ${i + 1}`, text: e };
        const o = obj(e);
        return { label: str(o.label ?? o.kind ?? o.type ?? o.section ?? o.role, `Exemplar ${i + 1}`), text: str(o.text ?? o.paragraph) };
      })
      .filter((e) => e.text.length > 0);
  }
  const o = obj(json);
  return Object.entries(o)
    .filter(([, v]) => typeof v === "string" && v.length > 0)
    .map(([k, v]) => ({ label: k, text: v as string }));
}
/**
 * Lists stored as strings or objects. idiom_bank and dead_words are strings; the voice-profile function writes
 * story_inventory as {event, date, numbers, people, ...}, which reads as one line per event.
 */
export function normalizeStringList(json: Json | null | undefined): string[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((x) => {
      if (typeof x === "string") return x;
      const o = obj(x);
      const direct = o.text ?? o.word ?? o.phrase;
      if (typeof direct === "string") return direct;
      if (typeof o.event === "string") return [o.event, nstr(o.date), nstr(o.numbers), nstr(o.people)].filter(Boolean).join(" · ");
      return "";
    })
    .filter(Boolean);
}
export function normalizeRecord(json: Json | null | undefined): Record<string, Json> {
  return obj(json) as Record<string, Json>;
}

// ---------- config ----------
export interface HumorPolicy {
  allowed: boolean;
  notes: string | null;
}
export function normalizeHumor(json: Json | null | undefined): HumorPolicy {
  const h = obj(json);
  return { allowed: h.allowed === undefined ? true : bool(h.allowed), notes: nstr(h.notes) };
}

// ---------- misc ----------
export function formatJsonValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(formatJsonValue).join(", ");
  return JSON.stringify(v);
}
export function linesToArray(s: string): string[] {
  return s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}
export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
