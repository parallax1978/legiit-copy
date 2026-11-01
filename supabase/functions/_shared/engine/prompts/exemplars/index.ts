/**
 * Whole pieces the drafter studies before it writes (docs/04 Section 11): originals from other trades, one per
 * master's move, keyed by format family. The writer reads them in the user message, after the material and before
 * the job, so the piece it writes reads like a piece and not like the rulebook. Never reproduced: the mechanical
 * check fails six words in a row from any exemplar.
 */
import type { FormatSpec } from "../../formats/spec.ts";
import { SOCIAL_EXEMPLARS } from "./social.ts";
import { EMAIL_EXEMPLARS } from "./email.ts";
import { AD_EXEMPLARS } from "./ad.ts";
import { VIDEO_EXEMPLARS } from "./video.ts";
import { MESSAGE_EXEMPLARS } from "./message.ts";

export interface Exemplar {
  master: string;
  /** the move the piece makes, in one line */
  move: string;
  /** the piece, as a reader sees it */
  text: string;
  /** the first comment, for formats that carry one */
  first_comment?: string;
}

export const EXEMPLARS_BY_FAMILY: Partial<Record<FormatSpec["family"], readonly Exemplar[]>> = {
  social: SOCIAL_EXEMPLARS,
  email: EMAIL_EXEMPLARS,
  ad: AD_EXEMPLARS,
  video: VIDEO_EXEMPLARS,
  message: MESSAGE_EXEMPLARS,
};

export function exemplarsFor(family: FormatSpec["family"]): readonly Exemplar[] {
  return EXEMPLARS_BY_FAMILY[family] ?? [];
}

/** Every exemplar text, for the mechanical check's six-words-in-a-row rule. */
export function allExemplarTexts(): string[] {
  return Object.values(EXEMPLARS_BY_FAMILY).flatMap((xs) => (xs ?? []).flatMap((x) => [x.text, ...(x.first_comment ? [x.first_comment] : [])]));
}

/** The exemplar in a master's manner for a family, else the nearest: the same master in another family. */
export function exemplarInManner(family: FormatSpec["family"], master: string): { exemplar: Exemplar; family: FormatSpec["family"] } | null {
  const own = exemplarsFor(family).find((x) => x.master === master);
  if (own) return { exemplar: own, family };
  for (const [fam, xs] of Object.entries(EXEMPLARS_BY_FAMILY) as [FormatSpec["family"], readonly Exemplar[] | undefined][]) {
    const x = (xs ?? []).find((e) => e.master === master);
    if (x) return { exemplar: x, family: fam };
  }
  return null;
}

/** The exemplars as the writer reads them; the piece's manner leads when one is given, with its exemplar from another family when the family has none in it. */
export function exemplarsText(family: FormatSpec["family"], pieceName: string, manner: string | null = null): string {
  const xs = [...exemplarsFor(family)];
  const lead = manner ? exemplarInManner(family, manner) : null;
  const ordered: { exemplar: Exemplar; note: string }[] = [];
  if (lead) {
    ordered.push({ exemplar: lead.exemplar, note: lead.family === family ? " (the manner this piece is written in)" : ` (the manner this piece is written in, shown on a ${lead.family} piece: the move carries over, the shape of this piece does not)` });
  }
  for (const x of xs) if (!lead || x !== lead.exemplar) ordered.push({ exemplar: x, note: "" });
  if (!ordered.length) return "";
  const body = ordered.map(({ exemplar: x, note }, i) => `--- ${i + 1}. In ${x.master}'s manner${note}. The move: ${x.move}\n\n${x.text}${x.first_comment ? `\n\nFirst comment: ${x.first_comment}` : ""}`).join("\n\n");
  return `HOW THIS KIND OF PIECE READS WHEN IT IS RIGHT (${pieceName.toLowerCase()}s from other trades, other products, every fact theirs; study the moves, never reuse a sentence or a fact):\n\n${body}`;
}
