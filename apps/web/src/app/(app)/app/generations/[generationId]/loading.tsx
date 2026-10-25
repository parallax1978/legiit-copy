import { Skeleton } from "@/components/ui/skeleton";

export default function GenerationLoading() {
  return (
    <div aria-busy className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Skeleton className="h-[560px] rounded-card" />
        <div className="space-y-5">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </div>
      </div>
    </div>
  );
}
