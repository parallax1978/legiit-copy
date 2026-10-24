import { notFound } from "next/navigation";
import { requireWorkspace, canEdit } from "@/lib/auth";
import { getOffer, getOfferSources, getOfferCounts } from "@/lib/data/offers";
import { OfferHeader } from "@/components/offers/offer-header";
import { OfferTabs } from "@/components/offers/offer-tabs";
import { ExtractionBanner } from "@/components/offers/extraction-banner";

export default async function OfferLayout({ params, children }: { params: Promise<{ offerId: string }>; children: React.ReactNode }) {
  const { offerId } = await params;
  const { role, workspace } = await requireWorkspace();
  const offer = await getOffer(offerId, workspace.id);
  if (!offer) notFound();
  const [sources, counts] = await Promise.all([getOfferSources(offer.id), getOfferCounts(offer.id)]);
  return (
    <>
      <OfferHeader offer={{ id: offer.id, name: offer.name, status: offer.status, updated_at: offer.updated_at }} editable={canEdit(role)} sourceCount={sources.length} />
      <ExtractionBanner offerId={offer.id} status={offer.status} sources={sources.map((s) => ({ id: s.id, title: s.title, kind: s.kind, extraction_status: s.extraction_status, error: s.error }))} />
      <OfferTabs offerId={offer.id} counts={counts} />
      {children}
    </>
  );
}
