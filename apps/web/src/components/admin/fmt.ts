/** Formatting helpers for admin tables. Pure; safe in server and client components. */

export function money(n: number | string | null | undefined, digits = 2) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "$0.00";
  if (v !== 0 && Math.abs(v) < 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function int(n: number | string | null | undefined) {
  return Number(n ?? 0).toLocaleString("en-US");
}

export function pct(n: number | string | null | undefined, digits = 0) {
  const v = Number(n ?? 0);
  return `${(v * 100).toFixed(digits)}%`;
}

export function ms(n: number | null | undefined) {
  const v = Number(n ?? 0);
  if (v >= 60_000) return `${(v / 60_000).toFixed(1)} min`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)} s`;
  return `${Math.round(v)} ms`;
}

export function shortDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function dayOnly(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function ago(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "";
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ${m % 60} min`;
  return `${Math.floor(h / 24)} d`;
}

export function shortId(id: string | null | undefined) {
  return id ? id.slice(0, 8) : "";
}

export function truncate(s: string | null | undefined, n = 80) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function jsonPretty(v: unknown) {
  try {
    return JSON.stringify(v ?? null, null, 2);
  } catch {
    return String(v);
  }
}

export function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))) : [];
}

export function titleCase(s: string | null | undefined) {
  return (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
