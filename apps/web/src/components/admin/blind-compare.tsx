"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { recordHumanComparison } from "@/lib/actions/admin";
import { cn } from "@/lib/utils";

export interface BlindPair {
  brief_id: string;
  brief_name: string;
  format: string;
  left: { id: string; html: string };
  right: { id: string; html: string };
}

/** Two outputs for the same brief, unlabeled and in random order. Pick the stronger, say why in one line. */
export function BlindCompare({ pairs, alreadyJudged }: { pairs: BlindPair[]; alreadyJudged: number }) {
  const [index, setIndex] = React.useState(0);
  const [winner, setWinner] = React.useState<"a" | "b" | "tie" | null>(null);
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const router = useRouter();
  const pair = pairs[index];

  if (!pair) {
    return (
      <div className="rounded-card border border-dashed border-line-strong bg-surface p-10 text-center">
        <h3 className="text-base font-semibold text-ink">Nothing left to compare</h3>
        <p className="mt-1 text-sm text-ink-muted">
          You have judged {alreadyJudged + index} pair(s) for this run against this baseline. Pick another baseline run, or collect more outputs.
        </p>
      </div>
    );
  }

  async function submit() {
    if (!winner) return toast.error("Pick left, right or tie");
    if (!reason.trim()) return toast.error("One line on why");
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("left_id", pair.left.id);
      fd.set("right_id", pair.right.id);
      fd.set("brief_id", pair.brief_id);
      fd.set("winner", winner);
      fd.set("reason", reason.trim());
      const r = await recordHumanComparison(fd);
      if (!r.ok) return toast.error(r.error);
      toast.success("Recorded");
      setWinner(null);
      setReason("");
      setIndex((i) => i + 1);
      if (index + 1 >= pairs.length) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div>
          <span className="font-semibold text-ink">{pair.brief_name}</span> <span className="text-ink-muted">· {pair.format}</span>
        </div>
        <span className="text-xs text-ink-soft">
          Pair {index + 1} of {pairs.length}
          {alreadyJudged ? ` (${alreadyJudged} judged earlier)` : ""}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel label="Left" selected={winner === "a"} onSelect={() => setWinner("a")} html={pair.left.html} />
        <Panel label="Right" selected={winner === "b"} onSelect={() => setWinner("b")} html={pair.right.html} />
      </div>
      <div className="rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">Which would a skeptical stranger buy from?</span>
          <div className="flex gap-1.5">
            {(["a", "b", "tie"] as const).map((w) => (
              <Button key={w} type="button" size="sm" variant={winner === w ? "default" : "outline"} onClick={() => setWinner(w)}>
                {w === "a" ? "Left" : w === "b" ? "Right" : "Tie"}
              </Button>
            ))}
          </div>
        </div>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="One line: the single reason (argument, proof, lead, offer, voice…)" className="mt-3 min-h-16" />
        <div className="mt-3 flex justify-end">
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Record and next
          </Button>
        </div>
      </div>
    </div>
  );
}

function Panel({ label, html, selected, onSelect }: { label: string; html: string; selected: boolean; onSelect: () => void }) {
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-card border bg-surface shadow-card", selected ? "border-brand ring-2 ring-brand/30" : "border-line")}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
        <Button size="xs" variant={selected ? "default" : "outline"} onClick={onSelect}>
          {selected ? "Picked" : "Pick"}
        </Button>
      </div>
      <div className="copy-prose max-h-[60vh] overflow-y-auto p-4" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
