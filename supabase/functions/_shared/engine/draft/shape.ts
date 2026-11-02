/**
 * The shape of this one: the rhythm a piece is written in, drawn at random for the piece from the ranges human
 * direct response copy lives in (research/tells/human_calibration_report.md: sentence-length spread, the share of
 * sentences of four words or fewer, questions, paragraph lengths) and fixed by the generation's id, so a retry
 * draws the same shape and no two pieces share one (docs/04 Section 13). The writer reads it as counts, never as
 * adjectives; the mechanical pass measures the spread. A fixed rule ("one fragment, one long sentence") would be a
 * pattern of its own; a draw is not.
 */
import type { FormatSpec } from "../formats/spec.ts";
import type { Section } from "../schemas/draft.ts";
import { itemShape } from "./plan.ts";

export interface Shape {
  /** the item this shape is for (0 for a single piece) */
  item: number;
  /** target mean words per sentence */
  mean: number;
  /** target spread: sentence-length coefficient of variation */
  spread: number;
  /** share of sentences of four words or fewer */
  short_share: number;
  /** sentences past twenty-five words, per piece (short families) or per 300 words (pages) */
  long: number;
  /** questions left for the reader, per piece or per 300 words */
  questions: number;
  /** paragraphs of one sentence, per piece or per 300 words */
  one_line_paragraphs: number;
  /** sentences in the longest paragraph */
  longest_paragraph: number;
  /** how often he contracts (I've, don't) where the words allow it */
  contractions: "few" | "about half" | "most";
  /** where the product's name arrives, as a share of the words before it (formats with the gate only) */
  product_at: number | null;
  /** how the piece ends */
  close: "the step, and nothing after it" | "the step, then one fact he did not have" | "the step, then one short flat line";
  /** counts are per piece (false) or per 300 words (true, long families) */
  per_300: boolean;
}

interface Range {
  mean: [number, number];
  spread: [number, number];
  short_share: [number, number];
  long: [number, number];
  questions: [number, number];
  one_line_paragraphs: [number, number];
  longest_paragraph: [number, number];
  per_300: boolean;
}

/** Human ranges by family (calibration report lines 46, 47, 84, 275): spread is social 0.50 to 0.92, email 0.50 to 0.84, pages 0.71 to 1.10; fragments 29% of human sentences. */
export const SHAPE_RANGES: Record<FormatSpec["family"], Range> = {
  social: { mean: [10, 15], spread: [0.55, 0.9], short_share: [0.15, 0.4], long: [0, 2], questions: [0, 2], one_line_paragraphs: [1, 6], longest_paragraph: [3, 6], per_300: false },
  email: { mean: [10, 15], spread: [0.5, 0.85], short_share: [0.15, 0.4], long: [0, 2], questions: [0, 2], one_line_paragraphs: [0, 4], longest_paragraph: [3, 6], per_300: false },
  page: { mean: [11, 16], spread: [0.7, 1.05], short_share: [0.15, 0.35], long: [1, 3], questions: [0, 2], one_line_paragraphs: [1, 3], longest_paragraph: [3, 7], per_300: true },
  commerce: { mean: [11, 16], spread: [0.7, 1.05], short_share: [0.15, 0.35], long: [1, 3], questions: [0, 2], one_line_paragraphs: [1, 3], longest_paragraph: [3, 7], per_300: true },
  video: { mean: [8, 13], spread: [0.55, 0.9], short_share: [0.2, 0.45], long: [0, 1], questions: [0, 1], one_line_paragraphs: [0, 2], longest_paragraph: [2, 5], per_300: false },
  audio: { mean: [8, 13], spread: [0.55, 0.9], short_share: [0.2, 0.45], long: [0, 1], questions: [0, 1], one_line_paragraphs: [0, 2], longest_paragraph: [2, 5], per_300: false },
  ad: { mean: [8, 13], spread: [0.5, 0.9], short_share: [0.2, 0.5], long: [0, 1], questions: [0, 1], one_line_paragraphs: [0, 1], longest_paragraph: [2, 4], per_300: false },
  message: { mean: [7, 12], spread: [0.5, 0.9], short_share: [0.2, 0.5], long: [0, 0], questions: [0, 1], one_line_paragraphs: [0, 1], longest_paragraph: [1, 3], per_300: false },
};

const CLOSES: Shape["close"][] = ["the step, and nothing after it", "the step, then one fact he did not have", "the step, then one short flat line"];
const CONTRACTIONS: Shape["contractions"][] = ["few", "about half", "most"];

