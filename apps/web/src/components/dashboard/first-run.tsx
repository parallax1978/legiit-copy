import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
}

export function FirstRunChecklist({ checklist, canEdit }: { checklist: { hasOffer: boolean; hasReadyOffer: boolean; hasGeneration: boolean }; canEdit: boolean }) {
  const steps: Step[] = [
    {
      title: "Add an offer",
      description: "Paste a sales page URL or upload what you have. Legiit Copy extracts the brief: product, price, terms, guarantee, audience, proof.",
      href: "/app/offers/new",
      cta: "New offer",
      done: checklist.hasOffer,
    },
    {
      title: "Review the claims ledger",
      description: "Every fact gets a line: the claim, its evidence, its grade. Approve, correct or drop each one. Risky claims are flagged for you, never quietly softened.",
      href: "/app/offers",
      cta: "Open offers",
      done: checklist.hasReadyOffer,
    },
    {
      title: "Write your first piece",
      description: "Pick a format. The argument is chosen before any prose, then drafted, cold-read on a second model and reviewed like a copy chief would.",
      href: "/app/generations/new",
      cta: "Write copy",
      done: checklist.hasGeneration,
    },
  ];
  const nextIndex = steps.findIndex((s) => !s.done);

  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card md:p-6">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Getting started</p>
          <h2 className="mt-1 text-lg font-bold text-ink">Three steps to your first piece</h2>
        </div>
        <p className="max-w-md text-xs text-ink-muted">
          Copy here is argued from the offer&apos;s own evidence. Every number, name and promise in a draft traces back to a line in its claims ledger, so the ledger comes first.
        </p>
      </div>
      <ol className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => {
          const isNext = i === nextIndex;
          return (
            <li key={s.title} className={cn("flex flex-col rounded-lg border p-4", isNext ? "border-brand-soft bg-brand-faint/40" : "border-line bg-surface-alt", s.done && "opacity-80")}>
              <div className="flex items-center gap-2">
                <span className={cn("inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", s.done ? "bg-good text-white" : isNext ? "brand-gradient text-white" : "bg-surface-sunken text-ink-muted")}>
                  {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <h3 className="text-sm font-semibold text-ink">{s.title}</h3>
              </div>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-muted">{s.description}</p>
              {canEdit && !s.done && (
                <Button asChild size="sm" variant={isNext ? "default" : "outline"} className={cn("mt-3 w-fit rounded-full", isNext && "shadow-glow")}>
                  <Link href={s.href}>{s.cta} <ArrowRight className="h-3.5 w-3.5" /></Link>
                </Button>
              )}
              {s.done && <span className="mt-3 text-xs font-medium text-good">Done</span>}
            </li>
          );
        })}
      </ol>
      {!canEdit && <p className="mt-4 text-xs text-ink-soft">You have view access in this workspace. An owner or editor adds offers and writes copy.</p>}
    </section>
  );
}
