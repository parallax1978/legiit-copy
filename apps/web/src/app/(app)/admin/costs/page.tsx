import Link from "next/link";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/admin/action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { Section, StatGrid, StatTile, TableCard } from "@/components/admin/stat-tile";
import { money, int, ms, dayOnly, shortDate, ago, shortId, truncate } from "@/components/admin/fmt";
import { getCostByStep, latencyByStep, getTopGenerationsByCost, getWorkspaceCostsThisMonth, getActiveJobs, getFailedJobs, isStuck } from "@/lib/data/admin";
import { retryGeneration } from "@/lib/actions/admin";

export const metadata = { title: "Costs and jobs" };
export const dynamic = "force-dynamic";

export default async function CostsPage() {
  const [costRows, topGenerations, workspaceCosts, activeJobs, failedJobs] = await Promise.all([getCostByStep(30), getTopGenerationsByCost(50), getWorkspaceCostsThisMonth(), getActiveJobs(), getFailedJobs(50)]);
  const latency = latencyByStep(costRows);
  const total30 = costRows.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
  const calls30 = costRows.reduce((s, r) => s + Number(r.calls ?? 0), 0);
  const now = Date.now();
  const stuck = activeJobs.filter((g) => isStuck(g, now));

  return (
    <>
      <PageHeader title="Costs and jobs" description="llm_calls is the source of truth for spend. Jobs: generations in the queue, running, stuck or failed." />

      <StatGrid className="mb-6">
        <StatTile label="Spend, 30 days" value={money(total30)} sub={`${int(calls30)} model calls`} />
        <StatTile label="Running" value={int(activeJobs.filter((g) => g.status === "running").length)} sub={`${int(activeJobs.filter((g) => g.status === "queued").length)} queued`} tone="brand" />
        <StatTile label="Stuck (> 30 min)" value={int(stuck.length)} tone={stuck.length ? "bad" : "good"} sub="the sweeper fails them at 30 min of inactivity" />
        <StatTile label="Failed" value={int(failedJobs.length)} tone={failedJobs.length ? "bad" : "good"} sub="latest 50" />
      </StatGrid>

      <Section title="Jobs: queued and running" description="Age is time since creation; last activity is the last update to the generation row." className="scroll-mt-20" >
        <div id="jobs" />
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Generation</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current step</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeJobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-sm text-ink-soft">
                    Nothing queued or running.
                  </TableCell>
                </TableRow>
              )}
              {activeJobs.map((g) => {
                const s = isStuck(g, now);
                return (
                  <TableRow key={g.id} className={s ? "bg-bad-soft/40" : undefined}>
                    <TableCell>
                      <Link href={`/admin/costs/generations/${g.id}`} className="font-mono text-xs text-brand hover:underline">
                        {shortId(g.id)}
                      </Link>
                      <div className="text-xs text-ink-muted">{g.offers?.name}</div>
                    </TableCell>
                    <TableCell className="text-xs">{g.workspaces?.name}</TableCell>
                    <TableCell className="font-mono text-xs">{g.format}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        <StatusBadge value={g.status} />
                        {s && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-bad-soft px-2 py-0.5 text-xs font-medium text-bad">
                            <AlertTriangle className="h-3 w-3" /> stuck
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {g.current_step}
                      {g.progress_message && <div className="max-w-xs truncate text-xs font-sans text-ink-soft">{g.progress_message}</div>}
                    </TableCell>
                    <TableCell className="text-xs">{ago(g.created_at, now)}</TableCell>
                    <TableCell className="text-xs">{ago(g.updated_at, now)} ago</TableCell>
                    <TableCell className="text-right text-xs">{money(g.cost_usd)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableCard>
      </Section>

      <Section title="Jobs: failed" description="Retry re-queues from the step that failed (current_step).">
        <div id="failed" />
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Generation</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {failedJobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-ink-soft">
                    No failed generations.
                  </TableCell>
                </TableRow>
              )}
              {failedJobs.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>
                    <Link href={`/admin/costs/generations/${g.id}`} className="font-mono text-xs text-brand hover:underline">
                      {shortId(g.id)}
                    </Link>
                    <div className="text-xs text-ink-muted">{g.offers?.name}</div>
                  </TableCell>
                  <TableCell className="text-xs">{g.workspaces?.name}</TableCell>
                  <TableCell className="font-mono text-xs">{g.format}</TableCell>
                  <TableCell className="font-mono text-xs">{g.current_step}</TableCell>
                  <TableCell className="max-w-md text-xs text-bad" title={g.error ?? ""}>
                    {truncate(g.error, 140)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-ink-muted">{shortDate(g.updated_at)}</TableCell>
                  <TableCell>
                    <ActionButton size="sm" variant="outline" action={retryGeneration.bind(null, g.id)}>
                      <RotateCcw className="h-4 w-4" /> Retry
                    </ActionButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      </Section>

      <Section title="Cost by day, step and model" description="llm_cost_by_step, last 30 days.">
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Input tokens</TableHead>
                <TableHead className="text-right">Output tokens</TableHead>
                <TableHead className="text-right">Avg latency</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-sm text-ink-soft">
                    No model calls in the last 30 days.
                  </TableCell>
                </TableRow>
              )}
              {costRows.map((r, i) => (
                <TableRow key={`${r.day}-${r.step}-${r.model}-${i}`}>
                  <TableCell className="whitespace-nowrap text-xs">{dayOnly(r.day)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.step ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.model}</TableCell>
                  <TableCell className="text-right text-xs">{int(r.calls)}</TableCell>
                  <TableCell className="text-right text-xs">{int(r.input_tokens)}</TableCell>
                  <TableCell className="text-right text-xs">{int(r.output_tokens)}</TableCell>
                  <TableCell className="text-right text-xs">{ms(r.avg_latency_ms)}</TableCell>
                  <TableCell className="text-right text-xs font-medium">{money(r.cost_usd)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Latency by step" description="Call-weighted average over the last 30 days.">
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Step</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Avg latency</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latency.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-sm text-ink-soft">
                      No data.
                    </TableCell>
                  </TableRow>
                )}
                {latency.map((l) => (
                  <TableRow key={l.step}>
                    <TableCell className="font-mono text-xs">{l.step}</TableCell>
                    <TableCell className="text-right text-xs">{int(l.calls)}</TableCell>
                    <TableCell className="text-right text-xs">{ms(l.avg_latency_ms)}</TableCell>
                    <TableCell className="text-right text-xs font-medium">{money(l.cost_usd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        </Section>

        <Section title="Per workspace this month" description="workspace_usage_monthly (usage_events, recorded once per completed step).">
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead className="text-right">Generations</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspaceCosts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-sm text-ink-soft">
                      No usage recorded this month.
                    </TableCell>
                  </TableRow>
                )}
                {workspaceCosts.map((w) => (
                  <TableRow key={w.workspace_id}>
                    <TableCell className="text-xs">
                      {w.workspace_name}
                      <div className="font-mono text-[10px] text-ink-soft">{w.workspace_id}</div>
                    </TableCell>
                    <TableCell className="text-right text-xs">{int(w.generations)}</TableCell>
                    <TableCell className="text-right text-xs">{int(w.tokens)}</TableCell>
                    <TableCell className="text-right text-xs font-medium">{money(w.cost_usd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        </Section>
      </div>

      <Section title="Cost per generation, top 50" description="Opening a generation records an admin_view audit row.">
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Generation</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Input</TableHead>
                <TableHead className="text-right">Output</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topGenerations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-sm text-ink-soft">
                    No generations yet.
                  </TableCell>
                </TableRow>
              )}
              {topGenerations.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>
                    <Link href={`/admin/costs/generations/${g.id}`} className="font-mono text-xs text-brand hover:underline">
                      {shortId(g.id)}
                    </Link>
                    <div className="text-xs text-ink-muted">{g.offers?.name}</div>
                  </TableCell>
                  <TableCell className="text-xs">{g.workspaces?.name}</TableCell>
                  <TableCell className="font-mono text-xs">{g.format}</TableCell>
                  <TableCell>
                    <StatusBadge value={g.status} />
                  </TableCell>
                  <TableCell className="text-right text-xs">{int(g.input_tokens)}</TableCell>
                  <TableCell className="text-right text-xs">{int(g.output_tokens)}</TableCell>
                  <TableCell className="text-right text-xs font-medium">{money(g.cost_usd)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-ink-muted">{shortDate(g.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      </Section>
    </>
  );
}
