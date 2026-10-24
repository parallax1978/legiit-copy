import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { requireWorkspace, canEdit } from "@/lib/auth";
import { listGenerations, listOfferOptions } from "@/lib/data/generations";
import { allFormatCards } from "@/lib/formats";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { GenerationList } from "@/components/generations/generation-list";
import { GenerationFilters } from "@/components/generations/generation-filters";
import { LiveRefresh } from "@/components/generations/use-live-refresh";

export const metadata = { title: "Copy" };
export const dynamic = "force-dynamic";

type Search = { offer?: string; status?: string; format?: string };

export default async function GenerationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const current = await requireWorkspace();
  const editor = canEdit(current.role);
  const [items, offers] = await Promise.all([listGenerations(current.workspace.id, params), listOfferOptions(current.workspace.id)]);
  const filtered = !!(params.offer || params.status || params.format);
  const anyLive = items.some((g) => g.status === "running" || g.status === "queued");
  const formats = allFormatCards().map((f) => ({ id: f.id, name: f.name }));

  return (
    <>
      <LiveRefresh workspaceId={current.workspace.id} polling={anyLive} />
      <PageHeader
        title="Copy"
        description="Every piece of copy written from your offers, with its argument, reviews and versions."
        actions={
          editor ? (
            <Button asChild className="rounded-full shadow-glow">
              <Link href="/app/generations/new"><Plus className="h-4 w-4" /> New copy</Link>
            </Button>
          ) : null
        }
      />
      <div className="mb-4">
        <Suspense>
          <GenerationFilters offers={offers.map((o) => ({ id: o.id, name: o.name }))} formats={formats} />
        </Suspense>
      </div>
      {items.length === 0 ? (
        filtered ? (
          <EmptyState title="Nothing matches these filters" description="Clear a filter or two to see the rest of your copy." />
        ) : offers.length === 0 ? (
          <EmptyState
            title="Start with an offer"
            description="Copy is written from a saved offer: its claims ledger, research and offer construction. Add an offer first."
            action={<Button asChild variant="outline"><Link href="/app/offers">Go to offers</Link></Button>}
          />
        ) : (
          <EmptyState
            title="No copy yet"
            description="Pick an offer and a format. The engine chooses the argument first, drafts within the claims ledger and reviews persuasion and facts separately."
            action={editor ? <Button asChild className="rounded-full shadow-glow"><Link href="/app/generations/new"><Plus className="h-4 w-4" /> Write the first piece</Link></Button> : null}
          />
        )
      ) : (
        <GenerationList items={items} />
      )}
    </>
  );
}
