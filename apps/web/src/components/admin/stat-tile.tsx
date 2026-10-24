import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatTile({ label, value, sub, href, tone = "neutral", className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; href?: string; tone?: "neutral" | "good" | "warn" | "bad" | "brand"; className?: string }) {
  const toneClass = { neutral: "text-ink", good: "text-good", warn: "text-warn", bad: "text-bad", brand: "text-brand-strong" }[tone];
  const body = (
    <div className={cn("rounded-card border border-line bg-surface p-4 shadow-card", href && "transition-colors hover:border-brand-soft", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tracking-tight", toneClass)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-4", className)}>{children}</div>;
}

export function Section({ title, description, actions, children, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("mb-8", className)}>
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {description && <p className="text-xs text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** Scrollable card wrapper for a shadcn Table so wide tables stay usable on a phone. */
export function TableCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("overflow-x-auto rounded-card border border-line bg-surface shadow-card", className)}>{children}</div>;
}

export function LinkCard({ href, title, description, count }: { href: string; title: string; description: string; count?: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-card border border-line bg-surface p-4 shadow-card transition-colors hover:border-brand-soft">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {count !== undefined && <span className="rounded-full bg-brand-faint px-2 py-0.5 text-xs font-semibold text-brand-strong">{count}</span>}
      </div>
      <p className="mt-1 text-xs text-ink-muted">{description}</p>
    </Link>
  );
}
