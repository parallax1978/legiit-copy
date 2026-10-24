"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteWorkspace } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function DeleteWorkspaceDialog({ workspaceId, name, hasOtherWorkspace }: { workspaceId: string; name: string; hasOtherWorkspace: boolean }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const matches = typed.trim() === name;

  function confirm() {
    start(async () => {
      const res = await deleteWorkspace(workspaceId, typed);
      // on success the action redirects; only errors return
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setTyped(""); }}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="rounded-full">
          <Trash2 className="h-4 w-4" /> Delete workspace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {name}?</DialogTitle>
          <DialogDescription>
            This permanently deletes the workspace with all of its offers, claims ledgers, research, generations, drafts and usage history, and removes every member. There is no undo.
          </DialogDescription>
        </DialogHeader>
        {!hasOtherWorkspace ? (
          <p className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
            This is your only workspace. Create another one first, then come back to delete this one.
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="confirm-name">Type <span className="font-mono font-semibold">{name}</span> to confirm</Label>
            <Input id="confirm-name" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button variant="destructive" onClick={confirm} disabled={!matches || !hasOtherWorkspace || pending}>
            {pending ? "Deleting…" : "Delete this workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
