import { requireUser, getMemberships, getCurrentWorkspace, isAdmin } from "@/lib/auth";
import { AppShell } from "@/components/app/shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const memberships = await getMemberships();
  const current = await getCurrentWorkspace();
  const admin = await isAdmin();
  // No workspace yet (only possible if every membership was removed): render pages bare so onboarding can create one.
  if (!current) return <>{children}</>;
  return (
    <AppShell
      user={{ id: user.id, email: user.email ?? "", name: (user.user_metadata?.full_name as string | undefined) ?? null }}
      workspaces={memberships.map((m) => ({ id: m.workspace.id, name: m.workspace.name, role: m.role }))}
      currentWorkspaceId={current.workspace.id}
      isAdmin={admin}
    >
      {children}
    </AppShell>
  );
}
