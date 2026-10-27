/**
 * The tell edit's pure parts (docs/04-copy-standard.md §7.1, the owner's list): the piece as addressable texts,
 * the guards an edit must pass before it is applied, the deterministic backstop for the owner's never-rules
 * (em dashes, emojis, hashtags) and the grouping that keeps a long piece inside one call per group.
 */
import type { Block, DraftOutput, Section } from "../schemas/draft.ts";
import type { LeadType } from "../schemas/common.ts";
import { LEDGER_TAG, NEEDS_SOURCE_TAG } from "../schemas/common.ts";
import type { FormatSpec } from "../formats/spec.ts";
import { analyzeDraft, countWords, TELLS } from "../tells.ts";
import { assembleDraft, provisionalLeadSection } from "./assemble.ts";
import { normalizeQuote, sectionsText } from "./ledger.ts";
import { leadSectionId } from "./plan.ts";

/** One editable string: a block's text, or one item of a bullets or numbered block. */
export interface EditUnit {
  /** "<block id>" for the text, "<block id>::<n>" for item n (1-based). */
  ref: string;
  owner: "section" | "lead";
  ownerId: string;
  blockIndex: number;
  item: number | null;
  type: Block["type"];
  text: string;
}

export interface TellEdit {
  ref: string;
  before: string;
  after: string;
  tell: string;
}

export interface RejectedEdit extends TellEdit {
  reason: string;
}

const ITEM_SEP = "::";

/** The lead section is rebuilt from the leads, so while three leads exist only the leads are edited. */
function editsLeads(draft: DraftOutput, spec: FormatSpec): string | null {
  const id = leadSectionId(spec);
  return id && draft.leads?.length && draft.sections.some((s) => s.section_id === id) ? id : null;
}

/** Every text in the piece the editor may change, in reading order: sections, then the alternative leads. */
export function editableUnits(draft: DraftOutput, spec: FormatSpec): EditUnit[] {
  const units: EditUnit[] = [];
  const seen = new Set<string>();
  const uniq = (ref: string) => {
    let r = ref, n = 2;
    while (seen.has(r)) r = `${ref}~${n++}`;
    seen.add(r);
    return r;
  };
  const push = (owner: EditUnit["owner"], ownerId: string, blocks: Block[]) => {
    blocks.forEach((b, j) => {
      if ((b.text ?? "").trim()) units.push({ ref: uniq(b.id), owner, ownerId, blockIndex: j, item: null, type: b.type, text: b.text });
      (b.items ?? []).forEach((it, i) => {
        if ((it ?? "").trim()) units.push({ ref: uniq(`${b.id}${ITEM_SEP}${i + 1}`), owner, ownerId, blockIndex: j, item: i, type: b.type, text: it });
      });
    });
  };
  const leadId = editsLeads(draft, spec);
  for (const s of draft.sections) if (s.section_id !== leadId) push("section", s.section_id, s.blocks);
  if (leadId) for (const l of draft.leads ?? []) push("lead", l.id, l.blocks);
  return units;
}

/** The units as the editor reads them: a reference before every text, grouped under its section or lead. */
export function renderUnits(units: EditUnit[], draft: DraftOutput): string {
  const out: string[] = [];
  let current = "";
  for (const u of units) {
    const key = `${u.owner}:${u.ownerId}`;
    if (key !== current) {
      const lead = u.owner === "lead" ? draft.leads?.find((l) => l.id === u.ownerId) : null;
      out.push(u.owner === "lead" ? `\n=== alternative opening ${u.ownerId}${lead ? ` (${lead.lead_type})` : ""} ===` : `\n=== section ${u.ownerId} ===`);
      current = key;
    }
    out.push(`[${u.ref}] (${u.type}${u.item !== null ? ` item ${u.item + 1}` : ""}) ${u.text}`);
  }
  return out.join("\n").trim();
}

