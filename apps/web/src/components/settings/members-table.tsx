"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { UserMinus } from "lucide-react";
import { changeMemberRole, removeMember } from "@/lib/actions/members";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ROLES, ROLE_LABELS } from "./roles";

export interface MemberRow {
  userId: string;
  email: string | null;
  name: string | null;
  role: string;
  joinedAt: string;
  isYou: boolean;
}

function displayName(m: MemberRow) {
  return m.name ?? m.email ?? `Teammate ${m.userId.slice(0, 8)}`;
}

export function MembersTable({ workspaceId, members, canManage }: { workspaceId: string; members: MemberRow[]; canManage: boolean }) {
  const [removing, setRemoving] = useState<MemberRow | null>(null);
  const [pending, start] = useTransition();

  function onRole(m: MemberRow, role: string) {
    if (role === m.role) return;
    start(async () => {
      const res = await changeMemberRole(workspaceId, m.userId, role);
      if (res.ok) toast.success(`${displayName(m)} is now ${ROLE_LABELS[role].toLowerCase()}`);
      else toast.error(res.error);
    });
  }
  function onRemove() {
    if (!removing) return;
    const target = removing;
    start(async () => {
      const res = await removeMember(workspaceId, target.userId);
      if (res.ok) {
        toast.success(`${displayName(target)} removed`);
        setRemoving(null);
      } else toast.error(res.error);
    });
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="hidden sm:table-cell">Joined</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => {
            const label = displayName(m);
            return (
              <TableRow key={m.userId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-brand-faint text-xs font-semibold text-brand-strong">{label.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink">{label}</span>
                        {m.isYou && <Badge variant="secondary" className="text-[10px]">You</Badge>}
                      </div>
                      {m.name && m.email && <div className="truncate text-xs text-ink-muted">{m.email}</div>}
                      {!m.email && !m.isYou && <div className="truncate text-xs text-ink-soft">Email hidden by profile privacy</div>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {canManage ? (
                    <Select value={m.role} onValueChange={(v) => onRole(m, v)} disabled={pending}>
                      <SelectTrigger size="sm" className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">{ROLE_LABELS[m.role] ?? m.role}</Badge>
                  )}
                </TableCell>
                <TableCell className="hidden text-ink-muted sm:table-cell">{format(new Date(m.joinedAt), "d MMM yyyy")}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-ink-muted hover:text-bad" onClick={() => setRemoving(m)} disabled={pending}>
                      <UserMinus className="h-4 w-4" /> <span className="hidden sm:inline">Remove</span>
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removing ? displayName(removing) : "member"}?</DialogTitle>
            <DialogDescription>
              {removing?.isYou
                ? "You will lose access to this workspace immediately. Another owner can invite you back."
                : "They lose access to this workspace immediately. Offers and copy they created stay in the workspace."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)} disabled={pending}>Cancel</Button>
            <Button variant="destructive" onClick={onRemove} disabled={pending}>{pending ? "Removing…" : "Remove"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
