"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SubNav({ items }: { items: { href: string; label: string; exact?: boolean }[] }) {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-line">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors", active ? "border-brand text-brand-strong" : "border-transparent text-ink-muted hover:text-ink")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export const EVAL_NAV = [
  { href: "/admin/evals", label: "Runs", exact: true },
  { href: "/admin/evals/briefs", label: "Briefs" },
  { href: "/admin/evals/judge", label: "Judge" },
];