/** Consecutive units packed so each group holds at most `maxWords` words of copy; a section or lead is never split. */
export function groupUnits(units: EditUnit[], maxWords = 1800): EditUnit[][] {
  const owners: EditUnit[][] = [];
  for (const u of units) {
    const last = owners.at(-1);
    if (last && last[0].owner === u.owner && last[0].ownerId === u.ownerId) last.push(u);
    else owners.push([u]);
  }
  const groups: EditUnit[][] = [];
  let cur: EditUnit[] = [], words = 0;
  for (const o of owners) {
    const w = o.reduce((n, u) => n + countWords(u.text), 0);
    if (cur.length && words + w > maxWords) {
      groups.push(cur);
      cur = [];
      words = 0;
    }
    cur.push(...o);
    words += w;
  }
  if (cur.length) groups.push(cur);
  return groups;
}

// ---------------------------------------------------------------------------------------------------------------
// Guards: an edit keeps every fact exactly
// ---------------------------------------------------------------------------------------------------------------

const NUMBER_RE = /\d[\d,.]*/g;
const URL_RE = /https?:\/\/[^\s)\]]+|www\.[^\s)\]]+|\b[a-z0-9-]+\.(?:com|co|io|net|org|ai|app|me|us)\b(?:\/[^\s)\]]*)?/gi;
const QUOTE_RE = /"[^"\n]{1,600}"|“[^”\n]{1,600}”/g;
const BROKEN_TAG_RE = /\[\[(?!L:[^\]\s]+\]\]|NEEDS SOURCE\]\])/;

