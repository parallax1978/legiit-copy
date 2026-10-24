import { notFound } from "next/navigation";
import { requireWorkspace, canEdit } from "@/lib/auth";
import { getOffer, getOfferResearch } from "@/lib/data/offers";
import { ResearchDossier } from "@/components/offers/research-dossier";

export const metadata = { title: "Research" };

export default async function OfferResearchPage({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  const { role, workspace } = await requireWorkspace();
  const offer = await getOffer(offerId, workspace.id);
  if (!offer) notFound();
  const research = await getOfferResearch(offer.id);
  return <ResearchDossier offerId={offer.id} research={research} editable={canEdit(role) && offer.status !== "archived"} />;
}
