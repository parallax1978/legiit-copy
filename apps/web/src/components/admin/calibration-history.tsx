import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JudgeCalibrationRow } from "@/lib/data/admin";
import { TableCard } from "./stat-tile";
import { pct, shortDate, shortId } from "./fmt";
import { cn } from "@/lib/utils";

export const JUDGE_TARGET = 0.7;

/** Accuracy over time with the 70% line. Table plus an inline bar per row; no chart library. */
export function CalibrationHistory({ rows }: { rows: JudgeCalibrationRow[] }) {
  const chronological = [...rows].reverse();
  return (
    <div className="space-y-4">
      {chronological.length > 0 && (
        <div className="rounded-card border border-line bg-surface p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between text-xs text-ink-muted">
            <span>Accuracy per calibration run (oldest → newest)</span>
            <span>
              <span className="inline-block h-2 w-4 border-t-2 border-dashed border-warn align-middle" /> {Math.round(JUDGE_TARGET * 100)}% target
            </span>
          </div>
          <div className="relative flex h-32 items-end gap-1 border-b border-line">
            <div className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-warn" style={{ bottom: `${JUDGE_TARGET * 100}%` }} />
            {chronological.slice(-40).map((r) => {
              const acc = Number(r.accuracy ?? 0);
              return (
                <div key={r.id} className="group relative flex-1" style={{ height: `${Math.max(2, acc * 100)}%` }} title={`${shortDate(r.created_at)}: ${pct(acc)} (${r.correct}/${r.pairs_evaluated})`}>
                  <div className={cn("h-full w-full rounded-t-sm", acc >= JUDGE_TARGET ? "bg-good/80" : "bg-bad/60")} />
                </div>
              );
            })}
          </div>
        </div>
      )}
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Judge model</TableHead>
              <TableHead>Prompt version</TableHead>
              <TableHead className="text-right">Pairs</TableHead>
              <TableHead className="text-right">Correct</TableHead>
              <TableHead className="text-right">Accuracy</TableHead>
              <TableHead>vs 70%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-sm text-ink-soft">
                  No calibration runs yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => {
              const acc = Number(r.accuracy ?? 0);
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{shortDate(r.created_at)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.judge_model}</TableCell>
                  <TableCell className="font-mono text-xs text-ink-muted">{shortId(r.judge_prompt_version_id) || "file"}</TableCell>
                  <TableCell className="text-right text-xs">{r.pairs_evaluated}</TableCell>
                  <TableCell className="text-right text-xs">{r.correct}</TableCell>
                  <TableCell className={cn("text-right text-sm font-semibold", acc >= JUDGE_TARGET ? "text-good" : "text-bad")}>{pct(acc, 1)}</TableCell>
                  <TableCell className="w-40">
                    <div className="relative h-2 w-full rounded-full bg-surface-sunken">
                      <div className={cn("h-2 rounded-full", acc >= JUDGE_TARGET ? "bg-good" : "bg-bad")} style={{ width: `${Math.min(100, acc * 100)}%` }} />
                      <div className="absolute top-[-3px] h-3.5 w-0.5 bg-warn" style={{ left: `${JUDGE_TARGET * 100}%` }} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
}
