/**
 * The owner's never-rules in code (docs/04 §7.1, tells 11-13): em dashes, emojis and hashtags never ship. Pure string
 * functions with no engine imports beyond the detector's patterns, so the web app can apply them to a rewrite the
 * user accepts. The tell edit's backstop (draft/tell_edit.ts) runs them over every text of a draft.
 */
import { EMOJI_SOURCE, HASHTAG_SOURCE, LINK_SOURCE } from "../tells.ts";

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

/** One side of a range: a number with its currency, unit, time or ordinal ("3x", "1st"), a quarter, a weekday or a month, in full or short. */
const RANGE_ATOM = String.raw`(?:[$€£]?\d[\d,.:]*(?:\s?(?:%|k|x|am|pm|a\.m\.|p\.m\.)|st|nd|rd|th)?|Q[1-4]|(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day|(?:Mon|Tue|Tues|Wed|Thu|Thur|Thurs|Fri|Sat|Sun)\.?|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)`;
const RANGE_RE = new RegExp(`(?<![\\p{L}\\p{N}])(${RANGE_ATOM})(?:[ \\t]*(?:—|–|--)[ \\t]*|[ \\t]+-[ \\t]+)(${RANGE_ATOM})(?![\\p{L}\\p{N}])`, "gu");

/**
 * Em dashes, and a spaced en dash, double hyphen or spaced hyphen used as one: a range keeps an unspaced en dash ("9 am–5 pm"),
 * a dash at a line's start or end or against a quote mark goes, a pair in one sentence becomes parentheses, a
 * single one a comma. Links are left whole. Only the seams around each dash change.
 */
export function replaceEmDashes(text: string): string {
  if (!/—|\s–\s|--|\s-\s/.test(text)) return text;
  return outsideLinks(text, (seg) => {
    let t = seg.replace(RANGE_RE, "$1–$2");
    // a double hyphen between words is a dash; inside a code ("SAVE--20") it is part of the code
    t = t.replace(/(?<=\S)[ \t]+–[ \t]+(?=\S)/g, " — ").replace(/(?<=\S)[ \t]+--[ \t]+(?=\S)/g, " — ").replace(/(?<=[a-z\d])--(?=[a-z])|(?<=[a-z])--(?=\d)/g, "—");
    // a spaced hyphen between words is a dash typed with the hyphen key ("It works - fast.")
    t = t.replace(/(?<=[A-Za-zÀ-ÿ][,.!?"”’)]?)[ \t]+-[ \t]+(?=[A-Za-zÀ-ÿ"“(])/g, " — ");
    if (!t.includes("—")) return t;
    t = t.replace(/(^|\n)([ \t]*)—[ \t]*/g, "$1$2").replace(/[ \t]*—[ \t]*(?=\n|$)/g, "");
    // against a quote mark: a dash that closes or opens a quotation goes with no space inside it ("wait—”", "“—and"); one between a word and a quotation leaves a space
    t = t.replace(/[ \t]*—(?=[”"](?:\s|$|[.,;:!?)]))/g, "").replace(/(?<=(?:^|\s|\()[“"])—[ \t]*/g, "");
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
