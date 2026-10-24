import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireWorkspace, canEdit } from "@/lib/auth";
import { listOfferOptions, listVoiceProfiles } from "@/lib/data/generations";
import { PageHeader } from "@/components/app/page-header";
import { NewGenerationWizard } from "@/components/generations/new-generation-wizard";

export const metadata = { title: "New copy" };
export const dynamic = "force-dynamic";

export default async function NewGenerationPage({ searchParams }: { searchParams: Promise<{ offer?: string; format?: string }> }) {
  const params = await searchParams;
  const current = await requireWorkspace();
  if (!canEdit(current.role)) redirect("/app/generations");
  const [offers, voiceProfiles] = await Promise.all([listOfferOptions(current.workspace.id), listVoiceProfiles(current.workspace.id)]);
  return (
    <>
      <Link href="/app/generations" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> All copy
      </Link>
      <PageHeader title="New copy" description="Pick the offer and the format, say what the piece has to do, and the engine does the rest in order: offer, argument, draft, reviews." />
      <NewGenerationWizard offers={offers} voiceProfiles={voiceProfiles} initialOfferId={params.offer ?? null} initialFormat={params.format ?? null} />
    </>
  );
}
