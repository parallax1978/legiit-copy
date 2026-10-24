import { notFound } from "next/navigation";
import { requireWorkspace, canEdit } from "@/lib/auth";
import { getOffer, getOfferConfig } from "@/lib/data/offers";
import { OfferSettingsForm } from "@/components/offers/offer-settings-form";

export const metadata = { title: "Offer settings" };

export default async function OfferSettingsPage({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  const { role, workspace } = await requireWorkspace();
  const offer = await getOffer(offerId, workspace.id);
  if (!offer) notFound();
  const config = await getOfferConfig(offer.id);
  return <OfferSettingsForm key={config?.updated_at ?? "none"} offerId={offer.id} config={config} editable={canEdit(role) && offer.status !== "archived"} />;
}
