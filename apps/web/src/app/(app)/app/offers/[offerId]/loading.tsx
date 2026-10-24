import { Skeleton } from "@/components/ui/skeleton";

export default function OfferLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-40 w-full rounded-card" />
      <Skeleton className="h-64 w-full rounded-card" />
    </div>
  );
}
