/**
 * Key pages of the client's own site, found from the landing page's links: terms, refund or guarantee, pricing,
 * about or team, FAQ, how it works. Intake reads them alongside the page the user gave, so the refund policy,
 * the founder's name and the plan terms come from the site instead of becoming questions for the user.
 */
export interface KeyPage {
  url: string;
  label: string;
}

const PATTERNS: { label: string; re: RegExp; rank: number }[] = [
  { label: "refund or guarantee", re: /refund|guarantee|money.?back/i, rank: 0 },
  { label: "terms", re: /\bterms\b|\btos\b|terms-of|conditions/i, rank: 1 },
  { label: "pricing", re: /pricing|\bprices?\b|\bplans?\b/i, rank: 2 },
  { label: "about or team", re: /\babout\b|\bteam\b|founder|our-story|who-we-are/i, rank: 3 },
  { label: "faq", re: /\bfaq|questions/i, rank: 4 },
  { label: "how it works", re: /how-it-works|how_it_works|howitworks/i, rank: 5 },
];

export const MAX_KEY_PAGES = 6;

/** Pages that never carry offer facts, whatever their link text says. */
const SKIP_PATH = /\/(login|log-in|signin|sign-in|signup|sign-up|register|account|cart|checkout|logout|auth|oauth|password|reset)(\/|$|\?)/i;

function sameSite(a: URL, b: URL): boolean {
  const strip = (h: string) => h.toLowerCase().replace(/^www\./, "");
  return strip(a.hostname) === strip(b.hostname);
}

/** Links in `html` (resolved against `base`) that look like key pages of the same site, best first, at most MAX_KEY_PAGES. */
export function discoverKeyPages(html: string, base: string, opts: { exclude?: string[]; max?: number } = {}): KeyPage[] {
  let baseUrl: URL;
  try {
    baseUrl = new URL(base);
  } catch {
    return [];
  }
  const exclude = new Set((opts.exclude ?? []).concat(base).map(normalize));
  const found = new Map<string, { label: string; rank: number }>();
  const re = /<a\b[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = (m[1] ?? m[2] ?? m[3] ?? "").trim();
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) continue;
    let url: URL;
    try {
      url = new URL(href, baseUrl);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol) || !sameSite(url, baseUrl)) continue;
    if (SKIP_PATH.test(url.pathname + "/")) continue;
    url.hash = "";
    const key = normalize(url.toString());
    if (exclude.has(key) || found.has(key)) continue;
    const text = m[4].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const probe = `${url.pathname} ${text}`;
    const hit = PATTERNS.find((p) => p.re.test(probe));
    if (!hit) continue;
    found.set(key, { label: hit.label, rank: hit.rank });
  }
  return [...found.entries()]
    .sort((a, b) => a[1].rank - b[1].rank || a[0].localeCompare(b[0]))
    .slice(0, opts.max ?? MAX_KEY_PAGES)
    .map(([url, v]) => ({ url, label: v.label }));
}

function normalize(u: string): string {
  try {
    const x = new URL(u);
    x.hash = "";
    x.hostname = x.hostname.toLowerCase().replace(/^www\./, "");
    let s = x.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  } catch {
    return u;
  }
}
