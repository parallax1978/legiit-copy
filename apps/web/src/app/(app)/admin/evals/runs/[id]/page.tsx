import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, Download, Trash2, Gavel, Scale, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/admin/action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { Section, StatGrid, StatTile, TableCard } from "@/components/admin/stat-tile";
import { Markdown } from "@/components/admin/markdown";
import { NativeSelect } from "@/components/admin/form-bits";
import { money, shortDate, int, asStringArray, jsonPretty, shortId, truncate } from "@/components/admin/fmt";
import { getEvalRun, listComparisonsForRun } from "@/lib/data/admin";
import { startEvalRun, collectEvalRun, deleteEvalRun, generateBaseline, judgeRunVsBaseline } from "@/lib/actions/admin";

export const metadata = { title: "Eval run" };
export const dynamic = "force-dynamic";

export default async function EvalRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ run, outputs, briefs, baselineRuns }, comparisons] = await Promise.all([getEvalRun(id), listComparisonsForRun(id)]);
  if (!run) notFound();
  const formats = asStringArray((run.model_set as { formats?: unknown } | null)?.formats);
  const briefById = new Map(briefs.map((b) => [b.id, b]));
  const outputsByBrief = new Map<string, typeof outputs>();
  for (const o of outputs) {
    const list = outputsByBrief.get(o.brief_id) ?? [];
    list.push(o);
    outputsByBrief.set(o.brief_id, list);
  }
  const otherBaselines = baselineRuns.filter((b) => b.id !== run.id);
  const outputIds = new Set(outputs.map((o) => o.id));
  const humanComparisons = comparisons.filter((c) => c.judged_by === "human");
  const judgeComparisons = comparisons.filter((c) => c.judged_by === "judge");
  const winsFor = (rows: typeof comparisons) => rows.filter((c) => (c.winner === "a" && outputIds.has(c.output_a ?? "")) || (c.winner === "b" && outputIds.has(c.output_b ?? ""))).length;
  const ties = (rows: typeof comparisons) => rows.filter((c) => c.winner === "tie").length;

  return (
    <>
      <PageHeader
        title={run.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge value={run.status} />
            {run.baseline && <StatusBadge value="baseline" className="bg-warn-soft text-warn" />}
            <span className="text-xs">created {shortDate(run.created_at)}</span>
            {run.finished_at && <span className="text-xs">· finished {shortDate(run.finished_at)}</span>}
            <span className="font-mono text-xs text-ink-soft">{run.id}</span>
          </span>
        }
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/evals">Back</Link>
            </Button>
            <ActionButton size="sm" action={startEvalRun.bind(null, run.id)} disabled={run.status === "running"} pendingLabel="Starting…">
              <Play className="h-4 w-4" /> {run.status === "queued" ? "Start" : "Start again"}
            </ActionButton>
            <ActionButton size="sm" variant="outline" action={collectEvalRun.bind(null, run.id)} pendingLabel="Collecting…">
              <Download className="h-4 w-4" /> Collect
            </ActionButton>
            <ActionButton size="sm" variant="destructive" action={deleteEvalRun.bind(null, run.id)} confirm="Delete this run and all its outputs and comparisons?">
              <Trash2 className="h-4 w-4" />
            </ActionButton>
          </>
        }
      />

      <StatGrid className="mb-6">
        <StatTile label="Outputs" value={int(outputs.length)} sub={`${briefs.length} briefs × ${formats.length} formats = ${int(briefs.length * formats.length)} expected`} />
        <StatTile label="Cost" value={money(run.cost_usd)} sub={`${money(outputs.reduce((s, o) => s + Number(o.cost_usd), 0))} summed over outputs`} />
        <StatTile label="Human verdicts" value={int(humanComparisons.length)} sub={`${winsFor(humanComparisons)} wins · ${ties(humanComparisons)} ties`} tone={humanComparisons.length ? "brand" : "neutral"} />
        <StatTile label="Judge verdicts" value={int(judgeComparisons.length)} sub={`${winsFor(judgeComparisons)} wins · ${ties(judgeComparisons)} ties`} />
      </StatGrid>

      {!run.baseline && (
        <Section title="Compare against a baseline" description="Blind pairwise screen for a human, and the judge on the same pairs.">
          {otherBaselines.length === 0 ? (
            <p className="rounded-card border border-dashed border-line-strong bg-surface p-4 text-sm text-ink-muted">
              No baseline run exists yet. Create a run with the baseline box checked, then generate baseline outputs for each brief and format.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <form method="get" action={`/admin/evals/runs/${run.id}/compare`} className="flex flex-wrap items-end gap-2 rounded-card border border-line bg-surface p-4 shadow-card">
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="baseline" className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Baseline run
                  </label>
                  <NativeSelect id="baseline" name="baseline" defaultValue={otherBaselines[0].id}>
                    {otherBaselines.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.status}, {shortDate(b.created_at)})
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <Button type="submit" size="sm">
                  <Scale className="h-4 w-4" /> Blind compare
                </Button>
              </form>
              <div className="flex flex-wrap items-end gap-2 rounded-card border border-line bg-surface p-4 shadow-card">
                <div className="flex-1 text-xs text-ink-muted">
                  Judge every brief+format pair of this run against the latest baseline run (<span className="font-medium text-ink">{otherBaselines[0].name}</span>), one judge call per pair, 20 pairs per click.
                </div>
                <ActionButton size="sm" variant="outline" action={judgeRunVsBaseline.bind(null, run.id, otherBaselines[0].id, 20)} pendingLabel="Judging…">
                  <Gavel className="h-4 w-4" /> Judge vs baseline
                </ActionButton>
              </div>
            </div>
          )}
        </Section>
      )}

      <Section title="Configuration">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-card border border-line bg-surface p-4 shadow-card">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Prompt version set</h3>
            <pre className="mt-2 max-h-48 overflow-auto font-mono text-xs">{jsonPretty(run.prompt_version_set)}</pre>
          </div>
          <div className="rounded-card border border-line bg-surface p-4 shadow-card">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Model set</h3>
            <pre className="mt-2 max-h-48 overflow-auto font-mono text-xs">{jsonPretty(run.model_set)}</pre>
          </div>
        </div>
      </Section>

      <Section title="Outputs per brief" description={run.baseline ? "Baseline outputs come from the single-prompt generator; generate any missing cell." : "Expand a cell to read the markdown."}>
        <div className="space-y-3">
          {briefs.map((b) => {
            const rows = outputsByBrief.get(b.id) ?? [];
            const briefFormats = formats.length ? formats : asStringArray(b.formats);
            return (
              <div key={b.id} className="rounded-card border border-line bg-surface shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2">
                  <div>
                    <Link href={`/admin/evals/briefs/${b.id}`} className="text-sm font-semibold text-ink hover:text-brand">
                      {b.name}
                    </Link>
                    {b.market && <span className="ml-2 text-xs text-ink-muted">{b.market}</span>}
                  </div>
                  <span className="text-xs text-ink-soft">
                    {rows.length}/{briefFormats.length} outputs
                  </span>
                </div>
                <div className="divide-y divide-line">
                  {briefFormats.map((f) => {
                    const o = rows.find((r) => r.format === f);
                    return (
                      <div key={f} className="px-4 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-xs">{f}</span>
                          <div className="flex items-center gap-2 text-xs text-ink-muted">
                            {o ? (
                              <>
                                <span>{money(o.cost_usd)}</span>
                                <span>{shortDate(o.created_at)}</span>
                              </>
                            ) : (
                              <span className="text-ink-soft">missing</span>
                            )}
                            {run.baseline && (
                              <ActionButton size="xs" variant="outline" action={generateBaseline.bind(null, run.id, b.id, f)} pendingLabel="Generating…">
                                <Wand2 className="h-3 w-3" /> {o ? "Regenerate" : "Generate baseline"}
                              </ActionButton>
                            )}
                          </div>
                        </div>
                        {o && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs text-brand hover:underline">{o.markdown ? `read (${int(o.markdown.split(/\s+/).length)} words)` : "no markdown; show raw output"}</summary>
                            <div className="mt-3 rounded-md border border-line bg-surface-alt p-4">
                              {o.markdown ? <Markdown source={o.markdown} /> : <pre className="max-h-96 overflow-auto font-mono text-xs">{jsonPretty(o.output)}</pre>}
                              {o.steps !== null && (
                                <details className="mt-3">
                                  <summary className="cursor-pointer text-xs text-ink-muted">steps</summary>
                                  <pre className="mt-2 max-h-72 overflow-auto font-mono text-xs">{jsonPretty(o.steps)}</pre>
                                </details>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {briefs.length === 0 && <p className="text-sm text-ink-soft">No briefs exist. Add briefs first.</p>}
        </div>
      </Section>

      <Section title={`Comparisons involving this run (${comparisons.length})`}>
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Judged by</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Brief</TableHead>
                <TableHead>A</TableHead>
                <TableHead>B</TableHead>
                <TableHead>Winner</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-sm text-ink-soft">
                    No comparisons yet.
                  </TableCell>
                </TableRow>
              )}
              {comparisons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap text-xs text-ink-muted">{shortDate(c.created_at)}</TableCell>
                  <TableCell>
                    <StatusBadge value={c.judged_by} />
                  </TableCell>
                  <TableCell className="text-xs">{c.kind.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-xs">{briefById.get(c.brief_id ?? "")?.name ?? shortId(c.brief_id)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {shortId(c.output_a)} {outputIds.has(c.output_a ?? "") && <span className="text-brand">(this run)</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {shortId(c.output_b)} {outputIds.has(c.output_b ?? "") && <span className="text-brand">(this run)</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs uppercase">{c.winner}</TableCell>
                  <TableCell className="max-w-sm text-xs text-ink-muted" title={c.reason ?? ""}>
                    {truncate(c.reason, 120)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      </Section>
    </>
  );
}
