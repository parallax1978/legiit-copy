import Link from "next/link";
import { User, Building2, Users, Receipt, Plus, ArrowRight } from "lucide-react";
import { requireWorkspace } from "@/lib/auth";

export const metadata = { title: "Settings" };

export default async function SettingsIndexPage() {
  const { workspace, role } = await requireWorkspace();
  const cards = [
    { href: "/app/settings/profile", icon: User, title: "Profile", description: "Your name, the email you sign in with, and sign out." },
    {
      href: "/app/settings/workspace",
      icon: Building2,
      title: "Workspace",
      description: role === "owner" ? `Rename ${workspace.name}, review its instruction memory, or delete it.` : `${workspace.name}: its name, slug and instruction memory.`,
    },
    {
      href: "/app/settings/members",
      icon: Users,
      title: "Members",
      description: role === "owner" ? "Invite teammates, change roles, revoke invites." : "Who has access to this workspace and in what role.",
    },
    { href: "/app/settings/usage", icon: Receipt, title: "Usage", description: "Pieces written, by month and one by one." },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="group flex items-start gap-4 rounded-card border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-lift">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-faint text-brand-strong">
              <c.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-sm font-semibold text-ink">
                {c.title} <ArrowRight className="h-3.5 w-3.5 text-ink-soft transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="mt-1 block text-sm text-ink-muted">{c.description}</span>
            </span>
          </Link>
        ))}
      </div>
      <Link href="/app/settings/workspaces/new" className="flex items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface px-5 py-4 text-sm text-ink-muted transition-colors hover:border-brand hover:text-brand-strong">
        <Plus className="h-4 w-4" /> Create another workspace for a different client or brand
      </Link>
    </div>
  );
}
