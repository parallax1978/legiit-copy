"use client";
import { useActionState } from "react";
import { UserMinus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addAdminByEmail, removeAdmin } from "@/lib/actions/admin";
import type { AdminUser } from "@/lib/data/admin";
import { ActionButton } from "./action-button";
import { FormMessage, SubmitButton } from "./form-bits";
import { TableCard } from "./stat-tile";
import { shortDate } from "./fmt";

export function AdminsManager({ admins, currentUserId }: { admins: AdminUser[]; currentUserId: string }) {
  const [state, action] = useActionState(addAdminByEmail, {});
  return (
    <div className="space-y-3">
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Since</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((a) => (
              <TableRow key={a.user_id}>
                <TableCell className="text-sm">
                  {a.email ?? <span className="font-mono text-xs text-ink-soft">{a.user_id}</span>}
                  {a.user_id === currentUserId && <span className="ml-2 rounded-full bg-brand-faint px-2 py-0.5 text-xs text-brand-strong">you</span>}
                </TableCell>
                <TableCell className="text-sm text-ink-muted">{a.full_name}</TableCell>
                <TableCell className="text-xs text-ink-muted">{shortDate(a.created_at)}</TableCell>
                <TableCell>
                  <ActionButton variant="ghost" size="sm" disabled={a.user_id === currentUserId} action={() => removeAdmin(a.user_id)} confirm={`Remove ${a.email ?? a.user_id} from app_admins?`}>
                    <UserMinus className="h-4 w-4" /> Remove
                  </ActionButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
      <form action={action} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-center">
        <Input name="email" type="email" required placeholder="user@company.com (must have signed in once)" className="flex-1" />
        <SubmitButton size="sm" pendingLabel="Adding…">
          Add admin
        </SubmitButton>
      </form>
      <FormMessage state={state} />
    </div>
  );
}
