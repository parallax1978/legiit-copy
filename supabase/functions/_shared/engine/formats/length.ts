/**
 * The user's length choice, applied to a format spec before any step reads it. "longer" raises each section's
 * band (and raises its floor, so the writer fills it rather than stopping at the old middle); "shorter" lowers
 * both. Tiny sections (subject lines, CTAs, headlines) and platform-capped families (ads, messages) are left
 * alone: their limits come from the platform, not from taste.
 */
import type { FormatSpec, SectionSpec } from "./spec.ts";

export type LengthChoice = "shorter" | "standard" | "longer";

const MIN_SCALABLE_UPPER = 40;
const FIXED_FAMILIES = new Set<FormatSpec["family"]>(["ad", "message"]);

function scaleBand([lo, hi]: [number, number], length: LengthChoice): [number, number] {
  if (length === "longer") {
    const newHi = Math.round(hi * 1.5);
    return [Math.max(lo, Math.round(hi * 0.7)), newHi];
  }
  if (length === "shorter") {
    const newLo = Math.round(lo * 0.6);
    return [newLo, Math.max(newLo + 10, Math.round(hi * 0.6))];
  }
  return [lo, hi];
}

export function withLength(spec: FormatSpec, length?: LengthChoice | null): FormatSpec {
  if (!length || length === "standard" || FIXED_FAMILIES.has(spec.family)) return spec;
  const sections: SectionSpec[] = spec.sections.map((s) => (s.band_words[1] >= MIN_SCALABLE_UPPER ? { ...s, band_words: scaleBand(s.band_words, length) } : s));
  return { ...spec, sections, length_band_words: scaleBand(spec.length_band_words, length) };
}
