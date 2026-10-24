"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Progress } from "@/components/ui/progress";

interface SourceLite {
  id: string;
  title: string | null;
  kind: string;
  extraction_status: string;
  error: string | null;
}

/**
 * Keeps the offer page current while sources are read and the brief is built:
 * Realtime on offer_sources (in the publication) and a poll for offers.status (not in the publication).
 */
export function ExtractionBanner({ offerId, status, sources }: { offerId: string; status: string; sources: SourceLite[] }) {
  const router = useRouter();
  const pendingSources = sources.filter((s) => s.extraction_status === "pending" || s.extraction_status === "processing");
  const failed = sources.filter((s) => s.extraction_status === "failed");
  const active = status === "extracting" || pendingSources.length > 0;
  const refreshing = useRef(false);

  useEffect(() => {
    if (!active) return;
    const supabase = createClient();
    const refresh = () => {
      if (refreshing.current) return;
      refreshing.current = true;
      router.refresh();
      setTimeout(() => (refreshing.current = false), 800);
    };
    const channel = supabase
      .channel(`offer-sources-${offerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "offer_sources", filter: `offer_id=eq.${offerId}` }, refresh)
      .subscribe();
    const timer = setInterval(refresh, 4000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [active, offerId, router]);

  if (!active) return null;
  const allFailed = sources.length > 0 && failed.length === sources.length;
  if (allFailed) {
    return (
      <div className="mb-6 rounded-card border border-bad-soft bg-bad-soft/40 p-4 text-sm" role="status">
        <p className="font-medium text-bad">None of the sources could be read.</p>
        <p className="mt-0.5 text-ink-muted">Retry or remove them in the sources list below, or add a different source. Extraction starts again once one is read.</p>
      </div>
    );
  }
  const done = sources.length - pendingSources.length;
  const readingPhase = pendingSources.length > 0;
  const pct = sources.length === 0 ? 10 : readingPhase ? Math.max(8, Math.round((done / sources.length) * 70)) : 85;

  return (
    <div className="mb-6 rounded-card border border-brand-soft bg-brand-faint/60 p-4" role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-brand" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-brand-strong">
            {sources.length === 0 ? "Waiting for sources" : readingPhase ? `Reading sources (${done} of ${sources.length})` : "Building the brief, claims ledger and open questions"}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">{readingPhase ? "Pages are fetched and documents parsed first. Then one extraction pass writes the brief." : "Every number, price, guarantee and credential becomes a ledger row with an evidence grade. This usually takes a minute or two."}</p>
          <Progress value={pct} className="mt-3 h-1.5" />
          {pendingSources.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
              {pendingSources.map((s) => (
                <li key={s.id} className="truncate">
                  {s.extraction_status === "processing" ? "Reading" : "Queued"}: {s.title ?? s.kind}
                </li>
              ))}
            </ul>
          )}
          {failed.length > 0 && <p className="mt-2 text-xs text-bad">{failed.length} source{failed.length > 1 ? "s" : ""} failed. See the sources list below to retry or remove.</p>}
        </div>
      </div>
    </div>
  );
}
