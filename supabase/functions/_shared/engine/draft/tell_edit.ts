/**
 * The tell edit's pure parts (docs/04-copy-standard.md §7.1, the owner's list): the piece as addressable texts,
 * the guards an edit must pass before it is applied, the deterministic backstop for the owner's never-rules
 * (em dashes, emojis, hashtags) and the grouping that keeps a long piece inside one call per group.
 *
 * An edit changes only its span and the seams around it: the rest of a text stays byte for byte. It may not change
 * a fact (numbers with their units and currencies, number words, dates, names, emails, hosts, links), move a ledger
 * tag or NEEDS SOURCE mark to another fact, touch the words of a quotation, or touch a testimonial at all.
 */
import type { Block, DraftOutput, Section } from "../schemas/draft.ts";
import type { LeadType } from "../schemas/common.ts";
import { LEDGER_TAG } from "../schemas/common.ts";
import type { FormatSpec } from "../formats/spec.ts";
import { analyzeDraft, countWords, EMOJI_SOURCE, HASHTAG_SOURCE, LINK_SOURCE, TELLS } from "../tells.ts";
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

/**
 * The chosen lead as the lead section now reads: a passage rewrite edits the section, not the lead variant, and the
 * tell edit rebuilds the section from the lead, so the section's text is copied back first (as revise does).
 */
export function syncChosenLead(draft: DraftOutput, spec: FormatSpec): DraftOutput {
  const id = editsLeads(draft, spec);
  if (!id || !draft.chosen_lead_id) return draft;
  const section = draft.sections.find((s) => s.section_id === id);
  const lead = draft.leads?.find((l) => l.id === draft.chosen_lead_id);
  if (!section || !lead) return draft;
  const same = section.blocks.length === lead.blocks.length && section.blocks.every((b, i) => b.text === lead.blocks[i].text && JSON.stringify(b.items) === JSON.stringify(lead.blocks[i].items));
  if (same) return draft;
  return { ...draft, leads: draft.leads!.map((l) => (l.id === lead.id ? { ...l, blocks: section.blocks } : l)) };
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
    const note = u.type === "testimonial" ? "testimonial: the customer's words, never edited" : `${u.type}${u.item !== null ? ` item ${u.item + 1}` : ""}`;
    out.push(`[${u.ref}] (${note}) ${u.text}`);
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

/** A ledger tag or NEEDS SOURCE mark, as one capture (LEDGER_TAG's own group is made non-capturing for split). */
const MARK_RE = new RegExp(`(${LEDGER_TAG.source.replace(/\((?!\?)/g, "(?:")}|\\[\\[NEEDS SOURCE\\]\\])`, "g");
const BROKEN_TAG_RE = /\[\[(?!L:[^\]\s]+\]\]|NEEDS SOURCE\]\])/;
const QUOTE_RE = /"[^"\n]{1,600}"|“[^”\n]{1,600}”|‘[^’\n]{1,600}’/g;
/** A number with the currency before it and the unit after it: "$1,299", "50%", "30 days", "9 am". */
const NUMBER_RE = /[$€£¥]?\d[\d,.:]*(?:%|\s?(?:x|k|m|bn|am|pm|a\.m\.|p\.m\.|days?|hours?|hrs?|minutes?|mins?|seconds?|weeks?|months?|years?|yrs?)\b)?/gi;
/** Cardinal number words; "one", "half", "double" and ordinals are left out, they are mostly turns of phrase ("one thing", "double down"). */
const NUMBER_WORD_RE = /\b(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|dozen)\b/gi;
const DATE_WORD_RE = /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December)\b/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const HOST_RE = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi;
const LINK_RE = new RegExp(LINK_SOURCE, "gi");
/** Owner's words a title-cased line may lose without it counting as a dropped name. */
const OWNER_WORD_RES = TELLS.filter((t) => t.owner && t.regex).map((t) => new RegExp(t.regex!.source, Array.from(new Set([...t.regex!.flags.replace(/[gm]/g, ""), "i"])).join("")));

