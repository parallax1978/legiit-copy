import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { CritiqueForm } from "@/components/admin/critique-form";
import { FORMAT_IDS } from "@/lib/formats";

export const metadata = { title: "New critique" };

export default function NewCritiquePage() {
  return (
    <>
      <PageHeader title="New critique" description="A weak line, the chief's revision, and the defect named in their words." actions={<Button asChild variant="ghost" size="sm"><Link href="/admin/critiques">Back to critiques</Link></Button>} />
      <CritiqueForm critique={null} formats={FORMAT_IDS} />
    </>
  );
}
