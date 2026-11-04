import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireWorkspace, canEdit } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { RewriteForm } from "@/components/rewrite/rewrite-form";

export const metadata = { title: "Rewrite a page" };
export const dynamic = "force-dynamic";
/** The page is read in a headless browser from the server action: a cold start plus a full page load fit in a minute. */
export const maxDuration = 60;

export default async function RewritePage() {
  const { role } = await requireWorkspace();
  if (!canEdit(role)) {
    return (
      <>
        <PageHeader title="Rewrite a page" />
        <EmptyState
          title="View-only access"
          description="Only owners and editors can rewrite pages in this workspace."
          action={
            <Button asChild variant="outline">
              <Link href="/app/generations">Back to copy</Link>
            </Button>
          }
        />
      </>
    );
  }
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/generations" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> All copy
      </Link>
      <PageHeader title="Rewrite a page" description="Paste a page's address. The app reads it, builds the offer from what the page says, and writes the page again with the original as the control to beat." />
      <RewriteForm />
    </div>
  );
}