const strip = (t: string) => t.replace(MARK_RE, " ");
const list = (t: string, re: RegExp) => (strip(t).match(new RegExp(re.source, re.flags)) ?? []).map((x) => x.toLowerCase().replace(/[.,;:!?]+$/, "").replace(/\s+/g, " ").trim());
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const multiset = (xs: string[]) => xs.slice().sort().join("\u0001");
const wordsOf = (t: string) => (strip(t).toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []).map((w) => w.replace(/['’]/g, ""));

/** Each ledger tag and NEEDS SOURCE mark with the numbers of its own sentence since the previous mark: the fact it carries. */
function anchoredMarks(t: string): string[] {
  const parts = t.split(MARK_RE);
  const out: string[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const since = parts[i - 1];
    let start = 0;
    for (const m of since.matchAll(/[.!?]["”’)]?\s+/g)) start = (m.index ?? 0) + m[0].length;
    out.push(`${parts[i]}|${list(since.slice(start), NUMBER_RE).join(",")}`);
  }
  return out;
}

const ABBREVIATION = /\b(?:Dr|Mr|Mrs|Ms|Mx|St|Jr|Sr|Prof|Inc|Ltd|Co|Corp|vs|etc|e\.g|i\.e|No|Vol|Fig)\.$/;
const PRONOUN_I = /^I(?:['’](?:m|d|ve|ll|re))?$/;

/**
 * Names, brands and places: capitalised words that do not open a sentence (a title like "Dr." does not end one),
 * and a sentence's first word when the next word is capitalised too ("Sarah Chen runs"). "I" is not a name.
 */
function namesOf(t: string): string[] {
  const text = strip(t);
  const tokens = Array.from(text.matchAll(/[\p{Lu}][\p{L}'’.-]*/gu));
  const out: string[] = [];
  tokens.forEach((m, k) => {
    if (PRONOUN_I.test(m[0])) return;
    const before = text.slice(0, m.index).replace(/\s+$/, "");
    const opens = !before || (/[.!?:;\n"“(]$/.test(before) && !ABBREVIATION.test(before));
    const next = tokens[k + 1];
    const nextIsName = !!next && (next.index ?? 0) === (m.index ?? 0) + m[0].length + 1 && !PRONOUN_I.test(next[0]);
    if (opens && !nextIsName) return;
    out.push(m[0].replace(/[.'’]+$/, ""));
  });
  return out;
}

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
  if (multiset(anchoredMarks(before)) !== multiset(anchoredMarks(after))) return "a ledger tag or NEEDS SOURCE mark was added, dropped, changed or moved to another fact";
  if (BROKEN_TAG_RE.test(after)) return "a ledger tag is malformed";
  if (!same(list(before, NUMBER_RE), list(after, NUMBER_RE))) return "a number, its unit or its currency changed, or numbers changed order";
  if (!same(list(before, NUMBER_WORD_RE), list(after, NUMBER_WORD_RE))) return "a number written as a word changed";
  if (!same(list(before, DATE_WORD_RE), list(after, DATE_WORD_RE))) return "a day or month changed";
  if (multiset(list(before, EMAIL_RE)) !== multiset(list(after, EMAIL_RE))) return "an email address changed";
  if (multiset(list(before, LINK_RE)) !== multiset(list(after, LINK_RE)) || multiset(list(before, HOST_RE)) !== multiset(list(after, HOST_RE))) return "a link or web address changed";
  const afterWords = wordsOf(after);
  for (const q of before.match(QUOTE_RE) ?? []) {
    if (!containsRun(afterWords, wordsOf(q))) return `a quotation lost its words: ${q.slice(0, 60)}`;
  }
  // naming the specific a teaser withheld adds words to a short line; a long line may grow by half at most
  const b = countWords(before);
  if (countWords(after) > b + Math.max(15, b * 0.5)) return "the replacement is much longer than the original";
  return null;
}

/** Names in a whole text survive an edit, and none is invented; an owner's word in a title-cased line may go. */
function namesIntact(before: string, after: string): string | null {
  const lost = namesOf(before).filter((n) => !after.includes(n) && !OWNER_WORD_RES.some((re) => re.test(n)));
  if (lost.length) return `a name was dropped or changed: ${lost[0]}`;
  const added = namesOf(after).filter((n) => !before.includes(n));
  if (added.length) return `a name was added: ${added[0]}`;
  return null;
}

/** Every quotation in a whole text keeps its words through an edit (only an em dash, emoji or hashtag may go). */
function quotationsIntact(before: string, after: string): string | null {
  const afterWords = wordsOf(after);
  for (const q of before.match(QUOTE_RE) ?? []) {
    if (!containsRun(afterWords, wordsOf(stripNeverTells(q)))) return `a quotation lost its words: ${q.slice(0, 60)}`;
  }
  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/** "before" as a pattern tolerant of curly quotes, dash variants and runs of spaces; line breaks match only line breaks. */
function tolerant(before: string): RegExp {
  const src = Array.from(before).map((c) => {
    if (c === "\n") return "\\n+";
    if (c === " " || c === "\t") return "[ \\t]+";
    if (c === "'" || c === "’" || c === "‘") return "['’‘]";
    if (c === '"' || c === "“" || c === "”") return `["“”]`;
    if (c === "—" || c === "–") return "[—–]";
    return escapeRe(c);
  }).join("").replace(/(?:\[ \\t\]\+)+/g, "[ \\t]+");
  return new RegExp(src, "i");
}

/** Locate `before` in `text`: exact first; tolerant only for a span with a letter or digit (a lone dash is too vague). */
function locate(text: string, before: string): { index: number; length: number } | null {
  const i = text.indexOf(before);
  if (i >= 0) return { index: i, length: before.length };
  if (!/[\p{L}\p{N}]/u.test(before)) return null;
  const hit = text.match(tolerant(before));
  return hit ? { index: hit.index ?? 0, length: hit[0].length } : null;
}

const SENTENCE_START = /(?:^|[.!?]["”’)]?[ \t]+|\n[ \t]*)$/;
/** Replace one span and tidy only its two seams: no doubled space, no space before punctuation, a capital where a sentence now starts. */
export function splice(text: string, index: number, length: number, after: string): string {
  let left = text.slice(0, index), mid = after, right = text.slice(index + length);
  if (!mid) {
    if (/[ \t]$/.test(left) && /^[ \t]/.test(right)) right = right.replace(/^[ \t]+/, "");
    if (/[ \t]$/.test(left) && /^[.,;:!?)]/.test(right)) left = left.replace(/[ \t]+$/, "");
    if (!left.trim()) left = left.replace(/[ \t]+$/, "");
    if (SENTENCE_START.test(left)) right = right.replace(/^([ \t"“(]*)(\p{Ll})(?=\p{Ll})/u, (_m, p: string, c: string) => p + c.toUpperCase());
    return left + right;
  }
  if (/[ \t]$/.test(left) && /^[ \t]/.test(mid)) mid = mid.replace(/^[ \t]+/, "");
  if (/[ \t]$/.test(left) && /^[.,;:!?)]/.test(mid)) left = left.replace(/[ \t]+$/, "");
  if (/[ \t]$/.test(mid) && /^[ \t]/.test(right)) right = right.replace(/^[ \t]+/, "");
  if (/[ \t]$/.test(mid) && /^[.,;:!?)]/.test(right)) mid = mid.replace(/[ \t]+$/, "");
  if (SENTENCE_START.test(left)) mid = mid.replace(/^([ \t"“(]*)(\p{Ll})(?=\p{Ll})/u, (_m, p: string, c: string) => p + c.toUpperCase());
  return left + mid + right;
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
    if (u.type === "testimonial") {
      rejected.push({ ...e, reason: "a testimonial keeps the customer's words" });
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
    const next = splice(u.text, at.index, at.length, e.after);
    const whole = multiset(anchoredMarks(u.text)) !== multiset(anchoredMarks(next)) ? "a ledger tag or NEEDS SOURCE mark moved to another fact" : BROKEN_TAG_RE.test(next) ? "a ledger tag is malformed" : namesIntact(u.text, next) ?? quotationsIntact(u.text, next);
    if (whole) {
      rejected.push({ ...e, reason: whole });
      continue;
    }
    u.text = next;
    applied.push({ ...e, ref, before: found });
  }
  return { units: out, applied, rejected };
}

// ---------------------------------------------------------------------------------------------------------------
// The backstop: em dashes, emojis and hashtags never ship (§7.1, tells 11-13)
// ---------------------------------------------------------------------------------------------------------------

/** Run `fn` with every link held as a placeholder, then put the links back: a URL may hold "--" or "#" and stays whole. */
function outsideLinks(text: string, fn: (t: string) => string): string {
  const links: string[] = [];
  const held = text.replace(new RegExp(LINK_SOURCE, "gi"), (m) => `\uE000${links.push(m) - 1}\uE001`);
  return fn(held).replace(/\uE000(\d+)\uE001/g, (_m, i: string) => links[Number(i)]);
}

/**
 * Remove each match of `symbol` (with the spaces around it) and tidy that seam only: at a line's start or end, or
 * before punctuation, nothing is left; a list marker keeps its space; between two words, one space.
 */
function removeAt(text: string, symbol: string): string {
  return text.replace(new RegExp(`([ \\t]*)(?:${symbol})+([ \\t]*)`, "gu"), (m: string, _l: string, _r: string, offset: number, whole: string) => {
    const before = whole.slice(0, offset), after = whole.slice(offset + m.length);
    if (/(?:^|\n)[ \t]*[-*•]$/.test(before)) return " ";
    if (/#$/.test(before)) return "";
    if (/(?:^|\n)[ \t]*$/.test(before) || /^(?:\n|$)/.test(after) || /^[.,;:!?)]/.test(after)) return "";
    return " ";
  });
}

const KEYCAP_RUN_RE = /(^|\n)?([ \t]*)((?:[0-9]\uFE0F?\u20E3)+|\u{1F51F})/gu;

/** Emojis go; a keycap number keeps its digits ("1️⃣0️⃣" is "10", 🔟 is "10"), and one that numbers a line becomes "1.". */
export function removeEmojis(text: string): string {
  if (!new RegExp(EMOJI_SOURCE, "u").test(text)) return text;
  const t = text.replace(KEYCAP_RUN_RE, (_m, nl: string | undefined, sp: string, k: string, offset: number) => {
    const digits = k === "\u{1F51F}" ? "10" : k.replace(/[^\d]/g, "");
    return `${nl ?? ""}${sp}${digits}${nl !== undefined || offset === 0 ? "." : ""}`;
  });
  return removeAt(t, EMOJI_SOURCE);
}

const DISCLOSURE: Record<string, string> = { ad: "(Ad)", ads: "(Ad)", sponsored: "(Sponsored)", paid: "(Paid)", paidpartnership: "(Paid partnership)", partner: "(Partner)", affiliate: "(Affiliate link)" };
const HASHTAG_RE = new RegExp(HASHTAG_SOURCE, "gu");
const TAG_BLOCK_RE = new RegExp(`(^|[.!?…]["”’)]?|\\n)([ \\t]*(?:${HASHTAG_SOURCE}[ \\t]*)+)$|(?:[ \\t]*(?:${HASHTAG_SOURCE})){2,}[ \\t]*$`, "gmu");

/**
 * Hashtags go. A disclosure tag (#ad, #sponsored) becomes its plain label, so the disclosure stays. A block of tags
 * at the end of a line, after the sentence or as two or more in a row, goes whole; a single tag inside or at the
 * end of a sentence keeps its word ("Proudly serving #Austin" is "Proudly serving Austin").
 */
export function removeHashtags(text: string): string {
  if (!new RegExp(HASHTAG_SOURCE, "u").test(text)) return text;
  return outsideLinks(text, (seg) => {
    let t = seg.replace(HASHTAG_RE, (m, word: string) => DISCLOSURE[word.toLowerCase()] ?? m);
    t = t.replace(TAG_BLOCK_RE, (m, lead?: string) => (lead !== undefined && m.startsWith(lead) ? lead : ""));
    return t.replace(HASHTAG_RE, (_m, word: string) => word);
  });
}

/** One side of a range: a number with its currency or time, a weekday or a month. */
const RANGE_ATOM = String.raw`(?:[$€£]?\d[\d,.:]*(?:\s?(?:%|k|am|pm|a\.m\.|p\.m\.))?|(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)`;
const RANGE_RE = new RegExp(`(${RANGE_ATOM})[ \\t]*(?:—|–|--)[ \\t]*(${RANGE_ATOM})(?![\\p{L}\\p{N}])`, "gu");

/**
 * Em dashes, and a spaced en dash or double hyphen used as one: a range keeps an unspaced en dash ("9 am–5 pm"),
 * a dash at a line's start or end or against a quote mark goes, a pair in one sentence becomes parentheses, a
 * single one a comma. Links are left whole. Only the seams around each dash change.
 */
export function replaceEmDashes(text: string): string {
  if (!/—|\s–\s|--/.test(text)) return text;
  return outsideLinks(text, (seg) => {
    let t = seg.replace(RANGE_RE, "$1–$2");
    t = t.replace(/(?<=\S)[ \t]+–[ \t]+(?=\S)/g, " — ").replace(/(?<=\S)[ \t]+--[ \t]+(?=\S)/g, " — ").replace(/(?<=\w)--(?=\w)/g, "—");
    if (!t.includes("—")) return t;
    t = t.replace(/(^|\n)([ \t]*)—[ \t]*/g, "$1$2").replace(/[ \t]*—[ \t]*(?=\n|$)/g, "");
    t = t.replace(/[ \t]*—[ \t]*(?=["“”])|(?<=["“”])[ \t]*—[ \t]*/g, " ");
    t = t.replace(/[ \t]*—[ \t]*([^—.!?\n]{1,80}?)[ \t]*—[ \t]*(?=(.?))/g, (_m, inner: string, next: string) => ` (${inner.trim()})${/[.,;:!?)]/.test(next) ? "" : " "}`);
    t = t.replace(/[ \t]*—[ \t]*(?=(.?))/g, (_m, next: string) => (/[.,;:!?]/.test(next) ? "" : ", "));
    return t.replace(/,[ \t]*,/g, ",").replace(/\([ \t]+/g, "(");
  });
}

/** The owner's never-rules applied to one text; returns it unchanged when there is nothing to remove. */
export function stripNeverTells(text: string): string {
  return replaceEmDashes(removeHashtags(removeEmojis(text)));
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

const KEEP_EMPTIED = new Set<Block["type"]>(["disclosure", "label", "testimonial", "guarantee", "price", "button", "field"]);

function writeBack(blocks: Block[], owner: EditUnit["owner"], ownerId: string, units: EditUnit[]): Block[] {
  const mine = units.filter((u) => u.owner === owner && u.ownerId === ownerId);
  const next = blocks.map((b, j) => {
    const text = mine.find((u) => u.blockIndex === j && u.item === null);
    const items = b.items ? b.items.map((it, i) => mine.find((u) => u.blockIndex === j && u.item === i)?.text ?? it) : b.items;
    return { ...b, text: text ? text.text : b.text, items: items ? items.filter((it) => it.trim()) : items };
  });
  // a block the editor emptied (a windup that carried nothing) goes; a list keeps its items; a disclosure, label or price is never dropped
  return next.map((b, j) => (!b.text.trim() && KEEP_EMPTIED.has(b.type) ? blocks[j] : b)).filter((b, j) => b.text.trim() || (b.items ?? []).length || !blocks[j].text.trim());
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
  // a NEEDS SOURCE line in a runner-up lead is still in the piece: check the leads too
  const after = normalizeQuote(sectionsText([...sections, ...(leads ?? []).map((l) => ({ section_id: l.id, title: null, blocks: l.blocks }))]));
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
    if (u.type === "testimonial") continue;
    const block: Block = { id: u.ref, type: u.item === null ? u.type : "paragraph", text: u.text, items: null, meta: null };
    const r = analyzeDraft([{ section_id: "unit", title: null, blocks: [block] }], spec, { exemptTerms });
    for (const f of r.flags) if (OWNER.has(f.tell)) out.push({ ref: u.ref, tell: f.tell, example: f.examples[0] ?? "" });
  }
  return out;
}
