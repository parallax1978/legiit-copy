import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Info } from "lucide-react";
import { requireWorkspace } from "@/lib/auth";
import { getUsageData, formatInt, formatLabel } from "@/lib/data/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/dashboard/status-badge";

export const metadata = { title: "Usage" };

/** The view truncates to month in UTC; format in UTC so the label never slips into the previous month. */
function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function UsagePage() {
  const { workspace } = await requireWorkspace();
  const usage = await getUsageData(workspace.id);
  const totalPieces = usage.monthly.reduce((s, m) => s + m.generations, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p>
          Every piece you write is recorded here. Nothing on this page limits a run.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By month</CardTitle>
          <CardDescription>Pieces completed for {workspace.name}. {formatInt(totalPieces)} so far.</CardDescription>
        </CardHeader>
        <CardContent>
          {usage.monthly.length === 0 ? (
            <p className="text-sm text-ink-muted">Nothing written yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Pieces completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.monthly.map((m) => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium text-ink">{m.month ? monthLabel(m.month) : "Unknown"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInt(m.generations)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By piece</CardTitle>
          <CardDescription>Every piece, with how many pipeline steps it ran.</CardDescription>
        </CardHeader>
        <CardContent>
          {usage.perGeneration.length === 0 ? (
            <p className="text-sm text-ink-muted">No pieces yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Piece</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Steps</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.perGeneration.map((g) => (
                  <TableRow key={g.generationId}>
                    <TableCell>
                      <Link href={`/app/generations/${g.generationId}`} className="font-medium text-ink hover:text-brand-strong hover:underline">
                        {g.format ? formatLabel(g.format) : "Piece"}
                      </Link>
                      {g.offerName && <span className="text-ink-muted"> for {g.offerName}</span>}
                    </TableCell>
                    <TableCell>{g.status ? <StatusBadge status={g.status} /> : <span className="text-xs text-ink-soft">Unknown</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInt(g.steps)}</TableCell>
                    <TableCell className="hidden text-right text-ink-muted md:table-cell">{formatDistanceToNow(new Date(g.lastAt), { addSuffix: true })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
