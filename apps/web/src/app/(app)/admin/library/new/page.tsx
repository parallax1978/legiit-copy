import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { ExampleForm } from "@/components/admin/example-form";
import { FORMAT_IDS } from "@/lib/formats";

export const metadata = { title: "New example" };

export default function NewExamplePage() {
  return (
    <>
      <PageHeader title="New teaching example" description="Record the decisions the piece made, not the prose. Sections and embeddings come after the first save." actions={<Button asChild variant="ghost" size="sm"><Link href="/admin/library">Back to library</Link></Button>} />
      <ExampleForm example={null} formats={FORMAT_IDS} />
    </>
  );
}
