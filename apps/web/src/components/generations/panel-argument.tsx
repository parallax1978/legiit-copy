"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Shuffle, Trophy, Medal, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AngleRow, GenerationDetail } from "@/lib/data/generations";
import type { ArgumentOutput } from "@engine/schemas/mod.ts";
import { MAX_WEIGHTED } from "@engine/schemas/argument.ts";
import { tryAnotherAngle } from "@/lib/actions/generations";
import { getArgument } from "./outputs";
import { LedgerChip } from "@/components/editor/ledger-chip";

type Candidate = ArgumentOutput["candidates"][number];

function candidateOf(a: AngleRow): Partial<Candidate> {
  return (a.candidate && typeof a.candidate === "object" ? (a.candidate as Partial<Candidate>) : {}) ?? {};
}

export function ArgumentPanel({ detail, canEdit }: { detail: GenerationDetail; canEdit: boolean }) {
  const { angles, generation, steps } = detail;
  const output = getArgument(steps);
  const winner = angles.find((a) => a.id === generation.selected_angle_id) ?? angles.find((a) => a.is_winner) ?? null;
  const finalists = angles.filter((a) => a.is_finalist && a.id !== winner?.id);
  const losers = angles.filter((a) => a.kept_as_loser && a.id !== winner?.id);
  const others = angles.filter((a) => a !== winner && !a.is_finalist && !a.kept_as_loser);
  const [pending, start] = useTransition();
  const busy = generation.status === "running" || generation.status === "queued";

  const retry = () =>
    start(async () => {
      const res = await tryAnotherAngle(generation.id);
      if (!res.ok) toast.error(res.error);
      else toast.success("Restarting from argument selection with this angle excluded");
    });

  if (!winner && !output) {
    return <Empty>The argument step has not run yet. The winning thesis, finalists and kept losers appear here once it does.</Empty>;
  }

  const c = winner ? candidateOf(winner) : null;
  const thesis = winner?.thesis ?? output?.thesis ?? null;
  const excluded = detail.options.exclude_angle_ids?.length ?? 0;

  return (
    <div className="space-y-5">
      {thesis && (
        <div className="rounded-lg border border-brand-soft bg-brand-faint/50 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-strong"><Trophy className="h-3 w-3" /> Winning thesis</div>
          <p className="text-sm leading-snug text-ink">{thesis}</p>
        </div>
      )}
      {c && (
        <dl className="grid gap-3 text-sm">
          <Field label="Big idea" value={c.big_idea} strong />
          <Field label="Promise" value={c.promise} />
          <Field label="Mechanism" value={c.mechanism} />
          <Field label="Belief to displace" value={c.belief_to_displace} />
          <Field label="Core desire" value={c.core_desire ? `${c.core_desire}${c.cluster ? ` (${c.cluster}${c.k ? `, ${c.k} verbatims` : ""})` : ""}` : null} />
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Proof asset</dt>
            <dd className="mt-0.5 text-ink">
              {c.proof_asset}
              {c.proof_ledger_refs?.length ? (
                <span className="ml-1 inline-flex flex-wrap gap-0.5 align-middle">
                  {c.proof_ledger_refs.map((id) => <LedgerChip key={id} id={id} />)}
                </span>
              ) : null}
            </dd>
          </div>
          {c.search_origin && <Field label="Found by" value={c.search_origin.replace(/_/g, " ")} />}
          {winner && <Scores angle={winner} />}
        </dl>
      )}

      {finalists.length > 0 && (
        <Group title="Other finalists" icon={<Medal className="h-3 w-3" />}>
          {finalists.map((a) => <AngleCard key={a.id} angle={a} />)}
        </Group>
      )}
      {losers.length > 0 && (
        <Group title="Kept losers" subtitle="Body reasons now, lead tests later" icon={<Lightbulb className="h-3 w-3" />}>
          {losers.map((a) => <AngleCard key={a.id} angle={a} />)}
        </Group>
      )}
      {others.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-ink-muted hover:text-ink">{others.length} more candidates scored and set aside</summary>
          <div className="mt-2 space-y-2">
            {others.map((a) => <AngleCard key={a.id} angle={a} muted />)}
          </div>
        </details>
      )}
      {output?.tie_break_note && <p className="text-xs text-ink-muted"><span className="font-medium text-ink">Tie-break:</span> {output.tie_break_note}</p>}

      {canEdit && (
        <div className="border-t border-line pt-4">
          <Button variant="outline" size="sm" onClick={retry} disabled={pending || busy} className="w-full">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shuffle className="h-3.5 w-3.5" />} Try another angle
          </Button>
          <p className="mt-1.5 text-[11px] text-ink-muted">Excludes this winner and restarts from argument selection. Drafts and reviews run again; existing versions stay.{excluded ? ` ${excluded} angle${excluded === 1 ? "" : "s"} already excluded.` : ""}</p>
        </div>
      )}
    </div>
  );
}

function Scores({ angle }: { angle: AngleRow }) {
  const scores = (angle.scores && typeof angle.scores === "object" ? (angle.scores as Record<string, number>) : {}) ?? {};
  const gates = (angle.gates && typeof angle.gates === "object" ? (angle.gates as Record<string, unknown>) : {}) ?? {};
  const keys = Object.keys(scores).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  if (!keys.length && angle.total == null) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Rubric</dt>
      <dd className="mt-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {angle.total != null && <span className="font-semibold text-ink">{Number(angle.total)} / {MAX_WEIGHTED} weighted</span>}
          {"desire" in gates && <Gate label="desire" value={String(gates.desire)} />}
          {"proof" in gates && <Gate label="proof" value={String(gates.proof)} />}
        </div>
        {keys.length > 0 && (
          <div className="grid grid-cols-7 gap-1">
            {keys.map((k) => (
              <div key={k} className="text-center" title={`${k}: ${scores[k]} of 3`}>
                <div className="flex h-6 items-end justify-center gap-px">
                  {[1, 2, 3].map((n) => <span key={n} className={cn("h-full w-1 rounded-sm", scores[k] >= n ? "bg-brand" : "bg-surface-sunken")} style={{ height: `${n * 33}%` }} />)}
                </div>
                <div className="text-[9px] text-ink-soft">{k}</div>
              </div>
            ))}
          </div>
        )}
      </dd>
    </div>
  );
}

function Gate({ label, value }: { label: string; value: string }) {
  const ok = value === "pass";
  return <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", ok ? "bg-good-soft text-good" : value === "provisional" ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad")}>{label} {value}</span>;
}

function AngleCard({ angle, muted }: { angle: AngleRow; muted?: boolean }) {
  const c = candidateOf(angle);
  return (
    <div className={cn("rounded-lg border border-line p-2.5 text-sm", muted && "opacity-75")}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-ink">{c.big_idea ?? c.promise ?? angle.thesis ?? "Candidate"}</span>
        {angle.total != null && <span className="shrink-0 text-xs text-ink-muted">{Number(angle.total)}</span>}
      </div>
      {c.promise && c.big_idea && <p className="mt-0.5 text-xs text-ink-muted">{c.promise}</p>}
      {c.mechanism && <p className="mt-0.5 text-xs text-ink-muted"><span className="text-ink">Mechanism:</span> {c.mechanism}</p>}
    </div>
  );
}

function Group({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{icon}{title}{subtitle && <span className="font-normal normal-case tracking-normal text-ink-soft">· {subtitle}</span>}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value, strong }: { label: string; value: string | null | undefined; strong?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className={cn("mt-0.5 text-ink", strong && "font-semibold")}>{value}</dd>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-ink-muted">{children}</p>;
}
