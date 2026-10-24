import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  // generations / steps / runs
  queued: "bg-surface-sunken text-ink-muted",
  pending: "bg-surface-sunken text-ink-muted",
  running: "bg-brand-faint text-brand-strong",
  needs_input: "bg-warn-soft text-warn",
  completed: "bg-good-soft text-good",
  failed: "bg-bad-soft text-bad",
  interrupted: "bg-warn-soft text-warn",
  cancelled: "bg-surface-sunken text-ink-soft",
  skipped: "bg-surface-sunken text-ink-soft",
  stuck: "bg-bad-soft text-bad",
  // library
  draft: "bg-surface-sunken text-ink-muted",
  curated: "bg-good-soft text-good",
  retired: "bg-surface-sunken text-ink-soft",
  // rights
  public_domain: "bg-good-soft text-good",
  licensed: "bg-good-soft text-good",
  publicly_posted_copyrighted: "bg-warn-soft text-warn",
  unknown: "bg-surface-sunken text-ink-muted",
  // misc
  active: "bg-good-soft text-good",
  set: "bg-good-soft text-good",
  not_set: "bg-warn-soft text-warn",
  yes: "bg-good-soft text-good",
  no: "bg-surface-sunken text-ink-soft",
  high: "bg-good-soft text-good",
  medium: "bg-warn-soft text-warn",
  low: "bg-surface-sunken text-ink-muted",
  human: "bg-brand-faint text-brand-strong",
  judge: "bg-surface-sunken text-ink",
};

export function StatusBadge({ value, className }: { value: string | null | undefined; className?: string }) {
  const v = value ?? "—";
  return <Badge className={cn("border-transparent font-medium", TONES[v] ?? "bg-surface-sunken text-ink", className)}>{v.replace(/_/g, " ")}</Badge>;
}

export function YesNo({ value }: { value: boolean | null | undefined }) {
  return <StatusBadge value={value ? "yes" : "no"} />;
}
