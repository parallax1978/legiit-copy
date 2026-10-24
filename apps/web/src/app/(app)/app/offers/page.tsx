import Link from "next/link";
import { Plus, Package, Archive } from "lucide-react";
import { requireWorkspace, canEdit } from "@/lib/auth";
import { listOffers } from "@/lib/data/offers";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { OfferStatusBadge } from "@/components/offers/badges";
import { cn } from "@/lib/utils";

export const metadata = { title: "Offers" };

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function OffersPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const sp = await searchParams;
  const showArchived = sp.archived === "1";
  const { role, workspace } = await requireWorkspace();
  const editable = canEdit(role);
  const offers = await listOffers(workspace.id, { includeArchived: showArchived });
  const visible = showArchived ? offers.filter((o) => o.status === "archived") : offers;

  return (
    <>
      <PageHeader
        title="Offers"
        description="Each offer holds its brief, claims ledger, research dossier and voice. Copy is written from these, never from memory."
        actions={
          <>
            <Button asChild variant="ghost" size="sm" className={cn(showArchived && "bg-brand-faint text-brand-strong")}>
              <Link href={showArchived ? "/app/offers" : "/app/offers?archived=1"}>
                <Archive className="size-4" /> {showArchived ? "Active offers" : "Archived"}
              </Link>
            </Button>
            {editable && (
              <Button asChild className="rounded-full shadow-glow">
                <Link href="/app/offers/new">
                  <Plus className="size-4" /> New offer
                </Link>
              </Button>
            )}
          </>
        }
      />

      {visible.length === 0 ? (
        showArchived ? (
          <EmptyState title="Nothing archived" description="Archived offers keep their brief, ledger and research, and can be restored any time." />
        ) : (
          <EmptyState
            title="Add your first offer"
            description="Paste the sales page URL, upload the documents you have, or describe it. Extraction builds the brief and the claims ledger; you review and approve before any copy is written."
            action={
              editable ? (
                <Button asChild className="rounded-full shadow-glow">
                  <Link href="/app/offers/new">
                    <Plus className="size-4" /> Add your first offer
                  </Link>
                </Button>
              ) : (
                <p className="text-xs text-ink-muted">You have view-only access. Ask an owner or editor to add the first offer.</p>
              )
            }
          />
        )
      ) : (
        <ul className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <li className="hidden grid-cols-[1fr_140px_110px_110px_140px] gap-4 border-b border-line bg-surface-alt px-5 py-2 text-xs font-medium uppercase tracking-wide text-ink-soft md:grid">
            <span>Offer</span>
            <span>Status</span>
            <span className="text-right">Claims</span>
            <span className="text-right">Copy</span>
            <span className="text-right">Updated</span>
          </li>
          {visible.map((o) => (
            <li key={o.id} className="border-b border-line last:border-b-0">
              <Link href={`/app/offers/${o.id}`} className="grid gap-2 px-5 py-3.5 transition-colors hover:bg-surface-alt md:grid-cols-[1fr_140px_110px_110px_140px] md:items-center md:gap-4">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-faint text-brand">
                    <Package className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{o.name}</span>
                    <span className="block text-xs text-ink-muted md:hidden">
                      {o.claim_count} claims · {o.generation_count} pieces of copy · {timeAgo(o.updated_at)}
                    </span>
                  </span>
                </span>
                <span>
                  <OfferStatusBadge status={o.status} />
                </span>
                <span className="hidden text-right text-sm text-ink md:block">{o.claim_count}</span>
                <span className="hidden text-right text-sm text-ink md:block">{o.generation_count}</span>
                <span className="hidden text-right text-xs text-ink-muted md:block">{timeAgo(o.updated_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
