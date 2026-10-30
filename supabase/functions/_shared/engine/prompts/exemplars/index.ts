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

/** The exemplars as the writer reads them. */
export function exemplarsText(family: FormatSpec["family"], pieceName: string): string {
  const xs = exemplarsFor(family);
  if (!xs.length) return "";
  const body = xs.map((x, i) => `--- ${i + 1}. In ${x.master}'s manner. The move: ${x.move}\n\n${x.text}${x.first_comment ? `\n\nFirst comment: ${x.first_comment}` : ""}`).join("\n\n");
  return `HOW THIS KIND OF PIECE READS WHEN IT IS RIGHT (${pieceName.toLowerCase()}s from other trades, other products, every fact theirs; study the moves, never reuse a sentence or a fact):\n\n${body}`;
}
