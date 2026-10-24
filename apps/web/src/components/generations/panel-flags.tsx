"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2, Replace, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DraftRow, FlagRow, GenerationDetail } from "@/lib/data/generations";
import { decideFlag } from "@/lib/actions/generations";
import { SeverityBadge } from "./status-badge";
import { Empty } from "./panel-argument";
import { LedgerChip } from "@/components/editor/ledger-chip";

const SOURCE_LABEL: Record<string, string> = { factual: "Factual and compliance", editorial: "Editorial", mechanical: "Mechanical", cold_read: "Cold read" };
const SOURCE_ORDER = ["factual", "editorial", "mechanical", "cold_read"];
const SEVERITY_ORDER: Record<string, number> = { fatal: 0, high: 1, medium: 2, low: 3, info: 4 };

/** Flags belong to the system draft they were raised on; user edits and rewrites inherit them for display. */
export function flagsForDraft(flags: FlagRow[], drafts: DraftRow[], current: DraftRow | null): { flags: FlagRow[]; from: DraftRow | null } {
  if (!current) return { flags: [], from: null };
  const direct = flags.filter((f) => f.draft_id === current.id);
  if (direct.length) return { flags: direct, from: current };
  const earlier = drafts.filter((d) => d.version <= current.version && flags.some((f) => f.draft_id === d.id)).sort((a, b) => b.version - a.version)[0] ?? null;
  return { flags: earlier ? flags.filter((f) => f.draft_id === earlier.id) : [], from: earlier };
}

export function FlagsPanel({ detail, current, canEdit, onApplied }: { detail: GenerationDetail; current: DraftRow | null; canEdit: boolean; onApplied?: () => void }) {
  const { flags, from } = flagsForDraft(detail.flags, detail.drafts, current);
  const [showDecided, setShowDecided] = useState(false);
  if (!flags.length) return <Empty>No flags on this version. The factual review lists every line, the rule it touches and a rewritten line; the editorial and mechanical passes add theirs.</Empty>;

  const groups = SOURCE_ORDER.map((source) => ({
    source,
    flags: flags.filter((f) => f.source === source).sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)),
  })).filter((g) => g.flags.length);
  const pendingCount = flags.filter((f) => f.decision === "pending").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span>
          {flags.length} flag{flags.length === 1 ? "" : "s"}{pendingCount ? `, ${pendingCount} waiting on you` : ", all decided"}
          {from && current && from.id !== current.id ? ` · raised on version ${from.version}` : ""}
        </span>
        <button type="button" className="underline-offset-2 hover:underline" onClick={() => setShowDecided((v) => !v)}>{showDecided ? "Hide decided" : "Show decided"}</button>
      </div>
      {groups.map((g) => {
        const visible = g.flags.filter((f) => showDecided || f.decision === "pending");
        if (!visible.length) return null;
        return (
          <section key={g.source}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{SOURCE_LABEL[g.source] ?? g.source}</h3>
            <ul className="space-y-2">
              {visible.map((f) => <FlagCard key={f.id} flag={f} canEdit={canEdit} onApplied={onApplied} />)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function FlagCard({ flag, canEdit, onApplied }: { flag: FlagRow; canEdit: boolean; onApplied?: () => void }) {
  const [pending, start] = useTransition();
  const decided = flag.decision !== "pending";
  const act = (decision: "keep" | "drop" | "rewrite") =>
    start(async () => {
      const res = await decideFlag(flag.id, decision);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (decision === "rewrite") {
        toast.success(`Rewrite applied as version ${res.version}${res.replaced && res.replaced > 1 ? ` (${res.replaced} places)` : ""}`);
        onApplied?.();
      } else toast.success(decision === "keep" ? "Kept as written" : "Marked to drop");
    });

  return (
    <li className={cn("rounded-lg border p-3 text-sm", decided ? "border-line opacity-70" : flag.severity === "fatal" || flag.severity === "high" ? "border-bad/30" : "border-line")}>
      <div className="flex flex-wrap items-center gap-1.5">
        <SeverityBadge severity={flag.severity} />
        <span className="text-xs text-ink-muted">{flag.kind.replace(/_/g, " ")}</span>
        {flag.claim_id && <LedgerChip id={flag.claim_id} />}
        {decided && <span className="ml-auto rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">{flag.decision}</span>}
      </div>
      {flag.quote && <q className="mt-2 block text-ink">{flag.quote}</q>}
      {flag.rule && <p className="mt-1.5 text-xs text-ink-muted"><span className="font-medium text-ink">Rule:</span> {flag.rule}</p>}
      {flag.issue && <p className="mt-1 text-xs text-ink-muted"><span className="font-medium text-ink">Issue:</span> {flag.issue}</p>}
      {flag.suggested_rewrite && (
        <div className="mt-2 rounded bg-good-soft/50 px-2.5 py-1.5 text-xs">
          <span className="font-medium text-good">Rewritten line:</span> <span className="text-ink">{flag.suggested_rewrite}</span>
        </div>
      )}
      {canEdit && !decided && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Button size="xs" variant="outline" disabled={pending} onClick={() => act("keep")}><Check className="h-3 w-3" /> Keep</Button>
          {flag.suggested_rewrite && flag.quote && (
            <Button size="xs" disabled={pending} onClick={() => act("rewrite")}>{pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Replace className="h-3 w-3" />} Apply rewrite</Button>
          )}
          <Button size="xs" variant="ghost" disabled={pending} onClick={() => act("drop")}><Trash2 className="h-3 w-3" /> Drop</Button>
        </div>
      )}
    </li>
  );
}
