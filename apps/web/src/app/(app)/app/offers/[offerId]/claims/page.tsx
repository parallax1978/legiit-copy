import { notFound } from "next/navigation";
import { requireWorkspace, canEdit } from "@/lib/auth";
import { getOffer, getOfferClaims } from "@/lib/data/offers";
import { ClaimsLedger } from "@/components/offers/claims-ledger";

export const metadata = { title: "Claims ledger" };

export default async function OfferClaimsPage({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  const { role, workspace } = await requireWorkspace();
  const offer = await getOffer(offerId, workspace.id);
  if (!offer) notFound();
  const claims = await getOfferClaims(offer.id);
  return <ClaimsLedger offerId={offer.id} claims={claims} editable={canEdit(role) && offer.status !== "archived"} />;
}
