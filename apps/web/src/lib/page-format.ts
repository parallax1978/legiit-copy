/**
 * The page a URL most likely is, from its text: the format the rewrite starts from. A guess the user confirms, never
 * a decision; the rules are plain string tests so the user can see why the guess was made.
 */
import type { FormatId } from "@engine/schemas/common.ts";

/** The formats a page on a site can be rewritten as, in the order the picker shows them. */
export const REWRITE_FORMATS: FormatId[] = ["landing_page_short", "sales_letter", "optin", "product_description", "pricing_page", "advertorial", "upsell", "thank_you", "order_form"];

/** A page that gave back fewer words than this was not read (an app that draws itself in the browser, a login wall, a blocked fetch). */
export const MIN_PAGE_WORDS = 80;

const FOLD_LINE = /^\[(?:Nav|Footer)\] /;
const MARK_PREFIX = /^(?:#{1,6}|-|>|---|\[(?:Button|Field|Image)\])\s*/;

/**
 * The page's own copy out of a read that keeps the layout as marks (html_text.ts, page-outline.ts): the nav and footer
 * folds dropped, the marks stripped. A site's menu and legal line are not the page, and a mark is not a word: a shell
 * with a long menu stays under the floor, and a nav's "Pricing" link does not make the page a pricing page.
 */
export function pageBody(text: string): string {
  return text.replace(/\r\n?/g, "\n").split("\n").filter((l) => !FOLD_LINE.test(l)).map((l) => l.replace(MARK_PREFIX, "").replace(/ \| /g, " ")).join("\n");
}

export function pageWords(text: string): number {
  const b = pageBody(text).trim();
  return b ? b.split(/\s+/).length : 0;
}

/** The first words of the page's own copy, for the form: the headline and what follows it, never the menu. */
export function pageExcerpt(text: string, max = 280): string | null {
  const body = pageBody(text).split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
  return body ? body.slice(0, max) : null;
}

export function guessPageFormat(text: string, url = ""): FormatId {
  const t = pageBody(text).toLowerCase();
  const u = url.toLowerCase();
  const words = pageWords(text);
  const prices = (t.match(/[$€£]\s?\d[\d,]*(?:\.\d+)?/g) ?? []).length;
  const perPeriod = /(?:\/|\bper\s+|\ba\s+)(?:month|mo\b|year|yr\b)/.test(t);
  if (/\/(?:pricing|plans)\b/.test(u) || (perPeriod && prices >= 2 && /\b(?:plans?|pricing)\b/.test(t))) return "pricing_page";
  if (/\/(?:thank|thanks|confirm)/.test(u) || (/\bthank(?:s| you) for (?:signing|joining|subscribing|your order|ordering)\b/.test(t) && words < 600)) return "thank_you";
  if (/\/(?:checkout|cart|order)\b/.test(u) || /\b(?:card number|billing address|place (?:your )?order|complete (?:your )?order)\b/.test(t)) return "order_form";
  if (/\b(?:add to (?:cart|bag)|buy now|in stock|free shipping)\b/.test(t) && words < 1500) return "product_description";
  if (/\b(?:add (?:this|it) to (?:your|my) order|one.time offer|yes,? add)\b/.test(t) && words < 1200) return "upsell";
  if (/\b(?:enter your email|get the free|free (?:guide|checklist|template|ebook|report|training)|download (?:the|your|my))\b/.test(t) && words < 700) return "optin";
  if (/\b(?:advertorial|sponsored content|paid advertisement)\b/.test(t) && words > 600) return "advertorial";
  if (words >= 1800) return "sales_letter";
  return "landing_page_short";
}