function multiset(xs: string[]): string {
  return xs.slice().sort().join("\u0001");
}
const tagsOf = (t: string) => Array.from(t.matchAll(new RegExp(LEDGER_TAG.source, "g"))).map((m) => m[0]);
const numbersOf = (t: string) => (t.replace(new RegExp(LEDGER_TAG.source, "g"), " ").match(NUMBER_RE) ?? []).map((n) => n.replace(/[.,]+$/, ""));
const urlsOf = (t: string) => (t.match(URL_RE) ?? []).map((u) => u.replace(/[.,;:!?]+$/, "").toLowerCase());
const wordsOf = (t: string) => (t.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []).map((w) => w.replace(/'/g, ""));

function containsRun(hay: string[], needle: string[]): boolean {
  if (!needle.length) return true;
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

/** Why an edit may not be applied, or null when it keeps every fact, tag, quote and link and stays close in length. */
export function guardEdit(before: string, after: string): string | null {
  if (!before.trim()) return "empty before";
  if (multiset(tagsOf(before)) !== multiset(tagsOf(after))) return "a ledger tag was added, dropped or changed";
  if (before.split(NEEDS_SOURCE_TAG).length !== after.split(NEEDS_SOURCE_TAG).length) return "a [[NEEDS SOURCE]] mark was added or dropped";
  if (BROKEN_TAG_RE.test(after)) return "a ledger tag is malformed";
  if (multiset(numbersOf(before)) !== multiset(numbersOf(after))) return "a number was added, dropped or changed";
  if (multiset(urlsOf(before)) !== multiset(urlsOf(after))) return "a link was added, dropped or changed";
  const afterWords = wordsOf(after);
  for (const q of before.match(QUOTE_RE) ?? []) {
    if (!containsRun(afterWords, wordsOf(q))) return `a quotation lost its words: ${q.slice(0, 60)}`;
  }
  if (countWords(after) > countWords(before) * 1.5 + 8) return "the replacement is much longer than the original";
  return null;
}

/** Spaces before punctuation, doubled spaces and spaces inside parentheses that an edit or the backstop leaves. */
export function tidy(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,;:!?)])/g, "$1")
    .replace(/\( +/g, "(")
    .replace(/,\s*([.!?;:])/g, "$1")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/** "before" as a pattern tolerant of whitespace, curly quotes and dash variants the model may normalise. */
function tolerant(before: string): RegExp {
  const src = Array.from(before.trim()).map((c) => {
    if (/\s/.test(c)) return "\\s+";
    if (c === "'" || c === "’" || c === "‘") return "['’‘]";
    if (c === '"' || c === "“" || c === "”") return `["“”]`;
    if (c === "—" || c === "–" || c === "-") return "[—–-]";
    return escapeRe(c);
  }).join("").replace(/(?:\\s\+)+/g, "\\s+");
  return new RegExp(src, "g");
}

/** Locate `before` in `text`, exact first, then tolerant; the first occurrence (edits apply in order). */
function locate(text: string, before: string): { index: number; length: number } | null {
  const i = text.indexOf(before);
  if (i >= 0) return { index: i, length: before.length };
  const hit = text.match(new RegExp(tolerant(before).source));
  return hit ? { index: hit.index ?? 0, length: hit[0].length } : null;
}

/** Apply the editor's edits in order; each must find its span, pass the guards and leave the text changed. */
export function applyEdits(units: EditUnit[], edits: TellEdit[]): { units: EditUnit[]; applied: TellEdit[]; rejected: RejectedEdit[] } {
  const out = units.map((u) => ({ ...u }));
  const byRef = new Map(out.map((u) => [u.ref, u]));
  const applied: TellEdit[] = [];
  const rejected: RejectedEdit[] = [];
  for (const e of edits) {
    const ref = e.ref.trim().replace(/^\[|\]$/g, "");
    const u = byRef.get(ref);
    if (!u) {
      rejected.push({ ...e, reason: `no text has the reference ${e.ref}` });
      continue;
    }
    if (e.before === e.after) {
      rejected.push({ ...e, reason: "the replacement is identical" });
      continue;
    }
    const at = locate(u.text, e.before);
    if (!at) {
      rejected.push({ ...e, reason: "the span was not found in that text" });
      continue;
    }
    const found = u.text.slice(at.index, at.index + at.length);
    const why = guardEdit(found, e.after);
    if (why) {
      rejected.push({ ...e, reason: why });
      continue;
    }
    u.text = tidy(u.text.slice(0, at.index) + e.after + u.text.slice(at.index + at.length));
    applied.push({ ...e, ref, before: found });
  }
  return { units: out, applied, rejected };
}

// ---------------------------------------------------------------------------------------------------------------
// The backstop: em dashes, emojis and hashtags never ship (§7.1, tells 11-13)
// ---------------------------------------------------------------------------------------------------------------

const EMOJI_SEQ = /(?:(?![©®™✝])\p{Extended_Pictographic}(?:️|‍|[\u{1F3FB}-\u{1F3FF}])*)+|✓️?|[\u{1F1E6}-\u{1F1FF}]{1,2}/gu;
const KEYCAP = /(\d)️?⃣/g;
const HASHTAG_RUN_AT_END = /(?:[ \t]*(?<![\p{L}\p{N}_&#/=?.-])#\p{L}[\p{L}\p{N}_]*)+[ \t]*$/gmu;
const HASHTAG_INLINE = /(?<![\p{L}\p{N}_&#/=?.-])#(\p{L}[\p{L}\p{N}_]*)/gu;

/** Em dashes, and a spaced en dash or double hyphen used as one, become parentheses (a pair) or a comma. */
export function replaceEmDashes(text: string): string {
  let t = text
    .replace(/(?<=\S) – (?=\S)/g, " — ")
    .replace(/(?<=\S) -- (?=\S)/g, " — ")
    .replace(/(?<=\w)--(?=\w)/g, "—");
  if (!t.includes("—")) return text;
  t = t.replace(/^([ \t]*)—[ \t]*/gm, "$1").replace(/[ \t]*—[ \t]*$/gm, "");
  t = t.replace(/[ \t]*—[ \t]*([^—.!?\n]{1,80}?)[ \t]*—[ \t]*/g, (_m, inner: string) => ` (${inner.trim()}) `);
  t = t.replace(/[ \t]*—[ \t]*/g, ", ");
  return tidy(t);
}

export function removeEmojis(text: string): string {
  const t = text.replace(KEYCAP, "$1.").replace(EMOJI_SEQ, "");
  return t === text ? text : tidy(t);
}

/** A run of hashtags at the end of a line goes; an inline hashtag keeps its word. */
export function removeHashtags(text: string): string {
  const t = text.replace(HASHTAG_RUN_AT_END, "").replace(HASHTAG_INLINE, "$1");
  return t === text ? text : tidy(t);
}

/** The owner's never-rules applied to one text; returns it unchanged when there is nothing to remove. */
export function stripNeverTells(text: string): string {
  return replaceEmDashes(removeEmojis(removeHashtags(text)));
}

/** The backstop over every unit: what the editor left of tells 11-13 is removed in code. */
export function backstopUnits(units: EditUnit[]): { units: EditUnit[]; edits: TellEdit[] } {
  const edits: TellEdit[] = [];
  const out = units.map((u) => {
    const cleaned = stripNeverTells(u.text);
    if (cleaned === u.text) return u;
    edits.push({ ref: u.ref, before: u.text, after: cleaned, tell: "em dash, emoji or hashtag" });
    return { ...u, text: cleaned };
  });
  return { units: out, edits };
}

// ---------------------------------------------------------------------------------------------------------------
// Rebuild the draft
// ---------------------------------------------------------------------------------------------------------------

function writeBack(blocks: Block[], owner: EditUnit["owner"], ownerId: string, units: EditUnit[]): Block[] {
  const mine = units.filter((u) => u.owner === owner && u.ownerId === ownerId);
  const next = blocks.map((b, j) => {
    const text = mine.find((u) => u.blockIndex === j && u.item === null);
    const items = b.items ? b.items.map((it, i) => mine.find((u) => u.blockIndex === j && u.item === i)?.text ?? it) : b.items;
    return { ...b, text: text ? text.text : b.text, items: items ? items.filter((it) => it.trim()) : items };
  });
  // a block the editor emptied (a windup that carried nothing) goes; a list block keeps its items
  return next.filter((b, j) => b.text.trim() || (b.items ?? []).length || !blocks[j].text.trim());
}

/** The draft with the edited texts written back, the lead section rebuilt from its lead, and NEEDS SOURCE lines kept in step. */
export function rebuildDraft(draft: DraftOutput, units: EditUnit[], spec: FormatSpec): DraftOutput {
  const leadId = editsLeads(draft, spec);
  const leads = draft.leads?.map((l) => ({ ...l, blocks: leadId ? writeBack(l.blocks, "lead", l.id, units) : l.blocks })) ?? null;
  const sections: Section[] = draft.sections.map((s) => {
    if (s.section_id !== leadId) return { ...s, blocks: writeBack(s.blocks, "section", s.section_id, units) };
    const chosen = draft.chosen_lead_id ? leads?.find((l) => l.id === draft.chosen_lead_id) : null;
    if (chosen) return { ...s, blocks: chosen.blocks.map((b) => ({ ...b, meta: { ...(b.meta ?? {}), lead_id: chosen.id, lead_type: chosen.lead_type as LeadType } })) };
    return provisionalLeadSection(s.section_id, s.title, leads ?? []);
  });
  const after = normalizeQuote(sectionsText(sections));
  const needsSource = draft.needs_source.filter((n) => after.includes(normalizeQuote(n)));
  return assembleDraft({ spec, sections, leads, chosenLeadId: draft.chosen_lead_id, needsSource, keepOrder: true });
}

// ---------------------------------------------------------------------------------------------------------------
// What the checker finds, for the editor and the report
// ---------------------------------------------------------------------------------------------------------------

const OWNER = new Set(TELLS.filter((t) => t.owner).map((t) => t.name));

/** The owner's tells and words in the whole piece, alternative leads included (the detector's count). */
export function ownerTellCount(draft: DraftOutput, spec: FormatSpec, exemptTerms: string[]): number {
  const leadId = editsLeads(draft, spec);
  const sections = [
    ...draft.sections.filter((s) => s.section_id !== leadId),
    ...(leadId ? (draft.leads ?? []).map((l) => ({ section_id: l.id, title: null, blocks: l.blocks })) : []),
  ];
  const r = analyzeDraft(sections, spec, { exemptTerms });
  return r.flags.filter((f) => OWNER.has(f.tell)).reduce((n, f) => n + f.count, 0);
}

/** Per text, the owner's tells the checker sees in it: the editor's starting list, never the whole of its job. */
export function unitFindings(units: EditUnit[], spec: FormatSpec, exemptTerms: string[]): { ref: string; tell: string; example: string }[] {
  const out: { ref: string; tell: string; example: string }[] = [];
  for (const u of units) {
    const block: Block = { id: u.ref, type: u.item === null ? u.type : "paragraph", text: u.text, items: null, meta: null };
    const r = analyzeDraft([{ section_id: "unit", title: null, blocks: [block] }], spec, { exemptTerms });
    for (const f of r.flags) if (OWNER.has(f.tell)) out.push({ ref: u.ref, tell: f.tell, example: f.examples[0] ?? "" });
  }
  return out;
}
