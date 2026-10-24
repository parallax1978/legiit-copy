import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { formatLabel, stepLabel, type InProgressGeneration } from "@/lib/data/dashboard";

export function InProgressList({ items }: { items: InProgressGeneration[] }) {
  return (
    <section className="rounded-card border border-line bg-surface shadow-card">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-sm font-semibold text-ink">In progress</h2>
        <Link href="/app/generations" className="text-xs font-medium text-brand hover:underline">All copy</Link>
      </header>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-muted">Nothing is running right now. Pieces you start show up here with their current step.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((g) => (
            <li key={g.id}>
              <Link href={`/app/generations/${g.id}`} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-surface-alt">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">{formatLabel(g.format)}</span>
                    {g.offerName && <span className="truncate text-xs text-ink-muted">for {g.offerName}</span>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {g.status === "needs_input"
                      ? (g.progressMessage ?? "Waiting on a decision from you")
                      : (g.progressMessage ?? (g.currentStep ? stepLabel(g.currentStep) : "Waiting for a worker"))}
                    <span className="text-ink-soft"> · {formatDistanceToNow(new Date(g.updatedAt), { addSuffix: true })}</span>
                  </p>
                </div>
                <StatusBadge status={g.status} />
                <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
