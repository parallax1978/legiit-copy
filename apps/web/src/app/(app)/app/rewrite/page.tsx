import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireWorkspace, canEdit } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { RewriteForm } from "@/components/rewrite/rewrite-form";
import { listRewrites } from "@/lib/data/offers";
import { MIN_PAGE_WORDS } from "@/lib/page-format";

export const metadata = { title: "Rewrite a page" };
export const dynamic = "force-dynamic";
/** The page is read in a headless browser from the server action: a cold start plus a full page load fit in a minute. */
export const maxDuration = 60;

export default async function RewritePage({ searchParams }: { searchParams: Promise<{ offer?: string }> }) {
  const { offer: offerParam } = await searchParams;
  const { role, workspace } = await requireWorkspace();
  if (!canEdit(role)) {
    return (
      <>
        <PageHeader title="Rewrite a page" />
        <EmptyState
          title="View-only access"
          description="Only owners and editors can rewrite pages in this workspace."
          action={
            <Button asChild variant="outline">
              <Link href="/app/generations">Back to copy</Link>
            </Button>
          }
        />
      </>
    );
  }
  const started = await listRewrites(workspace.id);
  const initial = offerParam && /^[0-9a-f-]{36}$/i.test(offerParam) && started.some((s) => s.offerId === offerParam) ? offerParam : null;
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/generations" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> All copy
      </Link>
      <PageHeader title="Rewrite a page" description="Paste a page's address. The app reads it, builds the offer from what the page says, and writes the page again with the original as the control to beat." />
      <RewriteForm initialOfferId={initial} />
      {started.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-ink">Pages you started</h2>
          <p className="mt-0.5 text-xs text-ink-muted">A page stays here once it is read. Leaving this page does not lose it: pick it up to write from it.</p>
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
            {started.map((s) => {
              const reading = s.sourceStatus === "pending" || s.sourceStatus === "processing" || s.offerStatus === "extracting";
              const unread = !reading && (s.sourceStatus === "failed" || s.words < MIN_PAGE_WORDS);
              const state = s.generation ? `written (${s.generation.status.replace("_", " ")})` : reading ? "being read" : unread ? "could not be read" : `read, ${s.words.toLocaleString()} words`;
              return (
                <li key={s.offerId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink">{s.url ?? s.name}</div>
                    <div className="text-xs text-ink-muted">{state} · started {new Date(s.startedAt).toLocaleString()}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {s.generation && (
                      <Button asChild size="sm" variant="outline"><Link href={`/app/generations/${s.generation.id}`}>Open the piece</Link></Button>
                    )}
                    {initial !== s.offerId && (
                      <Button asChild size="sm" variant={s.generation ? "ghost" : "outline"}><Link href={`/app/rewrite?offer=${s.offerId}`}>{s.generation ? "Write it again" : unread ? "Try again" : "Pick it up"}</Link></Button>
                    )}
                    <Button asChild size="sm" variant="ghost"><Link href={`/app/offers/${s.offerId}`}>Offer</Link></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
