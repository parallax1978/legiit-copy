import Link from "next/link";
import { requireWorkspace, canEdit } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { NewOfferForm } from "@/components/offers/new-offer-form";

export const metadata = { title: "New offer" };

export default async function NewOfferPage() {
  const { role } = await requireWorkspace();
  if (!canEdit(role)) {
    return (
      <>
        <PageHeader title="New offer" />
        <EmptyState
          title="View-only access"
          description="Only owners and editors can add offers to this workspace."
          action={
            <Button asChild variant="outline">
              <Link href="/app/offers">Back to offers</Link>
            </Button>
          }
        />
      </>
    );
  }
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="New offer" description="Give it the sources. One pass reads them into a brief, a claims ledger with evidence grades, per-offer settings and the questions only you can answer." />
      <NewOfferForm />
    </div>
  );
}
