"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { inviteMember } from "@/lib/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from "./roles";

export function InviteForm({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("editor");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await inviteMember(workspaceId, email, role);
      if (res.ok) {
        toast.success(`Invite created for ${email.trim()}. Copy its link below to send it.`);
        setEmail("");
      } else toast.error(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" autoComplete="off" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger id="invite-role" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={pending || !email.trim()} className="rounded-full">
          <Send className="h-4 w-4" /> {pending ? "Creating…" : "Create invite"}
        </Button>
      </div>
      <p className="text-xs text-ink-soft">{ROLE_DESCRIPTIONS[role]}</p>
    </form>
  );
}
