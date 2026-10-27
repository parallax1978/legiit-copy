"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Clock, Loader2, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { approveVariant, rejectVariant, skipOfferConstruction } from "@/lib/actions/offers";
import type { WaitingGeneration } from "@/lib/data/offers";
import { cn } from "@/lib/utils";
import { VARIANT_KIND_LABELS, type VariantKind, titleCase } from "./constants";
import { FitDots, VariantStatusBadge } from "./badges";
import { Dl, ReadOnlyNote, SectionCard } from "./fields";
import { normalizeChosen, normalizeOptionsSheet, type OfferVariantRow } from "./normalize";

const kindLabel = (k: string) => VARIANT_KIND_LABELS[k as VariantKind] ?? titleCase(k);

export function OfferVariants({ offerId, variants, waiting, editable, briefEmpty }: { offerId: string; variants: OfferVariantRow[]; waiting: WaitingGeneration[]; editable: boolean; briefEmpty: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const approved = variants.find((v) => v.status === "approved");
  const hasApproved = !!approved;

  function run(key: string, fn: () => Promise<{ ok: true; data: { requeued: number } | undefined } | { ok: false; error: string }>, success: string) {
    setBusy(key);
    start(async () => {
      const r = await fn();
      setBusy(null);
      if (!r.ok) toast.error(r.error);
      else {
        const n = r.data?.requeued ?? 0;
        toast.success(n > 0 ? `${success} ${n} waiting generation${n > 1 ? "s" : ""} resumed from the argument step.` : success);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <ReadOnlyNote show={!editable} />

      {waiting.length > 0 && (
        <div className="flex items-start gap-3 rounded-card border border-warn/30 bg-warn-soft/60 p-4">
          <Clock className="mt-0.5 size-4 shrink-0 text-warn" />
          <div className="text-sm">
            <p className="font-medium text-warn">
              {waiting.length} generation{waiting.length > 1 ? "s are" : " is"} waiting on this decision
            </p>
            <p className="mt-0.5 text-ink-muted">
              {waiting.map((w) => titleCase(w.format) + (w.purpose ? ` (${w.purpose})` : "")).join(", ")}. Approving an offer below resumes {waiting.length > 1 ? "them" : "it"} from the argument step.
            </p>
          </div>
        </div>
      )}

      {variants.length === 0 && (
        <SectionCard title="No offer proposal yet" description="The offer step runs when you first write copy: the engine lays out the options sheet (hard offer, installments, trial, charter, premium-led and so on), picks one for this market and asks you to approve it before any prose is written.">
          <SkipBlock offerId={offerId} editable={editable} disabled={pending || briefEmpty} busy={busy === "skip"} onSkip={() => run("skip", () => skipOfferConstruction(offerId), "The offer as written is approved.")} briefEmpty={briefEmpty} />
        </SectionCard>
      )}

      {variants.map((v, idx) => {
        const options = normalizeOptionsSheet(v.options_sheet);
        const chosen = normalizeChosen(v);
        const isBusy = pending && busy === v.id;
        const latest = idx === 0;
        return (
          <SectionCard
            key={v.id}
            title={
              <span className="inline-flex flex-wrap items-center gap-2">
                {chosen ? kindLabel(chosen.variant) : "Offer proposal"}
                <VariantStatusBadge status={v.status} />
                {latest && variants.length > 1 && <span className="text-xs font-normal text-ink-soft">latest</span>}
              </span>
            }
            description={`Proposed ${new Date(v.created_at).toLocaleString()}${v.approved_at ? ` · approved ${new Date(v.approved_at).toLocaleString()}` : ""}`}
            actions={
              editable &&
              v.status === "proposed" && (
                <>
                  <Button size="sm" variant="outline" disabled={isBusy} onClick={() => run(v.id, () => rejectVariant(offerId, v.id).then((r) => (r.ok ? { ok: true as const, data: undefined } : r)), "Proposal rejected.")}>
                    <X className="size-4" /> Reject
                  </Button>
                  <Button size="sm" disabled={isBusy} onClick={() => run(v.id, () => approveVariant(offerId, v.id), "Offer approved.")}>
                    {isBusy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Approve
                  </Button>
                </>
              )
            }
          >
            <div className="space-y-6">
              {options.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-ink">Options sheet</h3>
                  <div className="overflow-x-auto rounded-md border border-line">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-surface-alt hover:bg-surface-alt">
                          <TableHead>Variant</TableHead>
                          <TableHead>When used</TableHead>
                          <TableHead className="whitespace-nowrap">Fit</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {options
                          .slice()
                          .sort((a, b) => b.fit_score - a.fit_score)
                          .map((o, i) => {
                            const isChosen = chosen?.variant === o.variant;
                            return (
                              <TableRow key={`${o.variant}-${i}`} className={cn(isChosen && "bg-brand-faint/50 hover:bg-brand-faint/60")}>
                                <TableCell className="whitespace-normal align-top text-sm font-medium text-ink">
                                  {kindLabel(o.variant)}
                                  {isChosen && <span className="ml-1.5 rounded-full bg-brand px-1.5 py-px text-[10px] font-semibold uppercase text-white">chosen</span>}
                                  {o.copy_must_say && <p className="mt-1 text-xs font-normal text-ink-muted">Copy must say: {o.copy_must_say}</p>}
                                </TableCell>
                                <TableCell className="min-w-[180px] whitespace-normal align-top text-xs text-ink-muted">
                                  {o.when_used}
                                  {(o.front_end_effect || o.back_end_effect) && (
                                    <p className="mt-1 text-ink-soft">
                                      {o.front_end_effect && <>Front end: {o.front_end_effect}. </>}
                                      {o.back_end_effect && <>Back end: {o.back_end_effect}.</>}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell className="align-top">
                                  <FitDots score={o.fit_score} />
                                </TableCell>
                                <TableCell className="min-w-[220px] whitespace-normal align-top text-xs text-ink">{o.reason}</TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {chosen && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-ink">Chosen: {kindLabel(chosen.variant)}</h3>
                  {chosen.reasons && <p className="mb-3 text-sm text-ink-muted">{chosen.reasons}</p>}
                  <Dl
                    items={[
                      { label: "Price presentation", value: chosen.price_presentation },
                      {
                        label: "Guarantee",
                        value: chosen.guarantee ? (
                          <>
                            <span className="font-medium">{chosen.guarantee.denominated_text}</span>
                            {chosen.guarantee.terms && <span className="block text-ink-muted">{chosen.guarantee.terms}</span>}
                            <span className="block text-xs text-ink-soft">
                              {chosen.guarantee.days != null ? `${chosen.guarantee.days} days · ` : ""}
                              {chosen.guarantee.costs_seller ? "costs the seller something if invoked" : "no cost to the seller when invoked"}
                            </span>
                          </>
                        ) : null,
                      },
                      { label: "Deadline", value: chosen.deadline ? `${chosen.deadline.date_or_rule}${chosen.deadline.mechanism ? ` — ${chosen.deadline.mechanism}` : ""}` : "None" },
                      { label: "First visible win", value: chosen.first_visible_win?.what ? `${chosen.first_visible_win.what}${chosen.first_visible_win.interval ? ` (${chosen.first_visible_win.interval})` : ""}` : null },
                      { label: "Biggest reason buyers fail", value: chosen.biggest_failure_reason },
                      { label: "Why the bundle cannot be price-compared", value: chosen.bundle_uncomparable_how },
                    ]}
                  />
                  {chosen.premiums.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Premiums</p>
                      <ul className="mt-1.5 grid gap-2 sm:grid-cols-2">
                        {chosen.premiums.map((p, i) => (
                          <li key={i} className="rounded-md border border-line p-3 text-sm">
                            <p className="font-medium text-ink">{p.name}</p>
                            <p className="text-ink-muted">Answers the worry: {p.answers_worry}</p>
                            {p.value_basis && <p className="text-xs text-ink-soft">Value basis: {p.value_basis}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {v.gap_note && (
                <div className="rounded-md bg-surface-alt px-3 py-2 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">What arrives when</p>
                  <p className="mt-0.5 text-ink">{v.gap_note}</p>
                </div>
              )}
            </div>
          </SectionCard>
        );
      })}

      {variants.length > 0 && !hasApproved && (
        <SectionCard title="Or use the offer as written" description="Skip construction and approve the offer exactly as the brief describes it: price, terms and guarantee unchanged, no premiums added.">
          <SkipBlock offerId={offerId} editable={editable} disabled={pending || briefEmpty} busy={busy === "skip"} onSkip={() => run("skip", () => skipOfferConstruction(offerId), "The offer as written is approved.")} briefEmpty={briefEmpty} />
        </SectionCard>
      )}
    </div>
  );
}

function SkipBlock({ editable, disabled, busy, onSkip, briefEmpty }: { offerId: string; editable: boolean; disabled: boolean; busy: boolean; onSkip: () => void; briefEmpty: boolean }) {
  if (!editable) return <p className="text-sm text-ink-soft">An editor can approve a proposal or use the offer as written.</p>;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink-muted">{briefEmpty ? "Fill in the brief first so there is an offer to copy." : "This creates an approved variant copied from the brief. Waiting generations resume."}</p>
      <Button variant="outline" disabled={disabled} onClick={onSkip}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <SkipForward className="size-4" />} Skip offer construction, use the offer as written
      </Button>
    </div>
  );
}
