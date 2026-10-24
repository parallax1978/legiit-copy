// Registry of format specs. Adding a format = add a spec file here; the pipeline never changes.
//
// Multi-item conventions (email_sequence, meta_ad, webinar_package replay emails, cold_email follow-ups):
// the draft repeats a spec section once per item and suffixes the section id with `#n` (1-based item index),
// e.g. `subject#3`, `primary_text#2`, `replay_email#5`. Unsuffixed sections belong to item 0 (the single asset,
// or "email one"). `tells.ts` strips the suffix when it matches sections to the spec and evaluates per-item gates.
import type { FormatSpec } from "./spec.ts";
import type { FormatId } from "../schemas/common.ts";
import { advertorial } from "./specs/advertorial.ts";
import { cold_email } from "./specs/cold_email.ts";
import { email_sequence } from "./specs/email_sequence.ts";
import { email_single } from "./specs/email_single.ts";
import { google_rsa } from "./specs/google_rsa.ts";
import { landing_page_short } from "./specs/landing_page_short.ts";
import { meta_ad } from "./specs/meta_ad.ts";
import { optin } from "./specs/optin.ts";
import { order_bump } from "./specs/order_bump.ts";
import { order_form } from "./specs/order_form.ts";
import { organic_social } from "./specs/organic_social.ts";
import { podcast_read } from "./specs/podcast_read.ts";
import { pricing_page } from "./specs/pricing_page.ts";
import { product_description } from "./specs/product_description.ts";
import { sales_letter } from "./specs/sales_letter.ts";
import { sms } from "./specs/sms.ts";
import { thank_you } from "./specs/thank_you.ts";
import { tiktok_reels } from "./specs/tiktok_reels.ts";
import { upsell } from "./specs/upsell.ts";
import { vsl_long } from "./specs/vsl_long.ts";
import { vsl_short } from "./specs/vsl_short.ts";
import { webinar_package } from "./specs/webinar_package.ts";
import { youtube_ad } from "./specs/youtube_ad.ts";

export const FORMATS: Record<FormatId, FormatSpec> = {
  sales_letter,
  landing_page_short,
  optin,
  upsell,
  order_bump,
  order_form,
  thank_you,
  email_single,
  email_sequence,
  webinar_package,
  vsl_long,
  vsl_short,
  meta_ad,
  youtube_ad,
  tiktok_reels,
  google_rsa,
  advertorial,
  organic_social,
  product_description,
  sms,
  cold_email,
  pricing_page,
  podcast_read,
};

export function getFormat(id: FormatId): FormatSpec {
  const f = FORMATS[id];
  if (!f) throw new Error(`format spec missing: ${id}`);
  return f;
}
export function listFormats(): FormatSpec[] {
  return Object.values(FORMATS);
}
/** Section id without the `#n` item suffix (see the multi-item convention above). */
export function sectionBaseId(sectionId: string): string {
  return sectionId.replace(/#\d+$/, "");
}
/** 1-based item index from a `#n` suffix; 0 for an unsuffixed section. */
export function sectionItemIndex(sectionId: string): number {
  const m = /#(\d+)$/.exec(sectionId);
  return m ? Number(m[1]) : 0;
}
export { SEQUENCE_ROLES } from "./specs/email_sequence.ts";
export type { FormatSpec, SectionSpec } from "./spec.ts";
