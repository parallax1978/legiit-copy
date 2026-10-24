"use client";
import { CheckCircle2, Circle, Loader2, XCircle, PauseCircle, Clock, MinusCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GenerationRow, StepRow } from "@/lib/data/generations";
import { buildTimeline, STEP_BLURBS, formatCost, formatDuration, type TimelineStatus } from "./outputs";

const ICON: Record<TimelineStatus, { Icon: typeof Circle; className: string; spin?: boolean }> = {
  completed: { Icon: CheckCircle2, className: "text-good" },
  running: { Icon: Loader2, className: "text-brand", spin: true },
  queued: { Icon: Clock, className: "text-brand" },
  pending: { Icon: Circle, className: "text-ink-soft" },
  failed: { Icon: XCircle, className: "text-bad" },
  interrupted: { Icon: MinusCircle, className: "text-warn" },
  skipped: { Icon: MinusCircle, className: "text-ink-soft" },
  paused: { Icon: PauseCircle, className: "text-warn" },
};

export function StepTimeline({ generation, steps, compact = false }: { generation: GenerationRow; steps: StepRow[]; compact?: boolean }) {
  const entries = buildTimeline(generation, steps);
  const live = generation.status === "running" || generation.status === "queued";
  return (
    <ol className="relative space-y-0">
      {entries.map((e, i) => {
        const { Icon, className, spin } = ICON[e.status] ?? ICON.pending;
        const isCurrent = generation.current_step === e.step && live;
        const last = i === entries.length - 1;
        return (
          <li key={e.step} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span className={cn("absolute left-[9px] top-5 h-[calc(100%-12px)] w-px", e.status === "completed" ? "bg-good/40" : "bg-line")} />}
            <Icon className={cn("relative z-10 mt-0.5 h-[18px] w-[18px] shrink-0 bg-surface", className, spin && "animate-spin")} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className={cn("text-sm font-medium", e.status === "pending" ? "text-ink-muted" : "text-ink")}>{e.label}</span>
                {e.cycles > 1 && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-ink-muted" title="The review loop ran more than once">
                    <RotateCcw className="h-2.5 w-2.5" /> cycle {e.cycles}
                  </span>
                )}
                {e.attempts > 1 && e.cycles <= 1 && <span className="text-[10px] text-ink-soft">attempt {e.attempts}</span>}
                {!compact && e.cost > 0 && <span className="ml-auto text-[11px] text-ink-soft">{formatCost(e.cost)}{e.durationMs ? ` · ${formatDuration(e.durationMs)}` : ""}</span>}
              </div>
              {isCurrent && generation.progress_message && <p className="mt-0.5 text-xs text-brand-strong">{generation.progress_message}</p>}
              {e.summary && e.status !== "running" && <p className="mt-0.5 text-xs text-ink-muted line-clamp-3">{e.summary}</p>}
              {e.error && <p className="mt-0.5 text-xs text-bad">{e.error}</p>}
              {!compact && !e.summary && !e.error && !isCurrent && e.status !== "completed" && <p className="mt-0.5 text-xs text-ink-soft">{STEP_BLURBS[e.step]}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
