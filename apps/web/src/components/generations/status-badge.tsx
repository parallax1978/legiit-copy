import { Loader2, CheckCircle2, XCircle, PauseCircle, Clock, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GenerationStatus } from "@/lib/data/generations";

const STYLES: Record<GenerationStatus, { label: string; className: string; Icon: typeof Loader2; spin?: boolean }> = {
  queued: { label: "Queued", className: "bg-surface-sunken text-ink-muted", Icon: Clock },
  running: { label: "Running", className: "bg-brand-faint text-brand-strong", Icon: Loader2, spin: true },
  needs_input: { label: "Needs your input", className: "bg-warn-soft text-warn", Icon: PauseCircle },
  completed: { label: "Completed", className: "bg-good-soft text-good", Icon: CheckCircle2 },
  failed: { label: "Failed", className: "bg-bad-soft text-bad", Icon: XCircle },
  cancelled: { label: "Cancelled", className: "bg-surface-sunken text-ink-muted", Icon: Ban },
};

export function StatusBadge({ status, className, size = "sm" }: { status: string; className?: string; size?: "sm" | "md" }) {
  const s = STYLES[status as GenerationStatus] ?? { label: status, className: "bg-surface-sunken text-ink-muted", Icon: Clock };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap", size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm", s.className, className)}>
      <s.Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5", s.spin && "animate-spin")} />
      {s.label}
    </span>
  );
}

export function statusLabel(status: string): string {
  return STYLES[status as GenerationStatus]?.label ?? status;
}

const SEVERITY: Record<string, string> = {
  fatal: "bg-bad text-white",
  high: "bg-bad-soft text-bad",
  medium: "bg-warn-soft text-warn",
  low: "bg-surface-sunken text-ink-muted",
  info: "bg-surface-sunken text-ink-soft",
};

export function SeverityBadge({ severity, className }: { severity: string; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", SEVERITY[severity] ?? SEVERITY.low, className)}>{severity}</span>;
}

const PREDICTION: Record<string, string> = {
  beat: "bg-good-soft text-good",
  lose: "bg-bad-soft text-bad",
  unsure: "bg-warn-soft text-warn",
};

export function PredictionBadge({ prediction, className }: { prediction: string; className?: string }) {
  const label = prediction === "beat" ? "Predicted to beat the control" : prediction === "lose" ? "Predicted to lose to the control" : "Unsure against the control";
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", PREDICTION[prediction] ?? PREDICTION.unsure, className)}>{label}</span>;
}
