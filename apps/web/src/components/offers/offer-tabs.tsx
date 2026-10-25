"use client";
import Link from "next/link";
import { LinkPending } from "@/components/app/link-pending";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface TabCounts {
  claims: number;
  flagged: number;
  openQuestions: number;
  proposedVariants: number;
  research: number;
  voice: number;
}

export function OfferTabs({ offerId, counts }: { offerId: string; counts: TabCounts }) {
  const pathname = usePathname();
  const base = `/app/offers/${offerId}`;
  const tabs: { href: string; label: string; badge?: number; tone?: "warn" | "muted" }[] = [
    { href: base, label: "Brief", badge: counts.openQuestions || undefined, tone: "warn" },
    { href: `${base}/claims`, label: "Claims ledger", badge: counts.flagged || counts.claims || undefined, tone: counts.flagged ? "warn" : "muted" },
    { href: `${base}/offer`, label: "Offer", badge: counts.proposedVariants || undefined, tone: "warn" },
    { href: `${base}/research`, label: "Research", badge: counts.research || undefined, tone: "muted" },
    { href: `${base}/voice`, label: "Voice", badge: counts.voice || undefined, tone: "muted" },
    { href: `${base}/settings`, label: "Settings" },
  ];
  return (
    <nav className="-mx-4 mb-6 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0" aria-label="Offer sections">
      <ul className="flex min-w-max gap-1">
        {tabs.map((t) => {
          const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "border-brand text-brand-strong" : "border-transparent text-ink-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {t.label}
                {t.badge ? (
                  <span className={cn("rounded-full px-1.5 py-px text-[11px] font-semibold", t.tone === "warn" ? "bg-warn-soft text-warn" : "bg-surface-sunken text-ink-muted")}>{t.badge}</span>
                ) : null}
                <LinkPending />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
