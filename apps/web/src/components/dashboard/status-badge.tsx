import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  queued: "bg-surface-sunken text-ink-muted",
  running: "bg-brand-faint text-brand-strong",
  needs_input: "bg-warn-soft text-warn",
  completed: "bg-good-soft text-good",
  failed: "bg-bad-soft text-bad",
  cancelled: "bg-surface-sunken text-ink-soft",
};
const LABELS: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  needs_input: "Needs your input",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", STYLES[status] ?? "bg-surface-sunken text-ink-muted", className)}>
      {status === "running" && <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {LABELS[status] ?? status}
    </span>
  );
}
