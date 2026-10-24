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
import { shortDate, truncate } from "@/components/admin/fmt";
import { listExamples, countMissingEmbeddings, EXAMPLE_STATUSES, AWARENESS_LEVELS, LEAD_TYPES, RIGHTS_STATUSES } from "@/lib/data/admin";
import { embedRows, importExamples } from "@/lib/actions/admin";
import { FORMAT_IDS } from "@/lib/formats";

export const metadata = { title: "Teaching library" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (sp: SP, k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

export default async function LibraryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters = {
    q: one(sp, "q"),
    format: one(sp, "format"),
    status: one(sp, "status"),
    awareness: one(sp, "awareness"),
    lead_type: one(sp, "lead_type"),
    loser: one(sp, "loser"),
    rights: one(sp, "rights"),
    embedded: one(sp, "embedded"),
  };
  const [rows, missing] = await Promise.all([listExamples(filters), countMissingEmbeddings("examples")]);

  return (
    <>
      <PageHeader
        title="Teaching library"
        description="Examples are studied, never reproduced. Only curated examples with embeddings reach the drafter."
        actions={
          <>
            <ImportJsonDialog
              title="Import examples"
              description={
                <>
                  An array of records. Accepts examples-shaped records or the research/corpus controls shape (<code>id, title, author, format, market, funnel_position, source_url, rights_status, excerpt, full_text, structure, results, losing_variants, lessons, notes</code>). <code>structure</code>, <code>results</code> and <code>losing_variants</code> land in annotations; records whose <code>id</code> already exists in annotations.external_id are skipped. Imported examples start as drafts.
                </>
              }
              action={importExamples}
            />
            <ActionButton variant="outline" size="sm" action={embedRows.bind(null, "examples", undefined)} disabled={missing === 0} pendingLabel="Embedding…">
              <Sparkles className="h-4 w-4" /> Embed all missing ({missing})
            </ActionButton>
            <Button asChild size="sm">
              <Link href="/admin/library/new">
                <Plus className="h-4 w-4" /> New example
              </Link>
            </Button>
          </>
        }
      />

      <FilterBar
        searchPlaceholder="Search title, author, market…"
        fields={[
          { name: "format", label: "Format", options: FORMAT_IDS },
          { name: "status", label: "Status", options: EXAMPLE_STATUSES },
          { name: "awareness", label: "Awareness", options: AWARENESS_LEVELS },
          { name: "lead_type", label: "Lead", options: LEAD_TYPES },
          { name: "loser", label: "Loser", options: ["yes", "no"] },
          { name: "rights", label: "Rights", options: RIGHTS_STATUSES },
          { name: "embedded", label: "Embedded", options: ["yes", "no"] },
        ]}
      />

      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Awareness</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Loser</TableHead>
              <TableHead>Rights</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Embedded</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-ink-soft">
                  No examples match. Create one or import a JSON file.
                </TableCell>
              </TableRow>
            )}
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <Link href={`/admin/library/${e.id}`} className="font-medium text-ink hover:text-brand">
                    {e.title}
                  </Link>
                  <div className="text-xs text-ink-muted">{[e.author, e.market].filter(Boolean).join(" · ")}</div>
                  {e.argument_sentence && <div className="mt-0.5 max-w-md text-xs text-ink-soft">{truncate(e.argument_sentence, 110)}</div>}
                </TableCell>
                <TableCell className="font-mono text-xs">{e.format}</TableCell>
                <TableCell className="text-xs">{e.awareness?.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-xs">{e.lead_type?.replace(/_/g, " ")}</TableCell>
                <TableCell>{e.is_loser ? <StatusBadge value="loser" className="bg-warn-soft text-warn" /> : <span className="text-xs text-ink-soft">—</span>}</TableCell>
                <TableCell>
                  <StatusBadge value={e.rights_status} />
                </TableCell>
                <TableCell>
                  <StatusBadge value={e.status} />
                </TableCell>
                <TableCell>
                  <YesNo value={e.has_embedding} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-ink-muted">{shortDate(e.updated_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
      <p className="mt-2 text-xs text-ink-soft">{rows.length} example(s) shown.</p>
    </>
  );
}
