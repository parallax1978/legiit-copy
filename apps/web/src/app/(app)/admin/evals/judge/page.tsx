import { PageHeader } from "@/components/app/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubNav, EVAL_NAV } from "@/components/admin/sub-nav";
import { JudgeHoldoutForm } from "@/components/admin/judge-holdout-form";
import { CalibrationHistory, JUDGE_TARGET } from "@/components/admin/calibration-history";
import { Section, StatGrid, StatTile, TableCard } from "@/components/admin/stat-tile";
import { pct, shortDate, shortId, truncate, int } from "@/components/admin/fmt";
import { listHoldoutPairs, listJudgeCalibrations, listRecentJudgeComparisons } from "@/lib/data/admin";

export const metadata = { title: "Judge" };
export const dynamic = "force-dynamic";

export default async function JudgePage() {
  const [pairs, calibrations, recent] = await Promise.all([listHoldoutPairs(), listJudgeCalibrations(50), listRecentJudgeComparisons(40)]);
  const latest = calibrations[0] ?? null;
  const latestAcc = latest ? Number(latest.accuracy ?? 0) : null;
  const scored = recent.filter((c) => c.correct !== null);
  const recentAcc = scored.length ? scored.filter((c) => c.correct).length / scored.length : null;
  const pairById = new Map(pairs.map((p) => [p.id, p]));

  return (
    <>
      <PageHeader title="Judge calibration" description="The judge must pick the documented winner on holdout split tests at 70% or better before its verdicts count. Thresholds: review flag below 70%, production pre-screen only at 75% agreement over the latest 40 comparisons." />
      <SubNav items={EVAL_NAV} />

      <StatGrid className="mb-6">
        <StatTile label="Latest calibration" value={latestAcc === null ? "—" : pct(latestAcc)} sub={latest ? `${latest.correct}/${latest.pairs_evaluated} · ${shortDate(latest.created_at)}` : "none yet"} tone={latestAcc === null ? "neutral" : latestAcc >= JUDGE_TARGET ? "good" : "bad"} />
        <StatTile label="Last 40 judge picks" value={recentAcc === null ? "—" : pct(recentAcc)} sub={`${scored.length} scored against ground truth`} tone={recentAcc === null ? "neutral" : recentAcc >= 0.75 ? "good" : recentAcc >= JUDGE_TARGET ? "warn" : "bad"} />
        <StatTile label="Holdout pairs" value={int(pairs.length)} sub="never shown to prompts" />
        <StatTile label="Calibration runs" value={int(calibrations.length)} />
      </StatGrid>

      <Section title="Run the judge on holdout pairs" description="judge {pair_ids} scores each pick against the documented winner and writes a judge_calibrations row.">
        <JudgeHoldoutForm pairs={pairs} />
      </Section>

      <Section title="Accuracy over time">
        <CalibrationHistory rows={calibrations} />
      </Section>

      <Section title="Recent judge picks on split tests">
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead>Pick</TableHead>
                <TableHead>Truth</TableHead>
                <TableHead>Correct</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-ink-soft">
                    The judge has not scored any split-test pair yet.
                  </TableCell>
                </TableRow>
              )}
              {recent.map((c) => {
                const p = pairById.get(c.split_test_pair_id ?? "");
                return (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap text-xs text-ink-muted">{shortDate(c.created_at)}</TableCell>
                    <TableCell className="max-w-xs text-xs">{p ? `${p.format} · ${p.element_tested}` : shortId(c.split_test_pair_id)}</TableCell>
                    <TableCell className="font-mono text-xs uppercase">{c.winner}</TableCell>
                    <TableCell className="font-mono text-xs uppercase">{c.ground_truth}</TableCell>
                    <TableCell className={c.correct === null ? "text-xs text-ink-soft" : c.correct ? "text-xs font-semibold text-good" : "text-xs font-semibold text-bad"}>{c.correct === null ? "—" : c.correct ? "yes" : "no"}</TableCell>
                    <TableCell className="font-mono text-xs">{c.judge_model}</TableCell>
                    <TableCell className="max-w-sm text-xs text-ink-muted" title={c.reason ?? ""}>
                      {truncate(c.reason, 120)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableCard>
      </Section>
    </>
  );
}
