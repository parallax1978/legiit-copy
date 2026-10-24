import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EvalBriefForm } from "@/components/admin/eval-brief-form";
import { FORMAT_IDS } from "@/lib/formats";

export const metadata = { title: "New eval brief" };

export default function NewEvalBriefPage() {
  return (
    <>
      <PageHeader title="New eval brief" actions={<Button asChild variant="ghost" size="sm"><Link href="/admin/evals/briefs">Back to briefs</Link></Button>} />
      <EvalBriefForm brief={null} formats={FORMAT_IDS} />
    </>
  );
}
