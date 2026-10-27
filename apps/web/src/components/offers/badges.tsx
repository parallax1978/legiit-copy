import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OFFER_STATUS_LABELS, type OfferStatus, EVIDENCE_GRADE_LABELS, type EvidenceGradeId } from "./constants";

export function OfferStatusBadge({ status, className }: { status: string; className?: string }) {
  const s = status as OfferStatus;
  const tone: Record<OfferStatus, string> = {
    draft: "bg-surface-sunken text-ink-muted",
    extracting: "bg-brand-faint text-brand-strong",
    needs_review: "bg-warn-soft text-warn",
    ready: "bg-good-soft text-good",
    archived: "border-line text-ink-soft bg-transparent",
  };
  return (
    <Badge className={cn(tone[s] ?? "bg-surface-sunken text-ink-muted", className)}>
      {s === "extracting" && <Loader2 className="size-3 animate-spin" />}
      {OFFER_STATUS_LABELS[s] ?? status}
    </Badge>
  );
}

export function ClaimStatusBadge({ status, decision }: { status: string; decision?: string | null }) {
  if (decision === "drop") return <Badge className="bg-surface-sunken text-ink-soft line-through">Dropped</Badge>;
  const tone: Record<string, string> = {
    verified: "bg-good-soft text-good",
    unverified: "bg-surface-sunken text-ink-muted",
    flagged: "bg-bad-soft text-bad",
  };
  const label: Record<string, string> = { verified: "Verified", unverified: "Unverified", flagged: "Flagged" };
  return <Badge className={tone[status] ?? "bg-surface-sunken text-ink-muted"}>{label[status] ?? status}</Badge>;
}

export function GradeBadge({ grade, className }: { grade: string | null; className?: string }) {
  if (!grade) return <span className="text-xs text-ink-soft">—</span>;
  const tone: Record<string, string> = {
    A: "bg-good-soft text-good",
    B: "bg-good-soft text-good",
    C: "bg-brand-faint text-brand-strong",
    D: "bg-warn-soft text-warn",
    E: "bg-warn-soft text-warn",
    // F is no outside evidence of results, not a defect: the product's own features and process carry the promise (§8.2)
    F: "bg-surface-sunken text-ink-muted",
  };
  return (
    <span title={EVIDENCE_GRADE_LABELS[grade as EvidenceGradeId] ?? grade} className={cn("inline-flex size-6 items-center justify-center rounded-md text-xs font-bold", tone[grade] ?? "bg-surface-sunken text-ink-muted", className)}>
      {grade}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const tone: Record<string, string> = {
    info: "bg-surface-sunken text-ink-muted",
    low: "bg-brand-faint text-brand-strong",
    medium: "bg-warn-soft text-warn",
    high: "bg-bad-soft text-bad",
    fatal: "bg-bad text-white",
  };
  return <Badge className={cn("uppercase tracking-wide", tone[severity] ?? "bg-surface-sunken text-ink-muted")}>{severity}</Badge>;
}

export function VariantStatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = { proposed: "bg-warn-soft text-warn", approved: "bg-good-soft text-good", rejected: "bg-surface-sunken text-ink-soft" };
  const label: Record<string, string> = { proposed: "Proposed", approved: "Approved", rejected: "Rejected" };
  return <Badge className={tone[status] ?? "bg-surface-sunken text-ink-muted"}>{label[status] ?? status}</Badge>;
}

export function FitDots({ score, max = 3 }: { score: number; max?: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`${score} of ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={cn("size-2 rounded-full", i < score ? "bg-brand" : "bg-line-strong")} />
      ))}
    </span>
  );
}

export function SourceStatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    pending: "bg-surface-sunken text-ink-muted",
    processing: "bg-brand-faint text-brand-strong",
    done: "bg-good-soft text-good",
    failed: "bg-bad-soft text-bad",
  };
  const label: Record<string, string> = { pending: "Queued", processing: "Reading", done: "Read", failed: "Failed" };
  return (
    <Badge className={tone[status] ?? "bg-surface-sunken text-ink-muted"}>
      {(status === "processing" || status === "pending") && <Loader2 className="size-3 animate-spin" />}
      {label[status] ?? status}
    </Badge>
  );
}
