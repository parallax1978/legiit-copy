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
import { LEDGER_TAG, NEEDS_SOURCE_TAG } from "../schemas/common.ts";
import type { FormatSpec } from "../formats/spec.ts";
import { analyzeDraft, blankQuotes, countWords, DISPLAY_TYPES, headlineLike, isTitleCaseLine, LINK_SOURCE, pieceOfSection, REPEAT_FAMILIES, REPEAT_SKIP, repeatedRuns, sloganCoupletPairs, TELLS } from "../tells.ts";
import { ONE_LINE_OFFER_FAMILIES } from "./prompt_text.ts";
import { stripNeverTells } from "./never_tells.ts";

export { removeEmojis, removeHashtags, replaceEmDashes, stripNeverTells } from "./never_tells.ts";
import { assembleDraft, provisionalLeadSection } from "./assemble.ts";
import { needsSourceLines, normalizeQuote, sectionsText } from "./ledger.ts";
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
  // the chosen opening is shown where its section sits (first in a post, after the headline in a letter); before the
  // pick every opening is an alternative, shown after the sections
  const chosen = draft.chosen_lead_id && units.some((u) => u.owner === "lead" && u.ownerId === draft.chosen_lead_id) ? draft.chosen_lead_id : null;
  // the lead section: the one the openings stand in for (its own text is never edited directly)
  const leadId = chosen ? draft.sections.find((x) => !units.some((u) => u.owner === "section" && u.ownerId === x.section_id) && x.blocks.some((b) => b.meta?.lead_id === chosen))?.section_id ?? null : null;
  const opening = units.filter((u) => u.owner === "lead" && u.ownerId === chosen);
  const sectionUnits = draft.sections.flatMap((s) => (s.section_id === leadId ? opening : units.filter((u) => u.owner === "section" && u.ownerId === s.section_id)));
  const ordered = [...(leadId ? [] : opening), ...sectionUnits, ...units.filter((u) => u.owner === "lead" && u.ownerId !== chosen)];
  const firstIsOpening = ordered[0]?.owner === "lead" && ordered[0]?.ownerId === chosen;
  for (const u of ordered) {
    const key = `${u.owner}:${u.ownerId}`;
    if (key !== current) {
      const lead = u.owner === "lead" ? draft.leads?.find((l) => l.id === u.ownerId) : null;
      const kind = lead ? ` (${lead.lead_type})` : "";
      out.push(
        u.owner !== "lead"
          ? `\n=== section ${u.ownerId} ===`
          : u.ownerId === chosen
          ? `\n=== opening ${u.ownerId}${kind}: the chosen opening, ${firstIsOpening ? "read before the sections" : "read in its place among the sections"} ===`
          : `\n=== alternative opening ${u.ownerId}${kind}${chosen ? `, read in place of ${chosen}` : ""} ===`,
      );
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
const QUOTE_RE = /"[^"\n]{1,600}"|“[^”\n]{1,600}”|‘[^’\n]{1,600}’|(?<![\p{L}\p{N}])'(?=[^'\n]*\s[^'\n]*\s)[^'\n]{1,600}'(?![\p{L}\p{N}])/gu;
/** A number with the currency before it and the unit after it: "$1,299", "50%", "30 days", "9 am". */
const NUMBER_RE = /[$€£¥]?\d[\d,.:]*(?:%|\s?(?:x|k|m|bn|am|pm|a\.m\.|p\.m\.|days?|hours?|hrs?|minutes?|mins?|seconds?|weeks?|months?|years?|yrs?)\b)?/gi;
/** Cardinal number words; "one", "half", "double" and ordinals are left out, they are mostly turns of phrase ("one thing", "double down"). */
const NUMBER_WORD_RE = /\b(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|dozen)\b/gi;
/** The count of a count windup ("two things", "Three rules"): the label_windup rule's nouns. */
const COUNT_WINDUP_RE = /\b(?:two|three|four|five)\s+(?:things|questions|checks|tests|rules)\b/gi;
const DATE_WORD_RE = /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December)\b/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const HOST_RE = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi;
const LINK_RE = new RegExp(LINK_SOURCE, "gi");
/** Owner's words a title-cased line may lose without it counting as a dropped name. */
const OWNER_WORD_RES = TELLS.filter((t) => t.owner && t.regex).map((t) => new RegExp(t.regex!.source, Array.from(new Set([...t.regex!.flags.replace(/[gm]/g, ""), "i"])).join("")));

const strip = (t: string) => t.replace(MARK_RE, " ");
const norm = (x: string) => x.toLowerCase().replace(/[.,;:!?]+$/, "").replace(/\s+/g, " ").trim();
const list = (t: string, re: RegExp) => (strip(t).match(new RegExp(re.source, re.flags)) ?? []).map(norm);
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

