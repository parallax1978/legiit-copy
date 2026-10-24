import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { FileText } from "lucide-react";
import { formatLabel, formatInt, type RecentDraft } from "@/lib/data/dashboard";

export function RecentDrafts({ drafts }: { drafts: RecentDraft[] }) {
  return (
    <section className="rounded-card border border-line bg-surface shadow-card">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-sm font-semibold text-ink">Recent drafts</h2>
        <Link href="/app/generations" className="text-xs font-medium text-brand hover:underline">All copy</Link>
      </header>
      {drafts.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-muted">No drafts yet. Your first finished piece lands here with its version and word count.</p>
      ) : (
        <ul className="divide-y divide-line">
          {drafts.map((d) => (
            <li key={d.id}>
              <Link href={`/app/generations/${d.generationId}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-alt">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-faint text-brand-strong">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">
                    {formatLabel(d.format)}
                    {d.offerName && <span className="font-normal text-ink-muted"> for {d.offerName}</span>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {d.label ?? `Version ${d.version}`}
                    {d.wordCount ? ` · ${formatInt(d.wordCount)} words` : ""}
                    <span className="text-ink-soft"> · {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
