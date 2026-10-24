import { marked, type Token, type Tokens } from "marked";

/** http(s), mailto, same-document anchors and relative paths. Everything else (javascript:, data:, vbscript:, file:) is dropped. */
const SAFE_URL = /^(?:https?:|mailto:|#|\/(?!\/)|\.{1,2}\/|[a-z0-9_-]+(?:\/|$))/i;

function safeHref(href: string | null | undefined): string {
  const h = (href ?? "").trim();
  return SAFE_URL.test(h) ? h : "#";
}

function neutralizeUrls(token: Token): void {
  if (token.type === "link" || token.type === "image") {
    const t = token as Tokens.Link | Tokens.Image;
    t.href = safeHref(t.href);
  }
}

/**
 * Markdown written by the model or by a user → HTML for dangerouslySetInnerHTML. Raw HTML in the source is shown
 * literally (angle brackets escaped before parsing; marked itself does not sanitize), and link and image URLs are
 * limited to safe schemes. Use this for every untrusted markdown that is rendered as HTML.
 */
export function renderMarkdownSafe(source: string, opts: { breaks?: boolean } = {}): string {
  const escaped = source.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return marked.parse(escaped, { async: false, gfm: true, breaks: opts.breaks ?? true, walkTokens: neutralizeUrls }) as string;
}
