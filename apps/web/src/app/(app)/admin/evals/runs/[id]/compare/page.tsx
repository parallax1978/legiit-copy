import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { BlindCompare } from "@/components/admin/blind-compare";
import { NativeSelect } from "@/components/admin/form-bits";
import { getEvalRun, getComparePairs } from "@/lib/data/admin";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Blind compare" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function ComparePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const [{ id }, sp, user] = await Promise.all([params, searchParams, requireUser()]);
  const { run, baselineRuns } = await getEvalRun(id);
  if (!run) notFound();
  const baselineId = typeof sp.baseline === "string" ? sp.baseline : undefined;
  const candidates = baselineRuns.filter((b) => b.id !== run.id);
  const baseline = candidates.find((b) => b.id === baselineId) ?? null;

  const render = (md: string | null) => marked.parse((md ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;"), { async: false, gfm: true, breaks: true }) as string;
  const data = baseline ? await getComparePairs(run.id, baseline.id, user.id) : null;
  const pairs = (data?.pairs ?? []).map((p) => ({
    brief_id: p.brief_id,
    brief_name: p.brief_name,
    format: p.format,
    left: { id: p.left.id, html: render(p.left.markdown) },
    right: { id: p.right.id, html: render(p.right.markdown) },
  }));

  return (
    <>
      <PageHeader
        title="Blind comparison"
        description={
          <>
            <span className="font-medium text-ink">{run.name}</span> vs {baseline ? <span className="font-medium text-ink">{baseline.name}</span> : "a baseline run"}. Outputs are unlabeled and randomly ordered. Pick the one a skeptical stranger would buy from and write one line why; every pick is stored as a human engine_vs_baseline comparison.
          </>
        }
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/evals/runs/${run.id}`}>Back to run</Link>
          </Button>
        }
      />

      {!baseline && (
        <form method="get" className="mb-6 flex flex-wrap items-end gap-2 rounded-card border border-line bg-surface p-4 shadow-card">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="baseline" className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Baseline run
            </label>
            <NativeSelect id="baseline" name="baseline" defaultValue={candidates[0]?.id}>
              {candidates.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.status})
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" size="sm" disabled={candidates.length === 0}>
            Start
          </Button>
          {candidates.length === 0 && <p className="w-full text-xs text-ink-muted">No baseline run exists yet.</p>}
        </form>
      )}

      {baseline && <BlindCompare pairs={pairs} alreadyJudged={data?.judged ?? 0} />}
    </>
  );
}
