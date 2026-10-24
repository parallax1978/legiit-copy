import { notFound } from "next/navigation";
import { requireWorkspace, canEdit } from "@/lib/auth";
import { getOffer, getOfferVariants, getWaitingGenerations } from "@/lib/data/offers";
import { normalizeBrief, isBriefEmpty } from "@/components/offers/normalize";
import { OfferVariants } from "@/components/offers/offer-variants";

export const metadata = { title: "Offer construction" };

export default async function OfferVariantsPage({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  const { role, workspace } = await requireWorkspace();
  const offer = await getOffer(offerId, workspace.id);
  if (!offer) notFound();
  const [variants, waiting] = await Promise.all([getOfferVariants(offer.id), getWaitingGenerations(offer.id)]);
  return <OfferVariants offerId={offer.id} variants={variants} waiting={waiting} editable={canEdit(role) && offer.status !== "archived"} briefEmpty={isBriefEmpty(normalizeBrief(offer.brief))} />;
}
