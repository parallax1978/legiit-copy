import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EvalBriefForm } from "@/components/admin/eval-brief-form";
import { ActionButton } from "@/components/admin/action-button";
import { getEvalBrief } from "@/lib/data/admin";
import { deleteEvalBrief } from "@/lib/actions/admin";
import { FORMAT_IDS } from "@/lib/formats";

export const metadata = { title: "Eval brief" };
export const dynamic = "force-dynamic";

export default async function EvalBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brief = await getEvalBrief(id);
  if (!brief) notFound();
  return (
    <>
      <PageHeader
        title={brief.name}
        description={<span className="font-mono text-xs text-ink-soft">{brief.id}</span>}
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/evals/briefs">Back</Link>
            </Button>
            <ActionButton size="sm" variant="destructive" action={deleteEvalBrief.bind(null, brief.id)} confirm="Delete this brief and every eval output generated for it?">
              <Trash2 className="h-4 w-4" />
            </ActionButton>
          </>
        }
      />
      <EvalBriefForm brief={brief} formats={FORMAT_IDS} />
    </>
  );
}
