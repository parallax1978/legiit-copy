import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubNav, EVAL_NAV } from "@/components/admin/sub-nav";
import { StatusBadge, YesNo } from "@/components/admin/status-badge";
import { Section, TableCard } from "@/components/admin/stat-tile";
import { EvalRunForm } from "@/components/admin/eval-run-form";
import { money, shortDate, int } from "@/components/admin/fmt";
import { listEvalRuns, getActivePromptVersions, listEvalBriefs } from "@/lib/data/admin";
import { FORMAT_IDS } from "@/lib/formats";
import { listFormats } from "@engine/formats/index.ts";
import { STEP_NAMES, STEP_DEFAULTS } from "@engine/config.ts";

export const metadata = { title: "Evals" };
export const dynamic = "force-dynamic";

export default async function EvalsPage() {
  const [runs, active, briefs] = await Promise.all([listEvalRuns(), getActivePromptVersions(), listEvalBriefs()]);
  const specIds = new Set(listFormats().map((f) => f.id));
  const modelSetDefault: Record<string, string> = {};
  for (const s of STEP_NAMES) modelSetDefault[s] = active[s]?.model ?? STEP_DEFAULTS[s].model;

  return (
    <>
      <PageHeader title="Evals and judge" description="The engine is done when it wins blind. Run the briefs, compare against a baseline, calibrate the judge." />
      <SubNav items={EVAL_NAV} />

      <Section title={`Runs (${runs.length})`} description={`${briefs.length} brief(s) available.`}>
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Baseline</TableHead>
                <TableHead>Formats</TableHead>
                <TableHead className="text-right">Outputs</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Finished</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-sm text-ink-soft">
                    No runs yet. Create one below.
                  </TableCell>
                </TableRow>
              )}
              {runs.map((r) => {
                const fmts = (r.model_set as { formats?: unknown } | null)?.formats;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/admin/evals/runs/${r.id}`} className="font-medium text-ink hover:text-brand">
                        {r.name}
                      </Link>
                      <div className="font-mono text-xs text-ink-soft">{r.id.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={r.status} />
                    </TableCell>
                    <TableCell>
                      <YesNo value={r.baseline} />
                    </TableCell>
                    <TableCell className="max-w-xs font-mono text-xs text-ink-muted">{Array.isArray(fmts) ? fmts.join(", ") : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{int(r.output_count)}</TableCell>
                    <TableCell className="text-right text-xs">{money(r.cost_usd)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-ink-muted">{shortDate(r.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-ink-muted">{shortDate(r.finished_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableCard>
      </Section>

      <EvalRunForm
        formats={FORMAT_IDS.map((id) => ({ id, hasSpec: specIds.has(id) }))}
        modelSetDefault={modelSetDefault}
        activeVersions={Object.values(active)
          .map((v) => ({ step: v.step, version: v.version, id: v.id }))
          .sort((x, y) => STEP_NAMES.indexOf(x.step as (typeof STEP_NAMES)[number]) - STEP_NAMES.indexOf(y.step as (typeof STEP_NAMES)[number]))}
      />
    </>
  );
}
