import Link from "next/link";
import { notFound } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/admin/action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { Section, StatGrid, StatTile, TableCard } from "@/components/admin/stat-tile";
import { money, int, ms, shortDate, truncate, jsonPretty, asStringArray } from "@/components/admin/fmt";
import { getGenerationForAdmin, isStuck } from "@/lib/data/admin";
import { recordAdminView, retryStep } from "@/lib/actions/admin";

export const metadata = { title: "Generation (admin)" };
export const dynamic = "force-dynamic";

export default async function AdminGenerationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { generation, steps, calls } = await getGenerationForAdmin(id);
  if (!generation) notFound();
  // Every admin view of customer data leaves an audit row.
  await recordAdminView("generation", generation.id, generation.workspace_id, { format: generation.format, status: generation.status });

  const stepOrder = asStringArray(generation.step_order);
  const retryable = ["needs_input", "failed", "completed", "cancelled"].includes(generation.status);
  const callCost = calls.reduce((s, c) => s + Number(c.cost_usd), 0);

  return (
    <>
      <PageHeader
        title={
          <span className="font-mono text-xl">
            {generation.id.slice(0, 8)} <span className="text-base font-sans font-normal text-ink-muted">{generation.format}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge value={generation.status} />
            {isStuck(generation) && <StatusBadge value="stuck" />}
            <span className="text-xs">
              {generation.workspaces?.name} · {generation.offers?.name}
            </span>
            <span className="text-xs text-ink-soft">created {shortDate(generation.created_at)}</span>
            <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-medium text-warn">admin view logged</span>
          </span>
        }
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/costs">Back to costs and jobs</Link>
          </Button>
        }
      />

      <StatGrid className="mb-6">
        <StatTile label="Cost" value={money(generation.cost_usd)} sub={`${money(callCost)} across ${int(calls.length)} calls`} />
        <StatTile label="Tokens" value={`${int(generation.input_tokens)} / ${int(generation.output_tokens)}`} sub="input / output" />
        <StatTile label="Current step" value={<span className="font-mono text-lg">{generation.current_step ?? "—"}</span>} sub={truncate(generation.progress_message, 60)} />
        <StatTile label="Completed" value={generation.completed_at ? shortDate(generation.completed_at) : "—"} sub={generation.error ? truncate(generation.error, 60) : undefined} tone={generation.error ? "bad" : "neutral"} />
      </StatGrid>

      {generation.error && (
        <div className="mb-6 rounded-card border border-bad/30 bg-bad-soft p-4 text-sm text-bad">
          <span className="font-semibold">Error:</span> {generation.error}
        </div>
      )}

      <Section title="Steps" description={`Order: ${stepOrder.join(" → ") || "default"}. Retry re-queues from that step (requires the generation to be failed, needs_input, completed or cancelled).`}>
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Step</TableHead>
                <TableHead>Attempt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {steps.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-6 text-center text-sm text-ink-soft">
                    No step attempts recorded.
                  </TableCell>
                </TableRow>
              )}
              {steps.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">
                    {s.step}
                    {s.output !== null && (
                      <details className="mt-1">
                        <summary className="cursor-pointer font-sans text-xs text-ink-muted hover:text-ink">output</summary>
                        <pre className="mt-2 max-h-72 max-w-2xl overflow-auto rounded-md bg-surface-sunken p-3 font-mono text-xs">{jsonPretty(s.output)}</pre>
                      </details>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{s.attempt}</TableCell>
                  <TableCell>
                    <StatusBadge value={s.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{s.model}</TableCell>
                  <TableCell className="text-right text-xs">
                    {int(s.input_tokens)} / {int(s.output_tokens)}
                  </TableCell>
                  <TableCell className="text-right text-xs">{money(s.cost_usd)}</TableCell>
                  <TableCell className="text-right text-xs">{s.duration_ms !== null ? ms(s.duration_ms) : "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-ink-muted">{shortDate(s.started_at)}</TableCell>
                  <TableCell className="max-w-xs text-xs text-bad" title={s.error ?? ""}>
                    {truncate(s.error, 100)}
                  </TableCell>
                  <TableCell>
                    <ActionButton size="xs" variant="outline" action={retryStep.bind(null, generation.id, s.step)} disabled={!retryable}>
                      <RotateCcw className="h-3 w-3" /> Retry
                    </ActionButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      </Section>

      <Section title="Model calls" description="Every call through engine/llm.ts for this generation.">
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">In / out</TableHead>
                <TableHead className="text-right">Cache r/w</TableHead>
                <TableHead className="text-right">Searches</TableHead>
                <TableHead className="text-right">Latency</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Stop</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-6 text-center text-sm text-ink-soft">
                    No model calls logged.
                  </TableCell>
                </TableRow>
              )}
              {calls.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap text-xs text-ink-muted">{shortDate(c.created_at)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {c.step}
                    {c.attempt !== null && <span className="text-ink-soft"> #{c.attempt}</span>}
                  </TableCell>
                  <TableCell className="text-xs">{c.purpose}</TableCell>
                  <TableCell className="font-mono text-xs">{c.model}</TableCell>
                  <TableCell className="text-right text-xs">
                    {int(c.input_tokens)} / {int(c.output_tokens)}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {int(c.cache_read_tokens)} / {int(c.cache_write_tokens)}
                  </TableCell>
                  <TableCell className="text-right text-xs">{int(c.web_searches)}</TableCell>
                  <TableCell className="text-right text-xs">{ms(c.latency_ms)}</TableCell>
                  <TableCell className="text-right text-xs font-medium">{money(c.cost_usd)}</TableCell>
                  <TableCell className="text-xs">{c.stop_reason}</TableCell>
                  <TableCell className="max-w-xs text-xs text-bad" title={c.error ?? ""}>
                    {truncate(c.error, 80)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      </Section>

      <Section title="Configuration">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-card border border-line bg-surface p-4 shadow-card">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Prompt version set</h3>
            <pre className="mt-2 max-h-48 overflow-auto font-mono text-xs">{jsonPretty(generation.prompt_version_set)}</pre>
          </div>
          <div className="rounded-card border border-line bg-surface p-4 shadow-card">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Model set</h3>
            <pre className="mt-2 max-h-48 overflow-auto font-mono text-xs">{jsonPretty(generation.model_set)}</pre>
          </div>
          <div className="rounded-card border border-line bg-surface p-4 shadow-card">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Options</h3>
            <pre className="mt-2 max-h-48 overflow-auto font-mono text-xs">{jsonPretty(generation.options)}</pre>
          </div>
        </div>
      </Section>
    </>
  );
}
