"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Building2, Users, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/app/settings/profile", label: "Profile", icon: User },
  { href: "/app/settings/workspace", label: "Workspace", icon: Building2 },
  { href: "/app/settings/members", label: "Members", icon: Users },
  { href: "/app/settings/usage", label: "Usage", icon: Receipt },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 mb-6 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0" aria-label="Settings sections">
      <ul className="flex min-w-max gap-1">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "border-brand text-brand-strong" : "border-transparent text-ink-muted hover:border-line-strong hover:text-ink",
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
