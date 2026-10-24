import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilterBar } from "@/components/admin/filter-bar";
import { ImportJsonDialog } from "@/components/admin/import-json-dialog";
import { ActionButton } from "@/components/admin/action-button";
import { StatusBadge, YesNo } from "@/components/admin/status-badge";
import { TableCard } from "@/components/admin/stat-tile";
import { truncate } from "@/components/admin/fmt";
import { listCritiques, countMissingEmbeddings, EXAMPLE_STATUSES } from "@/lib/data/admin";
import { embedRows, importCritiques } from "@/lib/actions/admin";

export const metadata = { title: "Critiques" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (sp: SP, k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

export default async function CritiquesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [rows, missing] = await Promise.all([
    listCritiques({ q: one(sp, "q"), format: one(sp, "format"), status: one(sp, "status"), confidence: one(sp, "confidence"), embedded: one(sp, "embedded") }),
    countMissingEmbeddings("critiques"),
  ]);
  const formats = [...new Set(rows.map((r) => r.format).filter((f): f is string => !!f))].sort();

  return (
    <>
      <PageHeader
        title="Critiques"
        description="Before/after pairs from copy chiefs: the defect named, the fix, the principle, and the AI failure each one teaches against."
        actions={
          <>
            <ImportJsonDialog
              title="Import critique pairs"
              description={
                <>
                  Paste <code>research/critique_pairs_v0.json</code> (the whole file or its <code>pairs</code> array). Fields: <code>id → external_id, before → weak_draft, after → strong_revision, url → source_url</code>, plus chief, format, defect, defect_named, principle, reason, tested, evidence, confidence, ai_failure_map. Existing external_ids are updated in place.
                </>
              }
              action={importCritiques}
            />
            <ActionButton variant="outline" size="sm" action={embedRows.bind(null, "critiques", undefined)} disabled={missing === 0} pendingLabel="Embedding…">
              <Sparkles className="h-4 w-4" /> Embed all missing ({missing})
            </ActionButton>
            <Button asChild size="sm">
              <Link href="/admin/critiques/new">
                <Plus className="h-4 w-4" /> New critique
              </Link>
            </Button>
          </>
        }
      />

      <FilterBar
        searchPlaceholder="Search chief, defect, principle, id…"
        fields={[
          { name: "format", label: "Format", options: formats },
          { name: "status", label: "Status", options: EXAMPLE_STATUSES },
          { name: "confidence", label: "Confidence", options: ["high", "medium", "low", "unknown"] },
          { name: "embedded", label: "Embedded", options: ["yes", "no"] },
        ]}
      />

      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pair</TableHead>
              <TableHead>Chief</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Defect</TableHead>
              <TableHead>Tested</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Embedded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-ink-soft">
                  No critiques match.
                </TableCell>
              </TableRow>
            )}
            {rows.map((c) => {
              const tested = c.tested as { status?: string; result?: string } | null;
              return (
                <TableRow key={c.id}>
                  <TableCell className="max-w-sm">
                    <Link href={`/admin/critiques/${c.id}`} className="block text-sm font-medium text-ink hover:text-brand">
                      {c.external_id && <span className="mr-2 font-mono text-xs text-ink-soft">{c.external_id}</span>}
                      {truncate(c.defect_named ?? c.principle, 90)}
                    </Link>
                    <div className="mt-0.5 text-xs text-ink-muted">
                      <span className="text-bad">before:</span> {truncate(c.weak_draft, 70)}
                    </div>
                    <div className="text-xs text-ink-muted">
                      <span className="text-good">after:</span> {truncate(c.strong_revision, 70)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{c.chief}</TableCell>
                  <TableCell className="text-xs">{c.format}</TableCell>
                  <TableCell className="font-mono text-xs">{c.defect}</TableCell>
                  <TableCell className="max-w-xs text-xs text-ink-muted">{tested && typeof tested === "object" ? truncate(tested.result ?? tested.status ?? "", 60) : ""}</TableCell>
                  <TableCell>
                    <StatusBadge value={c.confidence} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={c.status} />
                  </TableCell>
                  <TableCell>
                    <YesNo value={c.has_embedding} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableCard>
      <p className="mt-2 text-xs text-ink-soft">{rows.length} critique(s) shown.</p>
    </>
  );
}
