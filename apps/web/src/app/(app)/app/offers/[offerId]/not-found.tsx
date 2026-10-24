import Link from "next/link";
import { EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";

export default function OfferNotFound() {
  return (
    <EmptyState
      title="Offer not found"
      description="It may belong to another workspace, or it was deleted. Switch workspaces from the sidebar if you expected to see it here."
      action={
        <Button asChild variant="outline">
          <Link href="/app/offers">Back to offers</Link>
        </Button>
      }
    />
  );
}
