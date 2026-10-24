import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubNav, EVAL_NAV } from "@/components/admin/sub-nav";
import { ImportJsonDialog } from "@/components/admin/import-json-dialog";
import { TableCard } from "@/components/admin/stat-tile";
import { asStringArray, shortDate, truncate } from "@/components/admin/fmt";
import { listEvalBriefs } from "@/lib/data/admin";
import { importEvalBriefs } from "@/lib/actions/admin";

export const metadata = { title: "Eval briefs" };
export const dynamic = "force-dynamic";

export default async function EvalBriefsPage() {
  const briefs = await listEvalBriefs();
  return (
    <>
      <PageHeader
        title="Eval briefs"
        description="15–20 offers the teaching library has never seen, across markets and formats. Never add one to the library."
        actions={
          <>
            <ImportJsonDialog
              title="Import eval briefs"
              description={
                <>
                  Array of <code>{"{ id → external_id, name, market, formats: [], brief: {...}, notes }"}</code>. A record without a <code>brief</code> field is stored whole as the brief. Existing external_ids are updated.
                </>
              }
              action={importEvalBriefs}
            />
            <Button asChild size="sm">
              <Link href="/admin/evals/briefs/new">
                <Plus className="h-4 w-4" /> New brief
              </Link>
            </Button>
          </>
        }
      />
      <SubNav items={EVAL_NAV} />
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Formats</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {briefs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-ink-soft">
                  No briefs yet.
                </TableCell>
              </TableRow>
            )}
            {briefs.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <Link href={`/admin/evals/briefs/${b.id}`} className="font-medium text-ink hover:text-brand">
                    {b.name}
                  </Link>
                  {b.external_id && <div className="font-mono text-xs text-ink-soft">{b.external_id}</div>}
                </TableCell>
                <TableCell className="text-xs">{b.market}</TableCell>
                <TableCell className="font-mono text-xs text-ink-muted">{asStringArray(b.formats).join(", ")}</TableCell>
                <TableCell className="max-w-sm text-xs text-ink-muted">{truncate(b.notes, 100)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-ink-muted">{shortDate(b.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
    </>
  );
}
