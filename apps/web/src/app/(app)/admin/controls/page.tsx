import { ExternalLink, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar } from "@/components/admin/filter-bar";
import { ImportJsonDialog } from "@/components/admin/import-json-dialog";
import { ActionButton } from "@/components/admin/action-button";
import { ControlDrawer } from "@/components/admin/control-drawer";
import { HoldoutSwitch } from "@/components/admin/holdout-switch";
import { StatusBadge } from "@/components/admin/status-badge";
import { Section, TableCard } from "@/components/admin/stat-tile";
import { truncate } from "@/components/admin/fmt";
import { listControls, listSplitTestPairs } from "@/lib/data/admin";
import { deleteSplitTest, importControls, importSplitTests } from "@/lib/actions/admin";

export const metadata = { title: "Controls" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (sp: SP, k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

export default async function ControlsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [controls, pairs] = await Promise.all([
    listControls({ q: one(sp, "q"), format: one(sp, "format") }),
    listSplitTestPairs({ q: one(sp, "q"), format: one(sp, "format"), holdout: one(sp, "holdout") }),
  ]);
  const formats = [...new Set([...controls.map((c) => c.format), ...pairs.map((p) => p.format ?? "")].filter(Boolean))].sort();
  const resultsType = (r: unknown) => (r && typeof r === "object" && "type" in (r as object) ? String((r as { type: unknown }).type) : "");

  return (
    <>
      <PageHeader
        title="Controls and split tests"
        description="Documented winners with their structure and results, and the split-test pairs that calibrate the standard. Holdout pairs are reserved for the judge and never shown to prompts."
        actions={
          <>
            <ImportJsonDialog
              title="Import controls"
              description={
                <>
                  Array of research/corpus control records: <code>id → external_id, title, author, format, market, funnel_position, traffic, source_url, rights_status, excerpt (≤400), full_text (only public_domain/licensed), structure, results, losing_variants, lessons, notes, verification</code>. Existing external_ids are updated.
                </>
              }
              action={importControls}
              triggerLabel="Import controls"
            />
            <ImportJsonDialog
              title="Import split-test pairs"
              description={
                <>
                  Array in the <code>research/corpus/split_tests_*.json</code> shape: <code>id → external_id, source, source_url, format, element_tested, variant_a, variant_b, winner (a|b), lift, metric, sample_size, confidence, why_it_won, principle, contradicts_standard, verification</code>. Pairs start with holdout off.
                </>
              }
              action={importSplitTests}
              triggerLabel="Import split tests"
            />
          </>
        }
      />

      <FilterBar
        searchPlaceholder="Search title, author, element, source…"
        fields={[
          { name: "format", label: "Format", options: formats },
          { name: "holdout", label: "Holdout", options: ["yes", "no"] },
        ]}
      />

      <Section title={`Controls (${controls.length})`} description="Click a title for structure, results, losing variants and lessons.">
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Rights</TableHead>
                <TableHead>Scope</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {controls.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-ink-soft">
                    No controls yet. Import the corpus records to start.
                  </TableCell>
                </TableRow>
              )}
              {controls.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="max-w-sm">
                    <ControlDrawer control={c} />
                    <div className="text-xs text-ink-muted">{[c.market, c.funnel_position, c.traffic].filter(Boolean).join(" · ")}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.format}</TableCell>
                  <TableCell className="text-xs">{c.author}</TableCell>
                  <TableCell className="text-xs">{resultsType(c.results) || <span className="text-ink-soft">—</span>}</TableCell>
                  <TableCell className="text-xs">{c.verification}</TableCell>
                  <TableCell>
                    <StatusBadge value={c.rights_status} />
                  </TableCell>
                  <TableCell className="text-xs text-ink-muted">{c.workspace_id ? "workspace" : "global"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      </Section>

      <Section title={`Split-test pairs (${pairs.length})`} description={`${pairs.filter((p) => p.holdout).length} reserved as holdout for judge calibration.`}>
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Format</TableHead>
                <TableHead>Element</TableHead>
                <TableHead>Variant A</TableHead>
                <TableHead>Variant B</TableHead>
                <TableHead>Winner</TableHead>
                <TableHead>Lift</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Holdout</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pairs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-ink-soft">
                    No split-test pairs match.
                  </TableCell>
                </TableRow>
              )}
              {pairs.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">
                    {p.format}
                    {p.contradicts_standard && <span className="ml-1 rounded-full bg-warn-soft px-1.5 text-[10px] text-warn">contradicts</span>}
                  </TableCell>
                  <TableCell className="text-xs">{p.element_tested}</TableCell>
                  <TableCell className="max-w-xs text-xs text-ink-muted" title={p.variant_a ?? ""}>
                    {truncate(p.variant_a, 90)}
                  </TableCell>
                  <TableCell className="max-w-xs text-xs text-ink-muted" title={p.variant_b ?? ""}>
                    {truncate(p.variant_b, 90)}
                  </TableCell>
                  <TableCell className="font-mono text-xs uppercase">{p.winner}</TableCell>
                  <TableCell className="text-xs" title={p.lift ?? ""}>
                    {truncate(p.lift, 28)}
                  </TableCell>
                  <TableCell className="text-xs text-ink-muted">
                    {p.source_url ? (
                      <a href={p.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-brand">
                        {truncate(p.source, 28)} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      truncate(p.source, 28)
                    )}
                  </TableCell>
                  <TableCell>
                    <HoldoutSwitch id={p.id} holdout={p.holdout} />
                  </TableCell>
                  <TableCell>
                    <ActionButton variant="ghost" size="icon-sm" aria-label="Delete pair" action={deleteSplitTest.bind(null, p.id)} confirm="Delete this split-test pair?">
                      <Trash2 className="h-4 w-4 text-bad" />
                    </ActionButton>
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
