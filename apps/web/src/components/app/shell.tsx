"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LinkPending } from "@/components/app/link-pending";
import { LayoutDashboard, Package, FileText, Settings, Shield, Library, FlaskConical, Receipt, Activity, BookOpen, SlidersHorizontal } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { UserMenu } from "./user-menu";

export interface ShellProps {
  user: { id: string; email: string; name: string | null };
  workspaces: { id: string; name: string; role: string }[];
  currentWorkspaceId: string;
  isAdmin: boolean;
  children: React.ReactNode;
}

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/offers", label: "Offers", icon: Package },
  { href: "/app/generations", label: "Copy", icon: FileText },
  { href: "/app/settings", label: "Settings", icon: Settings },
];
const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: Shield, exact: true },
  { href: "/admin/library", label: "Teaching library", icon: Library },
  { href: "/admin/critiques", label: "Critiques", icon: BookOpen },
  { href: "/admin/controls", label: "Controls", icon: Activity },
  { href: "/admin/prompts", label: "Prompts", icon: SlidersHorizontal },
  { href: "/admin/evals", label: "Evals & judge", icon: FlaskConical },
  { href: "/admin/costs", label: "Costs & jobs", icon: Receipt },
];

export function AppShell({ user, workspaces, currentWorkspaceId, isAdmin, children }: ShellProps) {
  const pathname = usePathname();
  const inAdmin = pathname.startsWith("/admin");
  const items = inAdmin ? ADMIN_NAV : NAV;
  return (
    <div className="flex min-h-screen bg-surface-alt">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex h-14 items-center border-b border-line px-4">
          <Link href="/app"><Logo /></Link>
        </div>
        <div className="border-b border-line p-3">
          <WorkspaceSwitcher workspaces={workspaces} currentWorkspaceId={currentWorkspaceId} />
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {items.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors", active ? "bg-brand-faint text-brand-strong" : "text-ink-muted hover:bg-surface-sunken hover:text-ink")}>
                <item.icon className="h-4 w-4" />
                {item.label}
                <LinkPending className="ml-auto" />
              </Link>
            );
          })}
          {isAdmin && (
            <Link href={inAdmin ? "/app" : "/admin"} className="mt-4 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink">
              <Shield className="h-4 w-4" /> {inAdmin ? "Back to app" : "Admin"}
              <LinkPending className="ml-auto" />
            </Link>
          )}
        </nav>
        <div className="border-t border-line p-3">
          <UserMenu user={user} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur md:hidden">
          <Link href="/app"><Logo /></Link>
          <UserMenu user={user} compact />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
