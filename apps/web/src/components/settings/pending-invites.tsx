"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Copy, X } from "lucide-react";
import { revokeInvite } from "@/lib/actions/members";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "./roles";

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export function PendingInvites({ workspaceId, invites, canManage, siteUrl }: { workspaceId: string; invites: PendingInvite[]; canManage: boolean; siteUrl: string }) {
  const [pending, start] = useTransition();

  function linkFor(token: string) {
    const base = siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
    return `${base.replace(/\/$/, "")}/invite/${token}`;
  }
  async function copy(inv: PendingInvite) {
    try {
      await navigator.clipboard.writeText(linkFor(inv.token));
      toast.success(`Invite link for ${inv.email} copied`);
    } catch {
      toast.error("Could not copy. Select the link and copy it manually.");
    }
  }
  function revoke(inv: PendingInvite) {
    start(async () => {
      const res = await revokeInvite(workspaceId, inv.id);
      if (res.ok) toast.success(`Invite for ${inv.email} revoked`);
      else toast.error(res.error);
    });
  }

  if (invites.length === 0) {
    return <p className="text-sm text-ink-muted">No pending invites.</p>;
  }

  return (
    <ul className="divide-y divide-line rounded-lg border border-line">
      {invites.map((inv) => (
        <li key={inv.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium text-ink">{inv.email}</span>
              <Badge variant="outline">{ROLE_LABELS[inv.role] ?? inv.role}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-ink-soft">
              Invited {formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true })} · expires {formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true })}
            </p>
            {canManage && <code className="mt-1 block truncate text-[11px] text-ink-muted">{linkFor(inv.token)}</code>}
          </div>
          {canManage && (
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => copy(inv)}>
                <Copy className="h-3.5 w-3.5" /> Copy link
              </Button>
              <Button variant="ghost" size="sm" className="text-ink-muted hover:text-bad" onClick={() => revoke(inv)} disabled={pending} aria-label={`Revoke invite for ${inv.email}`}>
                <X className="h-4 w-4" /> <span className="hidden sm:inline">Revoke</span>
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
