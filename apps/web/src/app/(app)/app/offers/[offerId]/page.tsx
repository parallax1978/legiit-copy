import { notFound } from "next/navigation";
import { requireWorkspace, canEdit } from "@/lib/auth";
import { getOffer, getOfferSources, getOfferQuestions } from "@/lib/data/offers";
import { normalizeBrief, isBriefEmpty, toSourceView } from "@/components/offers/normalize";
import { BriefForm } from "@/components/offers/brief-form";
import { OpenQuestions } from "@/components/offers/open-questions";
import { SourcesPanel } from "@/components/offers/sources-panel";

export async function generateMetadata({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  const { workspace } = await requireWorkspace();
  const offer = await getOffer(offerId, workspace.id);
  return { title: offer ? `${offer.name} · Brief` : "Offer" };
}

export default async function OfferBriefPage({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  const { role, workspace } = await requireWorkspace();
  const offer = await getOffer(offerId, workspace.id);
  if (!offer) notFound();
  const [sources, questions] = await Promise.all([getOfferSources(offer.id), getOfferQuestions(offer.id)]);
  const brief = normalizeBrief(offer.brief);
  const editable = canEdit(role) && offer.status !== "archived";
  return (
    <div className="space-y-5">
      <OpenQuestions offerId={offer.id} questions={questions} unknowns={brief.unknowns} editable={editable} extracting={offer.status === "extracting"} />
      <BriefForm key={offer.updated_at} offerId={offer.id} name={offer.name} brief={brief} editable={editable} empty={isBriefEmpty(brief)} />
      <SourcesPanel offerId={offer.id} workspaceId={workspace.id} sources={sources.map(toSourceView)} editable={editable} />
    </div>
  );
}
