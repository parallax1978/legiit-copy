import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight } from "lucide-react";
import type { GenerationListItem } from "@/lib/data/generations";
import { formatName } from "@/lib/formats";
import { StatusBadge } from "./status-badge";
import { formatCost, STEP_LABELS, type StepName } from "./outputs";

export function GenerationList({ items }: { items: GenerationListItem[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="hidden grid-cols-[1.4fr_1fr_1.2fr_0.5fr_0.8fr_24px] gap-3 border-b border-line bg-surface-alt px-4 py-2 text-xs font-medium uppercase tracking-wide text-ink-muted md:grid">
        <div>Format</div>
        <div>Offer</div>
        <div>Status</div>
        <div className="text-right">Cost</div>
        <div className="text-right">Created</div>
        <div />
      </div>
      <ul className="divide-y divide-line">
        {items.map((g) => {
          const live = g.status === "running" || g.status === "queued";
          const stepLabel = g.current_step ? STEP_LABELS[g.current_step as StepName] ?? g.current_step : null;
          return (
            <li key={g.id}>
              <Link href={`/app/generations/${g.id}`} className="grid grid-cols-1 gap-2 px-4 py-3 transition-colors hover:bg-surface-alt md:grid-cols-[1.4fr_1fr_1.2fr_0.5fr_0.8fr_24px] md:items-center md:gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-ink">{formatName(g.format)}</div>
                  {g.purpose && <div className="truncate text-xs text-ink-muted">{g.purpose}</div>}
                </div>
                <div className="truncate text-sm text-ink-muted">{g.offer?.name ?? "Offer removed"}</div>
                <div className="min-w-0">
                  <StatusBadge status={g.status} />
                  {live && (stepLabel || g.progress_message) && (
                    <div className="mt-1 truncate text-xs text-ink-muted">
                      {stepLabel}
                      {g.progress_message ? ` · ${g.progress_message}` : ""}
                    </div>
                  )}
                  {g.status === "failed" && g.error && <div className="mt-1 truncate text-xs text-bad">{g.error}</div>}
                </div>
                <div className="text-sm text-ink-muted md:text-right">{formatCost(g.cost_usd)}</div>
                <div className="text-xs text-ink-muted md:text-right" title={new Date(g.created_at).toLocaleString()}>
                  {formatDistanceToNow(new Date(g.created_at), { addSuffix: true })}
                </div>
                <div className="hidden justify-end md:flex">
                  <ChevronRight className="h-4 w-4 text-ink-soft" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
