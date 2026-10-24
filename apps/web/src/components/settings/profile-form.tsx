"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { updateProfile } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [name, setName] = useState(fullName);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateProfile(fd);
      if (res.ok) toast.success("Profile saved");
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <form id="profile-form" onSubmit={submit} className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={120} autoComplete="name" />
          <p className="text-xs text-ink-soft">Shown to teammates in this and other workspaces.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} readOnly disabled className="bg-surface-sunken" />
          <p className="text-xs text-ink-soft">You sign in with a link sent to this address. It cannot be changed here.</p>
        </div>
      </form>
      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="ghost" className="text-ink-muted">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </form>
        <Button type="submit" form="profile-form" disabled={pending || name.trim() === fullName.trim()} className="rounded-full">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
