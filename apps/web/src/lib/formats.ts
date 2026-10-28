import { FORMAT_IDS, type FormatId } from "@engine/schemas/common.ts";
import { FORMATS, listFormats, type FormatSpec } from "@engine/formats/index.ts";
export { FORMAT_IDS };
export type { FormatId, FormatSpec };

export type FormatFamily = FormatSpec["family"];

export const FAMILY_ORDER: FormatFamily[] = ["page", "email", "video", "ad", "social", "commerce", "message", "audio"];

export const FAMILY_LABELS: Record<FormatFamily, string> = {
  page: "Pages",
  email: "Email",
  video: "Video and webinar",
  ad: "Paid ads",
  social: "Social",
  commerce: "Commerce",
  message: "Messaging",
  audio: "Audio",
};

/** Names and families for every format id, used when a spec has not landed yet ("spec coming"). */
const CATALOG: Record<FormatId, { name: string; family: FormatFamily; description: string }> = {
  sales_letter: { name: "Long-form sales letter", family: "page", description: "The full argument for a considered purchase." },
  landing_page_short: { name: "Short landing page", family: "page", description: "One screen, one promise, one action." },
  optin: { name: "Opt-in page", family: "page", description: "Trade a specific piece of value for an address." },
  upsell: { name: "Upsell page", family: "page", description: "The next logical step for a buyer who just said yes." },
  order_bump: { name: "Order bump", family: "commerce", description: "A one-paragraph add-on at the order form." },
  order_form: { name: "Order form", family: "commerce", description: "The offer stated plainly where the money changes hands." },
  thank_you: { name: "Thank-you page", family: "page", description: "Confirm, set expectations, point to the next step." },
  email_single: { name: "Promotional email", family: "email", description: "One reader, one idea, one link." },
  email_sequence: { name: "Email sequence", family: "email", description: "A series that carries one argument across several sends." },
  webinar_package: { name: "Webinar package", family: "video", description: "Registration and confirmation pages, an invitation email, reminders, the presentation and the replay follow-up." },
  vsl_long: { name: "Long video sales letter", family: "video", description: "The sales letter, spoken." },
  vsl_short: { name: "Short video sales letter", family: "video", description: "A compact spoken pitch for warm traffic." },
  meta_ad: { name: "Meta ad set", family: "ad", description: "Primary text, headline and description variants." },
  youtube_ad: { name: "YouTube ad script", family: "ad", description: "A pre-roll script that earns the first five seconds." },
  tiktok_reels: { name: "TikTok / Reels script", family: "social", description: "A short vertical video script with a hook." },
  google_rsa: { name: "Google responsive search ad", family: "ad", description: "Headlines and descriptions within the character limits." },
  advertorial: { name: "Advertorial", family: "page", description: "An editorial-style page that earns the click to the offer." },
  organic_social: { name: "Organic social post", family: "social", description: "A post that argues one point without a link-first feel." },
  product_description: { name: "Product description", family: "commerce", description: "The product page copy that sells the specifics." },
  sms: { name: "SMS", family: "message", description: "A short message with one action." },
  cold_email: { name: "Cold email", family: "email", description: "A first email to someone who has not heard of you." },
  pricing_page: { name: "Pricing page", family: "commerce", description: "Plans, the reframe and the guarantee, side by side." },
  podcast_read: { name: "Podcast host read", family: "audio", description: "A spoken spot for a host to read in their voice." },
};

export interface FormatCard {
  id: FormatId;
  name: string;
  family: FormatFamily;
  description: string;
  length_band_words: [number, number] | null;
  multi_item: FormatSpec["multi_item"] | null;
  spec: FormatSpec | null;
  available: boolean;
}

export function formatCard(id: FormatId): FormatCard {
  const spec = FORMATS[id] ?? null;
  const fallback = CATALOG[id];
  return {
    id,
    name: spec?.name ?? fallback.name,
    family: spec?.family ?? fallback.family,
    description: spec?.description ?? fallback.description,
    length_band_words: spec?.length_band_words ?? null,
    multi_item: spec?.multi_item ?? null,
    spec,
    available: !!spec,
  };
}

export function allFormatCards(): FormatCard[] {
  return FORMAT_IDS.map(formatCard);
}

export function formatCardsByFamily(): { family: FormatFamily; label: string; formats: FormatCard[] }[] {
  const cards = allFormatCards();
  return FAMILY_ORDER.map((family) => ({ family, label: FAMILY_LABELS[family], formats: cards.filter((c) => c.family === family) })).filter((g) => g.formats.length > 0);
}

export function isFormatId(value: string): value is FormatId {
  return (FORMAT_IDS as readonly string[]).includes(value);
}

export function formatName(id: string): string {
  return isFormatId(id) ? formatCard(id).name : id.replace(/_/g, " ");
}

export function formatFamily(id: string): FormatFamily | null {
  return isFormatId(id) ? formatCard(id).family : null;
}

export function isMultiItem(id: string): boolean {
  return isFormatId(id) ? !!formatCard(id).multi_item || ["email_sequence", "webinar_package", "meta_ad", "google_rsa"].includes(id) : false;
}


export const SEQUENCE_TYPES: { id: string; label: string; description: string }[] = [
  { id: "launch", label: "Launch", description: "Open cart to close cart, one argument built across the series." },
  { id: "welcome", label: "Welcome", description: "The first emails after an opt-in." },
  { id: "nurture", label: "Nurture", description: "Belief-building emails between promotions." },
  { id: "cart_abandon", label: "Cart abandonment", description: "Recover a started checkout." },
  { id: "re_engagement", label: "Re-engagement", description: "Wake up a cold segment." },
  { id: "post_purchase", label: "Post-purchase", description: "Onboard, reduce refunds, set up the next offer." },
  { id: "webinar_followup", label: "Webinar follow-up", description: "Replay and close after a live event." },
  { id: "flash_sale", label: "Flash sale", description: "A short, deadline-driven promotion." },
];

export const LENGTH_OPTIONS: { id: "shorter" | "standard" | "longer"; label: string }[] = [
  { id: "shorter", label: "Shorter than usual" },
  { id: "standard", label: "Standard for the format" },
  { id: "longer", label: "Longer than usual" },
];

export { listFormats };
