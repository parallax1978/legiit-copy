"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X, Sparkles, UserRound } from "lucide-react";
import { updateInstructionMemory } from "@/lib/actions/settings";
import type { MemoryItem } from "@/lib/data/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function InstructionMemoryEditor({ workspaceId, items: initial, canEdit }: { workspaceId: string; items: MemoryItem[]; canEdit: boolean }) {
  const [items, setItems] = useState<MemoryItem[]>(initial);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(items) !== JSON.stringify(initial);

  function add() {
    const text = draft.trim();
    if (!text) return;
    if (text.length > 500) {
      toast.error("Keep each preference under 500 characters");
      return;
    }
    setItems((xs) => [...xs, { text, source: "user", created_at: "" }]);
    setDraft("");
  }
  function remove(i: number) {
    setItems((xs) => xs.filter((_, idx) => idx !== i));
  }
  function save() {
    start(async () => {
      const res = await updateInstructionMemory(workspaceId, items);
      if (res.ok) toast.success("Instruction memory saved");
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-surface-alt px-4 py-5 text-sm text-ink-muted">
          Nothing learned yet. As you edit drafts, standing preferences (a phrase to avoid, a price always written one way, a sign-off) are proposed here. You can also add your own.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {items.map((it, i) => (
            <li key={`${i}-${it.text}`} className="flex items-start gap-3 px-3 py-2.5">
              <span className="mt-0.5 shrink-0 text-ink-soft">
                {it.source === "learned" ? <Sparkles className="h-4 w-4" aria-label="Learned from edits" /> : <UserRound className="h-4 w-4" aria-label="Added by a teammate" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">{it.text}</p>
                <Badge variant="outline" className="mt-1 text-[10px] text-ink-soft">{it.source === "learned" ? "Learned from edits" : "Added manually"}</Badge>
              </div>
              {canEdit && (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(i)} aria-label="Remove preference" className="text-ink-soft hover:text-bad">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder='e.g. "Never write the price as $97.00; always $97."' maxLength={500} />
            <Button type="submit" variant="outline" disabled={!draft.trim()}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </form>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-ink-soft">{items.length} {items.length === 1 ? "preference" : "preferences"}{dirty ? " · unsaved changes" : ""}</p>
            <Button type="button" onClick={save} disabled={!dirty || pending} className="rounded-full">
              {pending ? "Saving…" : "Save memory"}
            </Button>
          </div>
        </>
      )}
      {!canEdit && <p className="text-xs text-ink-soft">Only an owner can edit instruction memory.</p>}
    </div>
  );
}
