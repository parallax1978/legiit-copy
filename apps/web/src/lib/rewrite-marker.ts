/** The page a rewrite started from, kept in the offer's setup JSON under "rewrite" so the Rewrite page can list it and pick it up again. */
export interface RewriteMarker {
  url: string | null;
  pasted: boolean;
  started_at: string;
}

export function rewriteOf(setup: unknown): RewriteMarker | null {
  const r = setup && typeof setup === "object" && !Array.isArray(setup) ? (setup as Record<string, unknown>).rewrite : null;
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  return { url: typeof o.url === "string" ? o.url : null, pasted: o.pasted === true, started_at: typeof o.started_at === "string" ? o.started_at : "" };
}

/** An offer the Rewrite page made before the marker existed: named for the page's host ("example.com page") or "Pasted page". */
export function legacyRewrite(name: string, firstUrl: string | null): boolean {
  if (name === "Pasted page") return true;
  if (!firstUrl) return false;
  try {
    return name === `${new URL(firstUrl).hostname.replace(/^www\./, "")} page`;
  } catch {
    return false;
  }
}
