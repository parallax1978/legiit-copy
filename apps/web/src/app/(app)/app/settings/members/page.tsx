import { requireWorkspace, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MembersTable, type MemberRow } from "@/components/settings/members-table";
import { InviteForm } from "@/components/settings/invite-form";
import { PendingInvites, type PendingInvite } from "@/components/settings/pending-invites";
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/components/settings/roles";

export const metadata = { title: "Members" };

export default async function MembersPage() {
  const { workspace, role } = await requireWorkspace();
  const user = await requireUser();
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [{ data: memberRows }, { data: inviteRows }] = await Promise.all([
    supabase.from("workspace_members").select("user_id, role, created_at").eq("workspace_id", workspace.id).order("created_at"),
    supabase
      .from("workspace_invites")
      .select("id, email, role, token, created_at, expires_at")
      .eq("workspace_id", workspace.id)
      .is("accepted_at", null)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false }),
  ]);

  const ids = (memberRows ?? []).map((m) => m.user_id);
  // profiles RLS is self-read today, so teammates' emails resolve only once a co-member read policy lands
  const { data: profiles } = ids.length > 0 ? await supabase.from("profiles").select("id, email, full_name").in("id", ids) : { data: [] as { id: string; email: string | null; full_name: string | null }[] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const members: MemberRow[] = (memberRows ?? []).map((m) => {
    const p = profileById.get(m.user_id);
    const isYou = m.user_id === user.id;
    return {
      userId: m.user_id,
      email: p?.email ?? (isYou ? user.email ?? null : null),
      name: p?.full_name ?? (isYou ? ((user.user_metadata?.full_name as string | undefined) ?? null) : null),
      role: m.role,
      joinedAt: m.created_at,
      isYou,
    };
  });
  const invites: PendingInvite[] = (inviteRows ?? []).map((i) => ({ id: i.id, email: i.email, role: i.role, token: i.token, createdAt: i.created_at, expiresAt: i.expires_at }));
  const isOwner = role === "owner";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? "person has" : "people have"} access to {workspace.name}.
            {isOwner ? " Change a role from the dropdown or remove someone." : " Only owners can change roles."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MembersTable workspaceId={workspace.id} members={members} canManage={isOwner} />
          <dl className="mt-5 grid gap-2 border-t border-line pt-4 text-xs text-ink-muted sm:grid-cols-3">
            {ROLES.map((r) => (
              <div key={r}>
                <dt className="font-semibold text-ink">{ROLE_LABELS[r]}</dt>
                <dd>{ROLE_DESCRIPTIONS[r]}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Invite a teammate</CardTitle>
            <CardDescription>
              Creates an invite link that works for 14 days. Invites are not emailed yet: copy the link from the pending list and send it yourself. If they already have an account,
              the link adds them when they open it; if not, signing in with the invited email adds them automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteForm workspaceId={workspace.id} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pending invites</CardTitle>
          <CardDescription>Links that have not been used yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <PendingInvites workspaceId={workspace.id} invites={invites} canManage={isOwner} siteUrl={siteUrl} />
        </CardContent>
      </Card>
    </div>
  );
}
