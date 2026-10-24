"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { renameWorkspace } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WorkspaceRenameForm({ workspaceId, name, slug, canEdit }: { workspaceId: string; name: string; slug: string; canEdit: boolean }) {
  const [value, setValue] = useState(name);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await renameWorkspace(workspaceId, value);
      if (res.ok) toast.success("Workspace renamed");
      else toast.error(res.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ws-name">Name</Label>
          <Input id="ws-name" value={value} onChange={(e) => setValue(e.target.value)} maxLength={80} disabled={!canEdit} />
          {!canEdit && <p className="text-xs text-ink-soft">Only an owner can rename the workspace.</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ws-slug">Slug</Label>
          <Input id="ws-slug" value={slug} readOnly disabled className="font-mono text-xs bg-surface-sunken" />
          <p className="text-xs text-ink-soft">A stable identifier for exports and support. Not editable.</p>
        </div>
      </div>
      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending || value.trim() === name || !value.trim()} className="rounded-full">
            {pending ? "Saving…" : "Save name"}
          </Button>
        </div>
      )}
    </form>
  );
}
