import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatTile, StatGrid, Section, TableCard, LinkCard } from "@/components/admin/stat-tile";
import { StatusBadge } from "@/components/admin/status-badge";
import { ActionButton } from "@/components/admin/action-button";
import { money, int, pct, shortDate, shortId, truncate } from "@/components/admin/fmt";
import { getOverviewStats, getRecentFailedSteps } from "@/lib/data/admin";
import { retryStep } from "@/lib/actions/admin";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [stats, failedSteps] = await Promise.all([getOverviewStats(), getRecentFailedSteps(25)]);
  const judge = stats.latestJudge;
  const judgeAcc = judge ? Number(judge.accuracy ?? 0) : null;

  return (
    <>
      <PageHeader title="Admin overview" description="Pipeline health, spend and the teaching library at a glance." actions={<Button asChild variant="outline" size="sm"><Link href="/admin/settings">Settings</Link></Button>} />

      <StatGrid className="mb-6">
        <StatTile label="Generations today" value={int(stats.generationsToday)} sub={`${int(stats.generations7d)} in 7 days`} href="/admin/costs" />
        <StatTile label="Cost today" value={money(stats.costToday)} sub={`${money(stats.cost7d)} / 7d · ${money(stats.cost30d)} / 30d`} href="/admin/costs" />
        <StatTile label="Running" value={int(stats.runningJobs)} sub={`${int(stats.queuedJobs)} queued`} tone={stats.runningJobs ? "brand" : "neutral"} href="/admin/costs#jobs" />
        <StatTile label="Failed jobs" value={int(stats.failedJobs)} tone={stats.failedJobs ? "bad" : "good"} href="/admin/costs#failed" />
        <StatTile label="Library examples" value={int(stats.library.examples)} sub={`${int(stats.library.curated)} curated`} href="/admin/library" />
        <StatTile label="Critiques" value={int(stats.library.critiques)} href="/admin/critiques" />
        <StatTile label="Controls / split tests" value={`${int(stats.library.controls)} / ${int(stats.library.splitTests)}`} sub={`${int(stats.library.holdout)} holdout pairs`} href="/admin/controls" />
        <StatTile
          label="Judge accuracy"
          value={judgeAcc === null ? "—" : pct(judgeAcc)}
          sub={judge ? `${judge.correct}/${judge.pairs_evaluated} · ${shortDate(judge.created_at)}` : "no calibration yet"}
          tone={judgeAcc === null ? "neutral" : judgeAcc >= 0.7 ? "good" : "warn"}
          href="/admin/evals/judge"
        />
      </StatGrid>

      <Section title="Recent failed or interrupted steps" description="Retry re-queues the generation from that step through requeue_generation.">
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Generation</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {failedSteps.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-ink-soft">
                    No failed or interrupted steps.
                  </TableCell>
                </TableRow>
              )}
              {failedSteps.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-nowrap text-xs text-ink-muted">{shortDate(s.created_at)}</TableCell>
                  <TableCell>
                    <Link href={`/admin/costs/generations/${s.generation_id}`} className="font-mono text-xs text-brand hover:underline">
                      {shortId(s.generation_id)}
                    </Link>
                    <span className="ml-2 text-xs text-ink-muted">{s.generations?.format}</span>
                    {s.generations?.status && <StatusBadge value={s.generations.status} className="ml-2" />}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {s.step} <span className="text-ink-soft">#{s.attempt}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={s.status} />
                  </TableCell>
                  <TableCell className="max-w-md text-xs text-bad" title={s.error ?? ""}>
                    {truncate(s.error, 140)}
                  </TableCell>
                  <TableCell>
                    <ActionButton size="sm" variant="outline" action={retryStep.bind(null, s.generation_id, s.step)} disabled={s.generations?.status === "running" || s.generations?.status === "queued"}>
                      <RotateCcw className="h-4 w-4" /> Retry
                    </ActionButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      </Section>

      <Section title="Sections">
        <div className="grid gap-3 md:grid-cols-3">
          <LinkCard href="/admin/library" title="Teaching library" description="Curated examples with annotations, lessons and section embeddings." count={stats.library.curated} />
          <LinkCard href="/admin/critiques" title="Critiques" description="Before/after pairs with the defect named and the principle." count={stats.library.critiques} />
          <LinkCard href="/admin/controls" title="Controls and split tests" description="Documented winners, their structure, and holdout pairs for the judge." count={stats.library.controls} />
          <LinkCard href="/admin/prompts" title="Prompts" description="Versioned system prompts per step; one active per step." />
          <LinkCard href="/admin/evals" title="Evals and judge" description="Blind pairwise runs, baseline comparison, judge calibration." count={stats.library.briefs} />
          <LinkCard href="/admin/costs" title="Costs and jobs" description="Spend by step and model, per generation and workspace; running and stuck jobs." />
        </div>
      </Section>
    </>
  );
}
