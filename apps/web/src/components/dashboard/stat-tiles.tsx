import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  accent?: boolean;
}

export function StatTile({ label, value, hint, icon: Icon, href, accent }: StatTileProps) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
        <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-md", accent ? "brand-gradient text-white" : "bg-brand-faint text-brand-strong")}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-ink tabular-nums">{value}</div>
      {hint && <div className="mt-1 truncate text-xs text-ink-soft">{hint}</div>}
    </>
  );
  const className = "block rounded-card border border-line bg-surface p-4 shadow-card";
  if (href) {
    return (
      <Link href={href} className={cn(className, "transition-shadow hover:shadow-lift")}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

export function StatTiles({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{children}</div>;
}
