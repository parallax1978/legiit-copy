import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { CritiqueForm } from "@/components/admin/critique-form";
import { ActionButton } from "@/components/admin/action-button";
import { StatusBadge, YesNo } from "@/components/admin/status-badge";
import { getCritique } from "@/lib/data/admin";
import { deleteCritique, embedRows, setCritiqueStatus } from "@/lib/actions/admin";
import { FORMAT_IDS } from "@/lib/formats";

export const metadata = { title: "Critique" };
export const dynamic = "force-dynamic";

export default async function CritiquePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const critique = await getCritique(id);
  if (!critique) notFound();
  return (
    <>
      <PageHeader
        title={critique.defect_named ?? critique.external_id ?? "Critique"}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge value={critique.status} />
            <span className="text-xs">Embedded:</span> <YesNo value={!!critique.embedding} />
            {critique.chief && <span className="text-xs text-ink-muted">by {critique.chief}</span>}
          </span>
        }
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/critiques">Back</Link>
            </Button>
            {critique.status !== "curated" && (
              <ActionButton size="sm" variant="outline" action={setCritiqueStatus.bind(null, critique.id, "curated")}>
                Curate
              </ActionButton>
            )}
            {critique.status !== "retired" && (
              <ActionButton size="sm" variant="outline" action={setCritiqueStatus.bind(null, critique.id, "retired")}>
                Retire
              </ActionButton>
            )}
            <ActionButton size="sm" action={embedRows.bind(null, "critiques", critique.id)} pendingLabel="Embedding…">
              <Sparkles className="h-4 w-4" /> {critique.embedding ? "Re-embed" : "Embed"}
            </ActionButton>
            <ActionButton size="sm" variant="destructive" action={deleteCritique.bind(null, critique.id)} confirm="Delete this critique?">
              <Trash2 className="h-4 w-4" />
            </ActionButton>
          </>
        }
      />
      <CritiqueForm critique={critique} formats={FORMAT_IDS} />
    </>
  );
}