/** FNV-1a over the seed string, then mulberry32: small, fast, the same on every run. */
export function seededRandom(seed: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (r: () => number, [lo, hi]: [number, number]) => lo + r() * (hi - lo);
const intBetween = (r: () => number, [lo, hi]: [number, number]) => lo + Math.floor(r() * (hi - lo + 1));
const round = (x: number, places: number) => Math.round(x * 10 ** places) / 10 ** places;

/** The floor the format's gate puts under the product's first mention, when it has one. */
export function productFloor(spec: FormatSpec): number | null {
  for (const g of spec.hard_gates) {
    const m = /product_first_share>=([0-9.]+)/.exec(g);
    if (m) return Number(m[1]);
  }
  return null;
}

/** The shape for one item of a generation: the same id and item always draw the same shape. */
export function shapeFor(generationId: string, spec: FormatSpec, item = 0): Shape {
  const r = seededRandom(`${generationId}:${spec.id}:${item}`);
  const range = SHAPE_RANGES[spec.family];
  const floor = productFloor(spec);
  return {
    item,
    mean: Math.round(between(r, range.mean)),
    spread: round(between(r, range.spread), 2),
    short_share: round(between(r, range.short_share), 2),
    long: intBetween(r, range.long),
    questions: intBetween(r, range.questions),
    one_line_paragraphs: intBetween(r, range.one_line_paragraphs),
    longest_paragraph: intBetween(r, range.longest_paragraph),
    contractions: CONTRACTIONS[intBetween(r, [0, CONTRACTIONS.length - 1])],
    product_at: floor === null ? null : round(between(r, [floor, Math.max(floor, 0.6)]), 2),
    close: CLOSES[intBetween(r, [0, CLOSES.length - 1])],
    per_300: range.per_300,
  };
}

/** The item indexes a set of sections carries (`subject#3` is item 3; unsuffixed sections are item 0), in order. */
export function itemIndexes(sections: { section_id: string }[]): number[] {
  const seen = new Set<number>();
  for (const s of sections) {
    const m = /#(\d+)$/.exec(s.section_id);
    seen.add(m ? Number(m[1]) : 0);
  }
  return [...seen].sort((a, b) => a - b);
}

/** The shapes for the items a call or a draft holds. */
export function shapesFor(generationId: string, spec: FormatSpec, items: number[]): Shape[] {
  return (items.length ? items : [0]).map((i) => shapeFor(generationId, spec, i));
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** The words one item of the piece runs to: the sections' bands for a piece whose sections repeat per item, else the piece's band. */
export function itemWords(spec: FormatSpec): number {
  const mid = (lo: number, hi: number) => (lo + hi) / 2;
  if (spec.multi_item && itemShape(spec).kind === "repeat_all") return spec.sections.reduce((n, s) => n + mid(s.band_words[0], s.band_words[1]), 0);
  return mid(spec.length_band_words[0], spec.length_band_words[1]);
}

/** The expected sentence count of one item at this mean. */
function expectedSentences(spec: FormatSpec, mean: number): number {
  return Math.max(3, Math.round(itemWords(spec) / mean));
}

/** One shape as the writer reads it: counts, not adjectives. */
export function shapeLine(shape: Shape, spec: FormatSpec, itemName: string | null = null): string {
  const unit = shape.per_300 ? " in every 300 words" : "";
  const n = shape.per_300 ? Math.round(300 / shape.mean) : expectedSentences(spec, shape.mean);
  const shortCount = Math.max(1, Math.round(n * shape.short_share));
  const parts = [
    `sentences average about ${shape.mean} words, with a spread of ${shape.spread} (the standard deviation over the mean; a machine measures it)`,
    `about ${plural(shortCount, "sentence")} of four words or fewer${unit}, where he would say the short thing`,
    shape.long ? `${plural(shape.long, "sentence")} past twenty-five words${unit}, where one thought runs on` : `no sentence past twenty-five words`,
    shape.questions ? `${plural(shape.questions, "question")}${unit}, left for him to answer` : `no questions`,
    shape.one_line_paragraphs ? `${plural(shape.one_line_paragraphs, "paragraph")} of one sentence${unit}` : `no paragraph of one sentence`,
    `the longest paragraph ${plural(shape.longest_paragraph, "sentence")}`,
    `contractions in ${shape.contractions} of the places they fit`,
    shape.product_at !== null ? `the product named after about ${pct(shape.product_at)} of the words` : "",
    `the close: ${shape.close}`,
  ].filter(Boolean);
  return `${itemName ? `${itemName}: ` : ""}${parts.join("; ")}.`;
}

/** The shape block of the material: one line per item the call or the draft holds. */
export function shapeText(generationId: string, spec: FormatSpec, items: number[]): string {
  const shapes = shapesFor(generationId, spec, items);
  const name = spec.multi_item?.item_name ?? "item";
  const lines = shapes.map((s) => shapeLine(s, spec, shapes.length > 1 || s.item > 0 ? `${name} ${s.item}` : null));
  return [
    `THE SHAPE OF THIS ONE (drawn for this piece; another piece draws another; the counts are targets, hit them within one or two, and never pad or clip a sentence to hit one):`,
    ...lines.map((l) => `- ${l}`),
  ].join("\n");
}

/** The items a draft's sections hold, for the revision's shape block. */
export function shapeTextForDraft(generationId: string, spec: FormatSpec, sections: Section[]): string {
  return shapeText(generationId, spec, itemIndexes(sections));
}
