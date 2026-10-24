/**
 * Redirect targets that arrive from the request (`?next=`, `return_to`, a server-action argument) are only honored
 * when they are a same-origin absolute path: one leading "/", not "//" or "/\" (protocol-relative, which browsers
 * treat as another host), no scheme, no control characters. Anything else falls back.
 */
export function safeInternalPath(candidate: string | null | undefined, fallback = "/app"): string {
  if (!candidate) return fallback;
  if (!/^\/(?![/\\])/.test(candidate)) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(candidate)) return fallback;
  return candidate;
}
