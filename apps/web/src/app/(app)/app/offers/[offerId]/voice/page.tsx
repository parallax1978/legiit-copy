import { notFound } from "next/navigation";
import { requireWorkspace, canEdit } from "@/lib/auth";
import { getOffer, getVoiceProfiles } from "@/lib/data/offers";
import { VoiceProfiles } from "@/components/offers/voice-profiles";

export const metadata = { title: "Voice" };

export default async function OfferVoicePage({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  const { role, workspace } = await requireWorkspace();
  const offer = await getOffer(offerId, workspace.id);
  if (!offer) notFound();
  const profiles = await getVoiceProfiles(offer.id, workspace.id);
  return <VoiceProfiles offerId={offer.id} profiles={profiles} editable={canEdit(role) && offer.status !== "archived"} />;
}
