"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Wand2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { rewritePassage } from "@/lib/actions/generations";

export interface RewriteTarget {
  draftId: string;
  selectedText: string;
  blockId: string | null;
}

const SUGGESTIONS = ["Tighter, fewest words", "Make the proof carry the claim", "Plainer, shorter sentences", "Match the voice of the paragraph above", "Cut the hedge, keep the claim within the evidence"];

export function RewriteDialog({ target, onClose, onDone }: { target: RewriteTarget | null; onClose: () => void; onDone?: (version: number | null) => void }) {
  const [instruction, setInstruction] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (target) setInstruction("");
  }, [target]);

  const submit = () => {
    if (!target || !instruction.trim()) return;
    start(async () => {
      const res = await rewritePassage({ draft_id: target.draftId, block_id: target.blockId ?? undefined, selected_text: target.selectedText, instruction: instruction.trim() });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.version ? `Rewritten as version ${res.version}` : "Passage rewritten");
      router.refresh();
      onDone?.(res.version);
      onClose();
    });
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wand2 className="h-4 w-4 text-brand-strong" /> Rewrite this passage</DialogTitle>
          <DialogDescription>The engine rewrites only the selection, inside the claims ledger, and saves it as a new version. Nothing else moves.</DialogDescription>
        </DialogHeader>
        {target && (
          <div className="space-y-4">
            <blockquote className="max-h-40 overflow-auto rounded-lg border border-line bg-surface-alt px-3 py-2 text-sm text-ink-muted whitespace-pre-line">{target.selectedText}</blockquote>
            <div className="space-y-2">
              <Label htmlFor="rewrite-instruction">What should change</Label>
              <Textarea id="rewrite-instruction" value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={3} placeholder="Say what is wrong with it or what it has to do instead." autoFocus />
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => setInstruction(s)} className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted hover:border-brand hover:text-brand-strong">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button onClick={submit} disabled={pending || !instruction.trim()}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Rewrite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
