/**
 * HTML to the page's copy with its layout kept: headings as "# ", buttons as "[Button] ", fields as "[Field] ", the
 * nav and footer folded to one line each, lists as "- ", everything else in reading order. Where a line sits on the
 * page is part of what the page says (the headline, the first button, what the order form asks). The browser read
 * (apps/web/src/lib/page-outline.ts) writes the same marks from the live DOM; this is the no-DOM version an edge
 * function runs over fetched markup, so the rules are regular expressions and settle for the attributes they can see.
 */
import { normalizeWhitespace } from "./http.ts";

export function looksLikeHtml(s: string): boolean {
  return /<(?:!doctype\s+html|html|body|head|div|p|article|section)[\s>]/i.test(s.slice(0, 5000));
}

/** One attribute's raw value from a tag's attribute string (entities are decoded with the rest at the end). */
function attr(attrs: string, name: string): string {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(attrs);
  return (m?.[1] ?? m?.[2] ?? m?.[3] ?? "").replace(/\/$/, "").trim();
}

/** A run that is shaped like a tag; a bare "<" in copy (5 < 6) is not one. */
const TAG = /<[a-zA-Z/!?][^>]*>/g;

/** The words inside a tag's body, on one line. */
function inner(body: string): string {
  return body.replace(TAG, " ").replace(/\s+/g, " ").trim();
}

function fieldLine(attrs: string, tag: string): string {
  return `\n[Field] ${attr(attrs, "aria-label") || attr(attrs, "placeholder") || attr(attrs, "name") || tag}\n`;
}

function buttonLine(label: string): string {
  const t = label.replace(/\s+/g, " ").trim();
  return t ? `\n[Button] ${t}\n` : " ";
}

export function htmlToText(html: string): string {
  let h = html.replace(/\r\n?/g, "\n");
  h = h.replace(/<!--[\s\S]*?-->/g, " ");
  h = h.replace(/<(svg|iframe|object|canvas|a)\b[^>]*\/>/gi, " "); // self-closed: no body to swallow
  h = h.replace(/<(script|style|noscript|template|svg|canvas|iframe|object|head|datalist|dialog)\b[\s\S]*?<\/\1\s*>/gi, " ");
  h = h.replace(/<aside\b[\s\S]*?<\/aside\s*>/gi, " ");
  // a heading is folded whole first: a question that is also a button (an accordion) stays the heading it is
  h = h.replace(/<h([1-6])\b[^>]*>((?:(?!<h[1-6]\b)[\s\S]){0,20000}?)<\/h\1\s*>/gi, (_, n: string, body: string) => `\n\n${"#".repeat(Number(n))} ${inner(body)}\n\n`);
  // the nav and the footer are where they are, in one line each; the body copy keeps the room
  h = h.replace(/<(nav|footer)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi, (_, tag: string, body: string) => {
    const t = inner(body).slice(0, 400);
    return t ? `\n\n[${tag.toLowerCase() === "nav" ? "Nav" : "Footer"}] ${t}\n\n` : " ";
  });
  // forms stay: what an order form or an opt-in asks for, and what its button says, is the page
  h = h.replace(/<select\b([^>]*)>[\s\S]*?<\/select\s*>/gi, (_, a: string) => fieldLine(a, "select"));
  h = h.replace(/<textarea\b([^>]*)>[\s\S]*?<\/textarea\s*>/gi, (_, a: string) => fieldLine(a, "textarea"));
  h = h.replace(/<input\b([^>]*)>/gi, (_, a: string) => {
    const type = (attr(a, "type") || "text").toLowerCase();
    if (/^(submit|button|reset|image)$/.test(type)) return buttonLine(attr(a, "value") || attr(a, "aria-label"));
    if (/^(hidden|checkbox|radio)$/.test(type)) return " ";
    return fieldLine(a, "input");
  });
  // bodies stop at the next tag of their own name, so an unclosed anchor or a card of nested divs cannot swallow the page
  h = h.replace(/<button\b[^>]*>((?:(?!<button\b)[\s\S]){0,20000}?)<\/button\s*>/gi, (_, body: string) => buttonLine(inner(body)));
  h = h.replace(/<a\b([^>]*)>((?:(?!<a\b)[\s\S]){0,20000}?)<\/a\s*>/gi, (m, a: string, body: string) => {
    const styledAsButton = /(?:^|\s)role\s*=\s*["']?button/i.test(a) || /(?:^|[\s_-])(?:btn|button|cta)(?:[\s_-]|$)/i.test(attr(a, "class"));
    return styledAsButton ? buttonLine(inner(body)) : m;
  });
  h = h.replace(/<(div|span)\b([^>]*\srole\s*=\s*["']?button[^>]*)>((?:(?!<\1\b)[\s\S]){0,20000}?)<\/\1\s*>/gi, (_, _tag: string, _a: string, body: string) => buttonLine(inner(body)));
  h = h.replace(/<img\b([^>]*)>/gi, (_, a: string) => {
    const alt = attr(a, "alt");
    return alt.length >= 3 && !/\.(?:png|jpe?g|gif|webp|svg)$/i.test(alt) ? `\n[Image] ${alt}\n` : " ";
  });
  h = h.replace(/<br\s*\/?>/gi, "\n");
  h = h.replace(/<h([1-6])\b[^>]*>/gi, (_, n: string) => `\n\n${"#".repeat(Number(n))} `); // an unclosed heading
  h = h.replace(/<\/?(li)\b[^>]*>/gi, (t) => (t.startsWith("</") ? "\n" : "\n- "));
  h = h.replace(/<\/(p|div|h[1-6]|tr|blockquote|section|article|header|main|form|fieldset|ul|ol|table|pre|figure|figcaption|dd|dt)\s*>/gi, "\n\n");
  h = h.replace(/<(h[1-6]|p|div|tr|blockquote|section|article|header|main|form|fieldset|pre)\b[^>]*>/gi, "\n");
  h = h.replace(/<\/(td|th)\s*>/gi, " | ");
  h = h.replace(/<\/?(?:a|abbr|b|bdi|bdo|cite|code|data|del|dfn|em|font|i|ins|kbd|label|mark|q|s|samp|small|span|strike|strong|sub|sup|time|tt|u|var|wbr)\b[^>]*>/gi, ""); // inline: no space
  h = h.replace(TAG, " ");
  h = decodeEntities(h);
  h = h.replace(/[ \t]*\|[ \t]*\n/g, "\n"); // the row's last cell closes the line
  h = h.replace(/\n-[ \t]*\n+(?=\S)/g, "\n- "); // a list item that opens with a block (li > p, li > h3) keeps its dash
  h = h.replace(/\n#{1,6} ?\n/g, "\n"); // an empty heading
  h = normalizeWhitespace(h.replace(/[ \t]+\n/g, "\n"));
  return h.replace(/(?<=(?:^|\n)- [^\n]*)\n\n(?=- )/g, "\n"); // list items sit together
}

export function titleOf(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!m) return null;
  const t = normalizeWhitespace(decodeEntities(m[1]));
  return t ? t.slice(0, 200) : null;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  copy: "©",
  reg: "®",
  trade: "™",
  bull: "•",
  middot: "·",
  laquo: "«",
  raquo: "»",
  deg: "°",
  times: "×",
  euro: "€",
  pound: "£",
  cent: "¢",
  shy: "",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    const v = NAMED_ENTITIES[body.toLowerCase()];
    return v === undefined ? whole : v;
  });
}
