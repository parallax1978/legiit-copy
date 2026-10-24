import { notFound } from "next/navigation";
import { requireWorkspace, canEdit } from "@/lib/auth";
import { getGenerationDetail } from "@/lib/data/generations";
import { formatName } from "@/lib/formats";
import { GenerationView } from "@/components/generations/generation-view";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ generationId: string }> }) {
  const { generationId } = await params;
  if (!UUID.test(generationId)) return { title: "Copy" };
  const current = await requireWorkspace();
  const detail = await getGenerationDetail(generationId, current.workspace.id);
  return { title: detail ? `${formatName(detail.generation.format)} · ${detail.offer?.name ?? "Copy"}` : "Copy" };
}

export default async function GenerationPage({ params }: { params: Promise<{ generationId: string }> }) {
  const { generationId } = await params;
  if (!UUID.test(generationId)) notFound();
  const current = await requireWorkspace();
  const detail = await getGenerationDetail(generationId, current.workspace.id);
  if (!detail) notFound();
  return <GenerationView detail={detail} canEdit={canEdit(current.role)} />;
}
