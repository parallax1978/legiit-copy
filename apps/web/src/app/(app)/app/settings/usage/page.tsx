import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Info } from "lucide-react";
import { requireWorkspace } from "@/lib/auth";
import { getUsageData, formatUsd, formatInt, formatLabel } from "@/lib/data/dashboard";
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
  const total = usage.monthly.reduce((s, m) => s + m.costUsd, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p>
          Usage is metered, not limited. Every completed pipeline step records its tokens and model cost once, so retries never double count. Per-workspace limits are not enforced yet; nothing here blocks a run.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By month</CardTitle>
          <CardDescription>Pieces completed, tokens used and model cost for {workspace.name}. Lifetime cost {formatUsd(total)}.</CardDescription>
        </CardHeader>
        <CardContent>
          {usage.monthly.length === 0 ? (
            <p className="text-sm text-ink-muted">No usage recorded yet. The first completed step will start the meter.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Pieces completed</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.monthly.map((m) => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium text-ink">{m.month ? monthLabel(m.month) : "Unknown"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInt(m.generations)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInt(m.tokens)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatUsd(m.costUsd)}</TableCell>
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
          <CardDescription>
            What each piece of copy cost to research, argue, draft and review.
            {usage.otherCostUsd > 0 && <> Another {formatUsd(usage.otherCostUsd)} went to offer ingestion, rewrites and exports outside a piece.</>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usage.perGeneration.length === 0 ? (
            <p className="text-sm text-ink-muted">No pieces have recorded usage yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Piece</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Steps</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
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
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatInt(g.steps)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatInt(g.tokens)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatUsd(g.costUsd)}</TableCell>
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
