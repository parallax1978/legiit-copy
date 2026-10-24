"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ChevronDown, Loader2, PenSquare, RefreshCw, Search, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { refreshResearch, reextractOffer, setOfferStatus } from "@/lib/actions/offers";
import { OfferStatusBadge } from "./badges";

export function OfferHeader({ offer, editable, sourceCount }: { offer: { id: string; name: string; status: string; updated_at: string }; editable: boolean; sourceCount: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [running, setRunning] = useState<string | null>(null);
  const archived = offer.status === "archived";
  const extracting = offer.status === "extracting";

  function run(label: string, fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setRunning(label);
    start(async () => {
      const r = await fn();
      setRunning(null);
      if (!r.ok) toast.error(r.error ?? "Something went wrong.");
      else {
        toast.success(success);
        router.refresh();
      }
    });
  }

  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Link href="/app/offers" className="hover:text-ink">
            Offers
          </Link>
          <span>/</span>
          <span className="truncate">{offer.name}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="truncate text-2xl font-bold tracking-tight text-ink">{offer.name}</h1>
          <OfferStatusBadge status={offer.status} />
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          {sourceCount} source{sourceCount === 1 ? "" : "s"} · updated {new Date(offer.updated_at).toLocaleString()}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {!archived && (
          <Button asChild className="rounded-full shadow-glow">
            <Link href={`/app/generations/new?offer=${offer.id}`}>
              <PenSquare className="size-4" /> Write copy
            </Link>
          </Button>
        )}
        {editable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {running ?? "Actions"} <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onSelect={() => run("Refreshing research", () => refreshResearch(offer.id), "Research refresh started. A new dossier version appears when it finishes.")}>
                <Search className="size-4" /> Refresh research
              </DropdownMenuItem>
              <DropdownMenuItem disabled={extracting} onSelect={() => run("Re-extracting", () => reextractOffer(offer.id), "Extraction restarted.")}>
                <RefreshCw className="size-4" /> Re-run extraction
              </DropdownMenuItem>
              {offer.status === "needs_review" && (
                <DropdownMenuItem onSelect={() => run("Marking ready", () => setOfferStatus(offer.id, "ready"), "Offer marked ready.")}>
                  <CheckCircle2 className="size-4" /> Mark as ready
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {archived ? (
                <DropdownMenuItem onSelect={() => run("Restoring", () => setOfferStatus(offer.id, "draft"), "Offer restored.")}>
                  <ArchiveRestore className="size-4" /> Restore from archive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem variant="destructive" onSelect={() => run("Archiving", () => setOfferStatus(offer.id, "archived"), "Offer archived. It stays available from the archive filter.")}>
                  <Archive className="size-4" /> Archive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
