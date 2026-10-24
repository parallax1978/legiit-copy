/**
 * Ledger checks, quote matching and the pre-draft interrogation. Pure functions over sections and claims.
 */
import { LEDGER_TAG, NEEDS_SOURCE_TAG, type Awareness } from "../schemas/common.ts";
import type { Block, Section } from "../schemas/draft.ts";
import type { Dossier } from "../schemas/research.ts";
import { Candidate } from "../schemas/argument.ts";
import type { GenerationOptions } from "./options.ts";

export function blockText(b: Block): string {
  return [b.text, ...(b.items ?? [])].filter(Boolean).join("\n");
}
export function sectionText(s: Section): string {
  return s.blocks.map(blockText).join("\n");
}
export function sectionsText(sections: Section[]): string {
  return sections.map(sectionText).join("\n");
}

export function knownClaimIds(claims: { id: string }[]): Set<string> {
  return new Set(claims.map((c) => c.id));
}

/** Unique ledger ids cited in the sections, in order of first appearance. */
export function collectLedgerRefs(sections: Section[]): string[] {
  const out: string[] = [];
  for (const m of sectionsText(sections).matchAll(LEDGER_TAG)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

/** Ledger ids cited in the copy that no claim row carries: an invented authority, a hard error. */
export function unknownLedgerRefs(sections: Section[], known: Set<string>): string[] {
  return collectLedgerRefs(sections).filter((id) => !known.has(id));
}

/** Sentences carrying [[NEEDS SOURCE]], ledger tags stripped. */
export function needsSourceLines(sections: Section[]): string[] {
  const out: string[] = [];
  for (const s of sections) {
    for (const b of s.blocks) {
      for (const text of [b.text, ...(b.items ?? [])]) {
        if (!text.includes(NEEDS_SOURCE_TAG)) continue;
        for (const sentence of text.split(/(?<=[.!?])\s+/)) {
          if (sentence.includes(NEEDS_SOURCE_TAG)) {
            const clean = sentence.replace(LEDGER_TAG, "").replace(/\s{2,}/g, " ").trim();
            if (!out.includes(clean)) out.push(clean);
          }
        }
      }
    }
  }
  return out;
}

/** Text as a reader sees it: no ledger ids, no NEEDS SOURCE markers. */
export function readerText(text: string): string {
  return text.replaceAll(NEEDS_SOURCE_TAG, "").replace(LEDGER_TAG, "").replace(/[ \t]{2,}/g, " ").replace(/ +([.,;:!?])/g, "$1").trim();
}

/** Normalization for matching a reviewer's quote against draft text. */
export function normalizeQuote(text: string): string {
  return readerText(text)
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .replace(/^["'\s.…-]+|["'\s.…-]+$/g, "")
    .toLowerCase();
}

/** Does `quote` appear verbatim (after normalization) in the sections? */
export function quoteAppears(quote: string, sections: Section[]): boolean {
  const q = normalizeQuote(quote);
  if (!q) return false;
  return normalizeQuote(sectionsText(sections)).includes(q);
}

/** Block ids whose text contains any of the quotes. */
export function blocksQuoted(sections: Section[], quotes: string[]): Set<string> {
  const qs = quotes.map(normalizeQuote).filter(Boolean);
  const out = new Set<string>();
  for (const s of sections) {
    for (const b of s.blocks) {
      const t = normalizeQuote(blockText(b));
      if (!t) continue;
      if (qs.some((q) => t.includes(q) || (q.length > 40 && q.includes(t)))) out.add(b.id);
    }
  }
  return out;
}

export interface DoNotTouchResult {
  ok: boolean;
  /** quotes present before the revision and missing after it */
  violated: string[];
  /** quotes the reviewer gave that never appeared in the draft; cannot be enforced */
  unverifiable: string[];
}

/** DO NOT TOUCH lines must survive a revision verbatim. */
export function verifyDoNotTouch(doNotTouch: string[], before: Section[], after: Section[]): DoNotTouchResult {
  const violated: string[] = [];
  const unverifiable: string[] = [];
  for (const q of doNotTouch) {
    if (!normalizeQuote(q)) continue;
    if (!quoteAppears(q, before)) {
      unverifiable.push(q);
      continue;
    }
    if (!quoteAppears(q, after)) violated.push(q);
  }
  return { ok: violated.length === 0, violated, unverifiable };
}

/** Which segment this piece is for, and its diagnosed awareness. */
export function targetAwareness(dossier: Dossier | null, options: GenerationOptions): { awareness: Awareness; segment: string | null; source: "option" | "dossier" | "none" } {
  if (options.awareness) return { awareness: options.awareness, segment: options.segment ?? options.traffic ?? null, source: "option" };
  const segs = dossier?.awareness_by_segment ?? [];
  if (segs.length === 0) return { awareness: "unknown", segment: null, source: "none" };
  const byLabel = options.segment ? segs.find((s) => s.label.toLowerCase() === options.segment!.toLowerCase()) : undefined;
  const byTraffic = options.traffic ? segs.find((s) => s.traffic === options.traffic) : undefined;
  const pick = byLabel ?? byTraffic ?? (options.traffic || options.segment ? undefined : segs.find((s) => s.awareness !== "unknown") ?? segs[0]);
  if (!pick) return { awareness: "unknown", segment: options.segment ?? options.traffic ?? null, source: "none" };
  return { awareness: pick.awareness, segment: pick.label, source: "dossier" };
}

export interface InterrogationInput {
  winner: { candidate: unknown; thesis: string | null } | null;
  thesisFallback?: string | null;
  awareness: Awareness;
  segment: string | null;
}
export type Interrogation = { ok: true; proofRefs: string[]; thesis: string } | { ok: false; reason: string };

/**
 * Pre-draft interrogation (architecture §4 step 4): drafting is blocked until the argument exists, carries proof
 * and the awareness state of the target segment is known or marked by the user.
 */
export function interrogate(input: InterrogationInput): Interrogation {
  if (!input.winner) return { ok: false, reason: "No winning argument. Run the argument step (or pick an angle) before drafting." };
  const cand = Candidate.safeParse(input.winner.candidate);
  const proofRefs = cand.success ? cand.data.proof_ledger_refs : [];
  if (proofRefs.length === 0) {
    return { ok: false, reason: "The winning argument carries no proof ledger rows (proof_ledger_refs is empty). Add the carrier to the ledger or choose an angle whose claim the ledger covers; the copy would otherwise draft around a missing carrier." };
  }
  const thesis = input.winner.thesis ?? input.thesisFallback ?? null;
  if (!thesis) return { ok: false, reason: "The winning argument has no thesis sentence. The argument step must write it before any prose." };
  if (input.awareness === "unknown") {
    return {
      ok: false,
      reason: `Awareness state is unknown for the target segment${input.segment ? ` (${input.segment})` : ""}. Diagnose it in the research dossier or set options.awareness to mark it; the headline and lead cannot be chosen without it.`,
    };
  }
  return { ok: true, proofRefs, thesis };
}