/** A word whose capitals mark a name wherever it stands: an acronym ("SEO") or an inner capital ("HubSpot"). */
/** Words a Title Case headline capitalises that are never names. */
const TITLE_WORDS = new Set("a an and are as at be best but by can do does every for from get here here's how if in into is it it's its just make more most my new no not now of off on one only or our out over so than that the then these this those to up us we what when where who why will with without you your".split(" "));

/**
 * Names, brands and places: capitalised words that do not open a sentence (a title like "Dr." does not end one),
 * and a sentence's first word when the next word is capitalised too ("Sarah Chen runs"). "I" is not a name. In a
 * Title Case display line (a headline, a subject) every word is capitalised, so every capitalised word there but a
 * title word ("How", "Your", "Get") counts as a name: "How Dana Doubled Her Bookings In Austin" keeps Dana and Austin.
 */
function namesOf(t: string, display = false): string[] {
  const text = strip(t);
  const titleLines: [number, number][] = [];
  let at = 0;
  for (const line of text.split("\n")) {
    if (headlineLike(line, display) && isTitleCaseLine(line)) titleLines.push([at, at + line.length]);
    at += line.length + 1;
  }
  const tokens = Array.from(text.matchAll(/[\p{Lu}][\p{L}'’.-]*/gu));
  const out: string[] = [];
  tokens.forEach((m, k) => {
    if (PRONOUN_I.test(m[0])) return;
    const i = m.index ?? 0;
    if (titleLines.some(([s, e]) => i >= s && i < e)) {
      const word = m[0].replace(/['’]s$/, "").replace(/[.'’]+$/, "");
      if (!TITLE_WORDS.has(word.toLowerCase())) out.push(word);
      return;
    }
    const before = text.slice(0, m.index).replace(/\s+$/, "");
    const opens = !before || (/[.!?:;\n"“(]$/.test(before) && !ABBREVIATION.test(before));
    const next = tokens[k + 1];
    const nextIsName = !!next && (next.index ?? 0) === (m.index ?? 0) + m[0].length + 1 && !PRONOUN_I.test(next[0]);
    if (opens && !nextIsName) return;
    out.push(m[0].replace(/['’]s$/, "").replace(/[.'’]+$/, ""));
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

const WINDUP_RULES = TELLS.filter((t) => t.name === "label_windup" || t.name === "count_windup");
/** The count itself: the number right before the counted noun. Every other number in a windup is a fact. */
const COUNT_TOKEN_RE = /\b(?:two|three|four|five|six|seven|eight|nine|ten|\d+)(?=\s+(?:steps|stages|ways|reasons|signs|mistakes|secrets|moves|things|questions|checks|tests|rules)\b)/gi;

/** Where an edit sits: the whole text it is cut from, its offset there, and the format family (count windups count in short pieces only). */
export interface EditContext {
  text: string;
  at: number;
  family?: FormatSpec["family"];
}

const blankMarks = (t: string) => t.replace(MARK_RE, (m) => " ".repeat(m.length));

/**
 * Positions, in the whole text, of the counts of its count windups (tells.ts label_windup and count_windup, or a bare
 * "two things"): the windups are matched on the whole text, so a sentence's own start and end anchor them, and only
 * the count goes; a price, a percentage or a duration in the same stretch stays a fact.
 */
function windupCounts(ctx: EditContext): Set<number> {
  const text = blankMarks(ctx.text);
  const res = [...WINDUP_RULES.filter((r) => !r.families || !ctx.family || r.families.includes(ctx.family)).map((r) => new RegExp(r.regex!.source, r.regex!.flags)), new RegExp(COUNT_WINDUP_RE.source, "gi")];
  const out = new Set<number>();
  for (const re of res) {
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      for (const c of m[0].matchAll(new RegExp(COUNT_TOKEN_RE.source, COUNT_TOKEN_RE.flags))) out.add(start + (c.index ?? 0));
    }
  }
  return out;
}

/**
 * The numbers `re` finds in `after` are those of `before` in order, none changed: only the count of a count windup
 * ("I'd ask two things", "It takes seven steps, and", "Follow these 5 steps:") may be dropped.
 */
function numbersKept(before: string, after: string, re: RegExp, ctx: EditContext = { text: before, at: 0 }): boolean {
  const counts = windupCounts(ctx);
  const text = blankMarks(before);
  const was = Array.from(text.matchAll(new RegExp(re.source, re.flags)), (m) => ({ word: norm(m[0]), droppable: counts.has(ctx.at + (m.index ?? 0)) }));
  const now = list(after, re);
  let j = 0;
  for (const w of was) {
    if (now[j] === w.word) j++;
    else if (!w.droppable) return false;
  }
  return j === now.length;
}

/** A size word by meaning, so "about 2,000" and "roughly 2,000" are the same claim and "up to 40" and "40" are not. */
const SIZE_CLASS: Record<string, string> = {
  about: "approx", around: "approx", roughly: "approx", approximately: "approx", nearly: "nearly", almost: "nearly",
  "up to": "max", "at most": "max", "at least": "min", "more than": "min", over: "min", "less than": "below", "fewer than": "below", under: "below", within: "within",
};
const NUMBER_TOKEN = `(?:[$€£¥]?\\d(?:[\\d,.]*\\d)?|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|million|dozen)`;
/** A size word right before its number ("up to 40", "within 10 minutes"); "about the 40 keywords" is a topic, not a size. */
const SIZE_PAIR_RE = new RegExp(`\\b(up to|at most|at least|more than|less than|fewer than|about|around|roughly|approximately|nearly|almost|over|under|within)\\s+(${NUMBER_TOKEN})\\b`, "gi");
/** Words that size a claim about many ("most reports", "usually") in a sentence that holds a number. */
const SHARE_RE = /\b(?:most|some|many|usually|typically|often|on average)\b/gi;

function sizeWords(text: string): string[] {
  const out: string[] = [];
  for (const s of strip(text).split(/(?<=[.!?…]["”’)]?)\s+/)) {
    for (const m of s.matchAll(new RegExp(SIZE_PAIR_RE.source, "gi"))) out.push(`${SIZE_CLASS[m[1].toLowerCase()]}:${norm(m[2])}`);
    if (list(s, NUMBER_RE).length || list(s, NUMBER_WORD_RE).length) out.push(...(s.match(new RegExp(SHARE_RE.source, "gi")) ?? []).map((w) => `share:${w.toLowerCase()}`));
  }
  return out.sort();
}

/** The span of the whole sentences of `ctx.text` an edit of `before` at `ctx.at` touches. */
function touchedSentences(ctx: EditContext, before: string): [number, number] {
  let start = 0;
  for (const m of ctx.text.slice(0, ctx.at).matchAll(/[.!?…]["”’)\]]*\s+|\n/g)) start = (m.index ?? 0) + m[0].length;
  const tail = ctx.text.slice(ctx.at + before.length);
  const m = /[.!?…]["”’)\]]*(?=\s|$)|\n/.exec(tail);
  return [start, m ? ctx.at + before.length + (m.index ?? 0) + m[0].length : ctx.text.length];
}

/**
 * The words that set the size of the claims an edit touches are the same after it: "up to 40" never becomes "40" or
 * "over 40", and "Most reports" never becomes "Reports", however narrow the span; "about" may become "roughly".
 */
function precisionKept(before: string, after: string, ctx?: EditContext): boolean {
  if (!ctx) return sizeWords(before).join("|") === sizeWords(after).join("|");
  const [s, e] = touchedSentences(ctx, before);
  const was = ctx.text.slice(s, e);
  const now = ctx.text.slice(s, ctx.at) + after + ctx.text.slice(ctx.at + before.length, e);
  return sizeWords(was).join("|") === sizeWords(now).join("|");
}

/** Why an edit may not be applied, or null when it keeps every fact, tag, quote and link and stays close in length. */
/**
 * A cut of whole sentences that carry no fact but their ledger tags or NEEDS SOURCE marks: a closer that says the
 * hook again, a slogan, a leftover. The tags go with the claim they cite. A sentence with a number, a date, an email,
 * a link or a quotation is never cut this way (names are checked on the whole text).
 */
export function factFreeSentenceCut(before: string, after: string, ctx?: EditContext): boolean {
  if (after.trim()) return false;
  const plain = strip(before).replace(/\s+/g, " ").trim();
  if (!/^["“(]?\p{Lu}/u.test(plain) || !/[.!?]["”’)]?$/.test(plain)) return false;
  // the count of a count windup ("It takes seven steps.") is the tell, not a fact
  return numbersKept(before, "", NUMBER_RE, ctx) && numbersKept(before, "", NUMBER_WORD_RE, ctx) && !list(before, DATE_WORD_RE).length &&
    !list(before, EMAIL_RE).length && !list(before, LINK_RE).length && !list(before, HOST_RE).length && !(before.match(QUOTE_RE) ?? []).length;
}

/** Remove one occurrence of each of `drop` from `xs`. */
function minus(xs: string[], drop: string[]): string[] {
  const out = xs.slice();
  for (const d of drop) {
    const i = out.indexOf(d);
    if (i >= 0) out.splice(i, 1);
  }
  return out;
}

export function guardEdit(before: string, after: string, ctx?: EditContext): string | null {
  if (!before.trim()) return "empty before";
  if (multiset(anchoredMarks(before)) !== multiset(anchoredMarks(after)) && !factFreeSentenceCut(before, after, ctx)) return "a ledger tag or NEEDS SOURCE mark was added, dropped, changed or moved to another fact";
  if (BROKEN_TAG_RE.test(after)) return "a ledger tag is malformed";
  // the count in a count windup ("I'd ask two things", "It takes seven steps, and") is the tell, not a fact: it may go, never change
  if (!numbersKept(before, after, NUMBER_RE, ctx)) return "a number, its unit or its currency changed, or numbers changed order";
  if (!numbersKept(before, after, NUMBER_WORD_RE, ctx)) return "a number written as a word changed";
  // a whole-sentence cut takes its claim with it; any other edit keeps the size of the claims it touches
  if (!(after.trim() === "" && factFreeSentenceCut(before, after, ctx)) && !precisionKept(before, after, ctx)) return "a word that sets a number's size or precision changed (\"up to\", \"about\", \"most\", \"within\")";
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
function namesIntact(before: string, after: string, display = false): string | null {
  const lost = namesOf(before, display).filter((n) => !after.includes(n) && !OWNER_WORD_RES.some((re) => re.test(n)));
  if (lost.length) return `a name was dropped or changed: ${lost[0]}`;
  const added = namesOf(after, display).filter((n) => !before.includes(n));
  if (added.length) return `a name was added: ${added[0]}`;
  return null;
}

/** Display lines that may be set in Title Case. */
const TITLE_CASE_TYPES = new Set<Block["type"]>(["headline", "deck", "preheadline", "crosshead", "subject", "preview", "label", "button"]);

/** Display text the owner's "flatten formatting the text does not need" fix may delete outright. */
const DELETABLE_DISPLAY = new Set<Block["type"]>(["crosshead", "preheadline"]);

/** Every quotation in a whole text keeps its words through an edit, as a quotation (only an em dash, emoji or hashtag may go). */
function quotationsIntact(before: string, after: string): string | null {
  const kept = (after.match(QUOTE_RE) ?? []).map((q) => wordsOf(stripNeverTells(q)).join(" "));
  for (const q of before.match(QUOTE_RE) ?? []) {
    const words = wordsOf(stripNeverTells(q)).join(" ");
    const i = kept.indexOf(words);
    if (i < 0) return `a quotation lost its words: ${q.slice(0, 60)}`;
    kept.splice(i, 1);
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
/** Where `before` sits in the text: outside a quotation when it occurs both inside and out, else the first exact hit, else a tolerant match. */
function locate(text: string, before: string): { index: number; length: number } | null {
  const quoted = Array.from(text.matchAll(QUOTE_RE), (m) => [m.index ?? 0, (m.index ?? 0) + m[0].length] as const);
  const inQuote = (i: number) => quoted.some(([s, e]) => i >= s && i < e);
  let i = text.indexOf(before);
  const first = i;
  while (i >= 0 && inQuote(i)) i = text.indexOf(before, i + 1);
  if (i >= 0) return { index: i, length: before.length };
  if (first >= 0) return { index: first, length: before.length };
  if (!/[\p{L}\p{N}]/u.test(before)) return null;
  const hit = text.match(tolerant(before));
  return hit ? { index: hit.index ?? 0, length: hit[0].length } : null;
}

const SENTENCE_START = /(?:^|[.!?]["”’)]?[ \t]+|\n[ \t]*)$/;
/** Replace one span and tidy only its two seams: no doubled space, no space before punctuation, a capital where a sentence now starts. */
/** The first letter of a new sentence, unless a capital follows it ("iPhone" keeps its lowercase "i"; "a" and "c'est" get theirs). */
const CAPITALISABLE = /^([ \t"“(]*)(\p{Ll})(?!\p{Lu})/u;

export function splice(text: string, index: number, length: number, after: string): string {
  let left = text.slice(0, index), mid = after, right = text.slice(index + length);
  if (!mid) {
    if (/[ \t]$/.test(left) && /^[ \t]/.test(right)) right = right.replace(/^[ \t]+/, "");
    if (/[ \t]$/.test(left) && /^[.,;:!?)]/.test(right)) left = left.replace(/[ \t]+$/, "");
    // a cut at the end of a text or a line leaves no trailing space
    if (!right || /^\n/.test(right)) left = left.replace(/[ \t]+$/, "");
    if (!left.trim()) {
      left = left.replace(/[ \t]+$/, "");
      right = right.replace(/^[ \t]+/, "");
    }
    if (SENTENCE_START.test(left)) right = right.replace(CAPITALISABLE, (_m, p: string, c: string) => p + c.toUpperCase());
    return left + right;
  }
  if (/[ \t]$/.test(left) && /^[ \t]/.test(mid)) mid = mid.replace(/^[ \t]+/, "");
  if (/[ \t]$/.test(left) && /^[.,;:!?)]/.test(mid)) left = left.replace(/[ \t]+$/, "");
  if (/[ \t]$/.test(mid) && /^[ \t]/.test(right)) right = right.replace(/^[ \t]+/, "");
  if (/[ \t]$/.test(mid) && /^[.,;:!?)]/.test(right)) mid = mid.replace(/[ \t]+$/, "");
  if (SENTENCE_START.test(left)) mid = mid.replace(CAPITALISABLE, (_m, p: string, c: string) => p + c.toUpperCase());
  return left + mid + right;
}

/** Apply the editor's edits in order; each must find its span, pass the guards and leave the text changed. */
export function applyEdits(units: EditUnit[], edits: TellEdit[], family?: FormatSpec["family"]): { units: EditUnit[]; applied: TellEdit[]; rejected: RejectedEdit[] } {
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
    const ctx: EditContext = { text: u.text, at: at.index, family };
    const why = guardEdit(found, e.after, ctx);
    if (why) {
      rejected.push({ ...e, reason: why });
      continue;
    }
    const next = splice(u.text, at.index, at.length, e.after);
    // a crosshead the text does not need may go whole (a ledger tag or a number in it still may not)
    const dropsHeader = !next.trim() && u.item === null && DELETABLE_DISPLAY.has(u.type);
    // a whole-sentence cut takes its own tags with it; every other mark stays with its fact
    const expected = factFreeSentenceCut(found, e.after, ctx) ? minus(anchoredMarks(u.text), anchoredMarks(found)) : anchoredMarks(u.text);
    const whole = multiset(expected) !== multiset(anchoredMarks(next)) ? "a ledger tag or NEEDS SOURCE mark moved to another fact" : BROKEN_TAG_RE.test(next) ? "a ledger tag is malformed" : (dropsHeader ? null : namesIntact(u.text, next, u.item === null && TITLE_CASE_TYPES.has(u.type))) ?? quotationsIntact(u.text, next);
    if (whole) {
      rejected.push({ ...e, reason: whole });
      continue;
    }
    u.text = next;
    applied.push({ ...e, ref, before: found });
  }
  // an opening (or a section) is never cut whole: the cold read could pick an empty opening, a format a missing section
  const had = new Set(units.filter((u) => u.text.trim()).map((u) => `${u.owner}:${u.ownerId}`));
  const emptied = new Set(Array.from(had).filter((g) => !out.some((u) => `${u.owner}:${u.ownerId}` === g && u.text.trim())));
  if (!emptied.size) return { units: out, applied, rejected };
  const restored = out.map((u, i) => (emptied.has(`${u.owner}:${u.ownerId}`) ? { ...u, text: units[i].text } : u));
  const lost = new Set(out.filter((u) => emptied.has(`${u.owner}:${u.ownerId}`)).map((u) => u.ref));
  return {
    units: restored,
    applied: applied.filter((e) => !lost.has(e.ref)),
    rejected: [...rejected, ...applied.filter((e) => lost.has(e.ref)).map((e) => ({ ...e, reason: "an opening or a section is never cut whole; rephrase it instead" }))],
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The backstop: em dashes, emojis and hashtags never ship (§7.1, tells 11-13)
// ---------------------------------------------------------------------------------------------------------------

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
  // a NEEDS SOURCE line in a runner-up lead is still in the piece: keep the old lines still present, and take the
  // leads' lines as they read now (assembleDraft finds the sections' own lines itself)
  const leadSections = (leads ?? []).map((l) => ({ section_id: l.id, title: null, blocks: l.blocks }));
  const after = normalizeQuote(sectionsText([...sections, ...leadSections]));
  const needsSource = [...draft.needs_source.filter((n) => after.includes(normalizeQuote(n))), ...needsSourceLines(leadSections)];
  return assembleDraft({ spec, sections, leads, chosenLeadId: draft.chosen_lead_id, needsSource, keepOrder: true });
}

// ---------------------------------------------------------------------------------------------------------------
// What the checker finds, for the editor and the report
// ---------------------------------------------------------------------------------------------------------------

const OWNER = new Set(TELLS.filter((t) => t.owner).map((t) => t.name));

/**
 * The owner's tells and words in the whole piece, alternative leads included, counted as the detector counts them:
 * each opening's own tells, and the piece's repeats less the one repeat per piece the detector lets go.
 */
export function ownerTellCount(draft: DraftOutput, spec: FormatSpec, exemptTerms: string[]): number {
  const leadId = editsLeads(draft, spec);
  const sections = [
    ...draft.sections.filter((s) => s.section_id !== leadId),
    ...(leadId ? (draft.leads ?? []).map((l) => ({ section_id: l.id, title: null, blocks: l.blocks })) : []),
  ];
  const r = analyzeDraft(sections, spec, { exemptTerms });
  // the alternative openings repeat each other by design: repeats are counted per reading (repeatFindings)
  const own = r.flags.filter((f) => OWNER.has(f.tell) && f.tell !== "repeated_phrase" && f.tell !== "slogan_couplet").reduce((n, f) => n + f.count, 0) +
    coupletFindings(editableUnits(draft, spec), draft, spec).length;
  const perPiece = new Map<string, number>();
  for (const f of repeatFindings(editableUnits(draft, spec), draft, spec, exemptTerms)) perPiece.set(f.piece, (perPiece.get(f.piece) ?? 0) + 1);
  return own + Array.from(perPiece.values()).reduce((n, k) => n + Math.max(0, k - 1), 0);
}

export interface RepeatFinding {
  ref: string;
  tell: "repeated_phrase";
  example: string;
  /** the piece the repeat is in (tells.ts pieceOfSection): one email of a sequence, one ad of a set */
  piece: string;
}

const TAG_IN_RE = new RegExp(LEDGER_TAG.source);
const runWords = (t: string) => t.replace(MARK_RE, " ").toLowerCase().replace(/’/g, "'").match(/\p{N}+(?:[.,]\p{N}+)*|\p{L}[\p{L}\p{N}']*/gu) ?? [];

/** Whether the sentence of `text` that holds `line` carries a ledger tag or NEEDS SOURCE mark (the mark after its full stop included). */
export function sentenceTagged(text: string, line: string): boolean {
  const sentences = text.replace(/([.!?…]["”’)]?)\s+(\[\[[^\]]+\]\])/g, "$1$2").split(/(?<=[.!?…]["”’)]?(?:\[\[[^\]]+\]\])*)\s+/);
  const want = runWords(line);
  const s = want.length ? sentences.find((x) => containsRun(runWords(x), want.slice(0, Math.min(5, want.length)))) : undefined;
  const t = s ?? text;
  return TAG_IN_RE.test(t) || t.includes(NEEDS_SOURCE_TAG);
}

/** Whether the sentence of `u` that holds `run` carries a ledger tag or NEEDS SOURCE mark (the mark after its full stop included). */
function runTagged(u: EditUnit, run: string): boolean {
  // a mark that follows a sentence's full stop belongs to that sentence
  const sentences = u.text.replace(/([.!?…]["”’)]?)\s+(\[\[[^\]]+\]\])/g, "$1$2").split(/(?<=[.!?…]["”’)]?(?:\[\[[^\]]+\]\])*)\s+/);
  const target = run.split(" ").map((w) => w.replace(/’/g, "'"));
  const holds = (s: string) => {
    const w = runWords(s);
    for (let i = 0; i + target.length <= w.length; i++) if (target.every((t, k) => w[i + k] === t || w[i + k].replace(/s$/, "") === t.replace(/s$/, ""))) return true;
    return false;
  };
  const s = sentences.find(holds);
  return s ? TAG_IN_RE.test(s) || s.includes(NEEDS_SOURCE_TAG) : TAG_IN_RE.test(u.text) || u.text.includes(NEEDS_SOURCE_TAG);
}

/**
 * What the piece says twice (tells.ts repeated_phrase), as findings for the editor, read the way the reader reads it
 * and only within one piece (an email of a sequence, an ad of a set). Before the cold read picks an opening, the
 * sections are read alone and every opening is an alternative; once one is chosen it is read before the sections.
 * A repeat between the body and the chosen opening lands on the later text, unless only that one carries a ledger tag:
 * the untagged line says it again in other words and the proof stays. An alternative opening takes its own repeats,
 * worded as a rephrase, so an opening the user has not chosen never costs the body a line and is never cut whole.
 * The alternative openings are never read against each other.
 */
export function repeatFindings(units: EditUnit[], draft: DraftOutput, spec: FormatSpec, exemptTerms: string[]): RepeatFinding[] {
  if (!REPEAT_FAMILIES.has(spec.family)) return [];
  const leadId = editsLeads(draft, spec);
  const leadIds = Array.from(new Set(units.filter((u) => u.owner === "lead").map((u) => u.ownerId)));
  const chosen = draft.chosen_lead_id && leadIds.includes(draft.chosen_lead_id) ? draft.chosen_lead_id : null;
  const pieceOfUnit = (u: EditUnit) => pieceOfSection(u.owner === "lead" ? leadId ?? u.ownerId : u.ownerId, spec);
  const readingWith = (lead: string | null): EditUnit[] =>
    draft.sections.flatMap((s) =>
      s.section_id === leadId ? units.filter((u) => u.owner === "lead" && u.ownerId === lead) : units.filter((u) => u.owner === "section" && u.ownerId === s.section_id)
    );
  const out: RepeatFinding[] = [];
  const seen = new Set<string>();
  // the reader's reading first (the chosen opening, or the sections alone), then each alternative opening in its place
  for (const lead of [chosen, ...leadIds.filter((l) => l !== chosen)]) {
    const alternative = lead !== chosen;
    const reading = readingWith(lead);
    for (const p of repeatedRuns(reading.map((u) => ({ text: u.text, type: u.type, piece: pieceOfUnit(u) })), exemptTerms)) {
      const [later, first] = [reading[p.later], reading[p.first]];
      let target: EditUnit | null;
      if (alternative) target = later.owner === "lead" ? later : first.owner === "lead" ? first : null;
      else target = runTagged(later, p.run) && !runTagged(first, p.run) ? first : later;
      if (!target) continue;
      const other = target === later ? first : later;
      const key = `${target.ref}\u0000${p.run}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // an opening, or the only text of its section, is never cut whole: it is said another way
      const sole = target.owner === "lead" || units.filter((u) => u.owner === target!.owner && u.ownerId === target!.ownerId).length === 1;
      const how = runTagged(target, p.run)
        ? "keep this sentence's facts and ledger tag and say the shared words another way"
        : sole
        ? `say it another way here (${target.owner === "lead" ? "an opening" : "the only text of its section"} is never cut whole)`
        : "say it once";
      out.push({ ref: target.ref, tell: "repeated_phrase", example: `"${p.run}" is also said in [${other.ref}]; ${how}`, piece: pieceOfUnit(target) });
    }
  }
  return out;
}

/** A line, the way the step compares it word for word: tags out, quotes and apostrophes straightened, punctuation kept. */
const lineText = (t: string) => t.replace(MARK_RE, " ").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();

/** Whether `line` still stands in `text` exactly (an em dash or an emoji taken out of it counts as a change). */
export function stillStands(text: string, line: string): boolean {
  const l = lineText(line).replace(/[.!?…]+$/, "");
  return !!l && lineText(text).includes(l);
}

/**
 * The points of a short piece the editor mapped to two lines or more that still stand together: in one piece (an
 * email of a sequence, an ad of a set) and one reading (an alternative opening is read with the sections, never with
 * another opening). A CTA, a price, a guarantee, a caption, a P.S. and a display field may restate the offer and are
 * left out. For each open point, the lines to change: every standing line but the one to keep (the line whose
 * sentence carries a ledger tag, else the first).
 */
export function openPoints(points: { point: string; lines: { ref: string; line: string }[] }[], units: EditUnit[], draft: DraftOutput, spec: FormatSpec): { point: string; lines: { ref: string; line: string }[] }[] {
  if (!REPEAT_FAMILIES.has(spec.family)) return [];
  const leadId = editsLeads(draft, spec);
  const out: { point: string; lines: { ref: string; line: string }[] }[] = [];
  const refOf = (r: string) => r.trim().replace(/^\[|\]$/g, "");
  for (const p of points) {
    const standing = p.lines
      .map((l) => ({ l: { ref: refOf(l.ref), line: l.line }, u: units.find((x) => x.ref === refOf(l.ref)) }))
      .filter((x): x is { l: { ref: string; line: string }; u: EditUnit } => !!x.u && x.u.type !== "testimonial" && !REPEAT_SKIP.has(x.u.type) && !DISPLAY_TYPES.has(x.u.type) && stillStands(x.u.text, x.l.line));
    // group by piece; within a piece an opening's lines read with the sections' lines, never with another opening's
    const byPiece = new Map<string, typeof standing>();
    for (const s of standing) {
      const piece = pieceOfSection(s.u.owner === "lead" ? leadId ?? s.u.ownerId : s.u.ownerId, spec);
      byPiece.set(piece, [...(byPiece.get(piece) ?? []), s]);
    }
    for (const group of byPiece.values()) {
      const openings = new Set(group.filter((s) => s.u.owner === "lead").map((s) => s.u.ownerId));
      const readings = openings.size ? Array.from(openings).map((o) => group.filter((s) => s.u.owner !== "lead" || s.u.ownerId === o)) : [group];
      const toChange = new Map<string, { ref: string; line: string }>();
      for (const r of readings) {
        if (r.length < 2) continue;
        const keep = r.find((s) => sentenceTagged(s.u.text, s.l.line)) ?? r[0];
        for (const s of r) if (s !== keep) toChange.set(`${s.l.ref}\u0000${s.l.line}`, s.l);
      }
      if (toChange.size) out.push({ point: p.point, lines: Array.from(toChange.values()) });
    }
  }
  return out;
}

/** Blocks that carry the offer's own wording. */
const OFFER_LINE_TYPES = new Set<Block["type"]>(["price", "guarantee", "disclosure", "cta", "button", "field"]);

/** Ledger rows whose wording the copy keeps as written: prices, the trial, the deadline, a free tier and the market's verbatims. */
const EXACT_WORDING_TYPES = new Set(["price_discount", "continuity_trial", "scarcity_urgency", "free", "audience_language", "results_testimonial", "experience_testimonial", "expert_endorsement"]);
/** Words in a row copied from a ledger row before it is the row's wording, not the speaker's. */
const LEDGER_RUN = 7;

function longestCommonRun(a: string[], b: string[]): string[] {
  let best = 0, end = 0;
  let prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        if (cur[j] > best) [best, end] = [cur[j], i];
      }
    }
    prev = cur;
  }
  return a.slice(end - best, end);
}

/**
 * Lines that copy a ledger row's wording, seven words or more in a row (rule 11: a row is the fact, not the wording),
 * as findings for the editor on the text that copies. Prices, the trial, the deadline, verbatims and the user's
 * accepted wording ("rewrite") stay as written; so does a guarantee outside a short piece (a page repeats its sentence).
 */
export function ledgerWordingFindings(units: EditUnit[], claims: { id: string; claim_type: string; claim_text: string; user_decision: string | null; role?: string | null }[], spec: FormatSpec): { ref: string; tell: string; example: string }[] {
  // a guarantee keeps its sentence on a page that takes payment and is said in the speaker's words elsewhere (rule 16);
  // every other offer term keeps its wording
  const exact = (c: { claim_type: string; role?: string | null }) =>
    c.claim_type === "guarantee" ? !ONE_LINE_OFFER_FAMILIES.has(spec.family) : EXACT_WORDING_TYPES.has(c.claim_type) || c.role === "offer_term";
  const rows = claims.filter((c) => c.claim_text && c.user_decision !== "drop" && c.user_decision !== "rewrite" && !exact(c)).map((c) => ({ id: c.id, words: runWords(c.claim_text) }));
  const out: { ref: string; tell: string; example: string }[] = [];
  for (const u of units) {
    // the offer's own lines (a price, the guarantee, a CTA, a disclosure) keep the offer's wording
    if (u.type === "testimonial" || OFFER_LINE_TYPES.has(u.type)) continue;
    // a quotation keeps its words: only the copy's own sentences are measured
    const w = runWords(blankQuotes(u.text));
    let longest: string[] = [];
    for (const r of rows) {
      const run = longestCommonRun(w, r.words);
      if (run.length > longest.length) longest = run;
    }
    // a run that carries an amount is the offer's figure, kept as written
    if (longest.length >= LEDGER_RUN && !(/[$€£¥]\s?\d/.test(u.text) && longest.some((w) => /\d/.test(w)))) out.push({ ref: u.ref, tell: "ledger_wording", example: `"${longest.join(" ")}" copies a ledger row's wording; say the fact the way you would to one reader, its numbers and tag kept` });
  }
  return out;
}

/**
 * Slogan couplets that span texts ("A keyword tool settles neither." … "Legiit Keywords settles both."), read the way
 * the reader reads the piece (as repeatFindings does: the chosen opening with the sections, each alternative in its
 * place, never two openings together), handed to the editor on the text that answers.
 */
export function coupletFindings(units: EditUnit[], draft: DraftOutput, spec: FormatSpec): { ref: string; tell: string; example: string }[] {
  const leadId = editsLeads(draft, spec);
  const leadIds = Array.from(new Set(units.filter((u) => u.owner === "lead").map((u) => u.ownerId)));
  const chosen = draft.chosen_lead_id && leadIds.includes(draft.chosen_lead_id) ? draft.chosen_lead_id : null;
  const pieceOfUnit = (u: EditUnit) => pieceOfSection(u.owner === "lead" ? leadId ?? u.ownerId : u.ownerId, spec);
  const out: { ref: string; tell: string; example: string }[] = [];
  const seen = new Set<string>();
  for (const lead of [chosen, ...leadIds.filter((l) => l !== chosen)]) {
    const reading = draft.sections.flatMap((s) => (s.section_id === leadId ? units.filter((u) => u.owner === "lead" && u.ownerId === lead) : units.filter((u) => u.owner === "section" && u.ownerId === s.section_id)));
    for (const p of sloganCoupletPairs(reading.map((u) => ({ text: u.text, type: u.type, piece: pieceOfUnit(u) })))) {
      const later = reading[p.later], first = reading[p.first];
      // an alternative opening takes the finding only when it holds a half; the body's couplet is the chosen reading's
      if (lead !== chosen && later.owner !== "lead" && first.owner !== "lead") continue;
      const key = `${later.ref}\u0000${p.match}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ref: later.ref, tell: "slogan_couplet", example: `"${p.match}" answers a line in [${first.ref}]; say what the product does that the other does not, plainly, once` });
    }
  }
  return out;
}

/** The piece's sentence-length variation when it runs flat against the format's floor (§7.1 "vary sentence length"), else null. */
export function flatCadence(draft: DraftOutput, spec: FormatSpec): { cv: number; floor: number } | null {
  // the piece as the reader sees it: the lead section carries the chosen (or provisional) lead
  const r = analyzeDraft(draft.sections, spec);
  return r.cadence_flag && r.cadence_cv !== null ? { cv: r.cadence_cv, floor: spec.cadence_floor_cv } : null;
}

/** Per text, the owner's tells the checker sees in it: the editor's starting list, never the whole of its job. */
export function unitFindings(units: EditUnit[], spec: FormatSpec, exemptTerms: string[]): { ref: string; tell: string; example: string }[] {
  const out: { ref: string; tell: string; example: string }[] = [];
  for (const u of units) {
    if (u.type === "testimonial") continue;
    const block: Block = { id: u.ref, type: u.item === null ? u.type : "paragraph", text: u.text, items: null, meta: null };
    const r = analyzeDraft([{ section_id: "unit", title: null, blocks: [block] }], spec, { exemptTerms });
    // repeats and couplets are piece-level findings (repeatFindings, coupletFindings)
    for (const f of r.flags) if (OWNER.has(f.tell) && f.tell !== "repeated_phrase" && f.tell !== "slogan_couplet") out.push({ ref: u.ref, tell: f.tell, example: f.examples[0] ?? "" });
  }
  return out;
}
