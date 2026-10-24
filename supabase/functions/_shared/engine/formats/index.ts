// Registry of format specs. Adding a format = add a spec file here; the pipeline never changes.
import type { FormatSpec } from "./spec.ts";
import type { FormatId } from "../schemas/common.ts";
import { email_single } from "./specs/email_single.ts";
import { sales_letter } from "./specs/sales_letter.ts";

export const FORMATS: Partial<Record<FormatId, FormatSpec>> = {
  email_single,
  sales_letter,
};

export function getFormat(id: FormatId): FormatSpec {
  const f = FORMATS[id];
  if (!f) throw new Error(`format spec missing: ${id}`);
  return f;
}
export function listFormats(): FormatSpec[] {
  return Object.values(FORMATS).filter((f): f is FormatSpec => !!f);
}
export type { FormatSpec, SectionSpec } from "./spec.ts";
