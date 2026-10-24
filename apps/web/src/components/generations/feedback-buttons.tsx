"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FeedbackRow } from "@/lib/data/generations";
import { submitFeedback } from "@/lib/actions/generations";

const REASONS: Record<1 | -1, string[]> = {
  1: ["Argument is right", "Proof placed well", "Sounds like us", "Would run it as is"],
  [-1]: ["Wrong argument", "Claims too big for the proof", "Reads like AI", "Wrong voice", "Too long", "Offer wrong"],
};

export function FeedbackButtons({ draftId, existing, canEdit }: { draftId: string; existing: FeedbackRow[]; canEdit: boolean }) {
  const mine = existing.filter((f) => f.draft_id === draftId).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  const [open, setOpen] = useState<1 | -1 | null>(null);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  const send = (rating: 1 | -1, text: string) =>
    start(async () => {
      const res = await submitFeedback(draftId, rating, text);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Thanks. Feedback adjusts this workspace's instructions, never the shared library.");
        setOpen(null);
        setReason("");
      }
    });

  const Btn = ({ rating }: { rating: 1 | -1 }) => {
    const Icon = rating === 1 ? ThumbsUp : ThumbsDown;
    const active = mine?.rating === rating;
    return (
      <Popover open={open === rating} onOpenChange={(o) => setOpen(o ? rating : null)}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon-sm" aria-label={rating === 1 ? "Good draft" : "Weak draft"} disabled={!canEdit || pending} className={cn(active && (rating === 1 ? "border-good bg-good-soft text-good" : "border-bad bg-bad-soft text-bad"))}>
            <Icon className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-2">
          <div className="text-sm font-medium text-ink">{rating === 1 ? "What works?" : "What is wrong with it?"}</div>
          <div className="flex flex-wrap gap-1">
            {REASONS[rating].map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)} className={cn("rounded-full border px-2 py-0.5 text-xs", reason === r ? "border-brand bg-brand-faint text-brand-strong" : "border-line text-ink-muted hover:border-line-strong")}>{r}</button>
            ))}
          </div>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Optional, in your words" />
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => send(rating, "")} disabled={pending}>Skip reason</Button>
            <Button size="sm" onClick={() => send(rating, reason)} disabled={pending}>{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Send</Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="flex items-center gap-1">
      <Btn rating={1} />
      <Btn rating={-1} />
    </div>
  );
}
