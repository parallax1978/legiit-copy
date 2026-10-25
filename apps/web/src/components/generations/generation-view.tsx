"use client";
import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Ban, RotateCcw, Loader2, ExternalLink, PlayCircle, FileSignature, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { GenerationDetail } from "@/lib/data/generations";
import { formatName } from "@/lib/formats";
import { cancelGeneration, retryGeneration, continueGeneration, draftWithOfferAsWritten } from "@/lib/actions/generations";
import { useLiveRefresh } from "./use-live-refresh";
import { StatusBadge } from "./status-badge";
import { StepTimeline } from "./step-timeline";
import { EditorPage } from "./editor-page";
import { getOffer, STEP_LABELS, type StepName } from "./outputs";

export function GenerationView({ detail, canEdit }: { detail: GenerationDetail; canEdit: boolean }) {
  const { generation, offer } = detail;
  const status = generation.status;
  const live = status === "queued" || status === "running";
  useLiveRefresh({ generationId: generation.id, polling: live });
  const [pending, start] = useTransition();

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Something went wrong");
      else toast.success(okMsg);
    });

  const hasDrafts = detail.drafts.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/app/generations" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" /> All copy</Link>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink">{formatName(generation.format)}</h1>
              <StatusBadge status={status} size="md" />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
              {offer ? <Link href={`/app/offers/${offer.id}`} className="font-medium text-ink hover:underline">{offer.name}</Link> : <span>Offer removed</span>}
              <span>·</span>
              <span title={new Date(generation.created_at).toLocaleString()}>{formatDistanceToNow(new Date(generation.created_at), { addSuffix: true })}</span>
              {detail.voiceProfile && <><span>·</span><span>voice: {detail.voiceProfile.name}</span></>}
            </p>
            {generation.purpose && <p className="mt-1 max-w-2xl text-sm text-ink">{generation.purpose}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canEdit && (live || status === "needs_input") && (
              <Button variant="outline" size="sm" disabled={pending} onClick={() => act(() => cancelGeneration(generation.id), "Cancelled")}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Cancel
              </Button>
            )}
            {canEdit && (status === "failed" || status === "cancelled") && (
              <Button size="sm" disabled={pending} onClick={() => act(() => retryGeneration(generation.id), "Queued again")}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} {status === "failed" ? "Retry" : "Resume"}
              </Button>
            )}
            {canEdit && offer && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/app/generations/new?offer=${offer.id}&format=${generation.format}`}>Write another</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {status === "completed" ? (
        <EditorPage detail={detail} canEdit={canEdit} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-card border border-line bg-surface p-4 shadow-card lg:sticky lg:top-6 lg:self-start">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Pipeline</h2>
            <StepTimeline generation={generation} steps={detail.steps} />
          </aside>
          <div className="min-w-0 space-y-5">
            {live && <RunningCard detail={detail} />}
            {status === "needs_input" && <NeedsInputCard detail={detail} canEdit={canEdit} pending={pending} onContinue={() => act(() => continueGeneration(generation.id), "Continuing from argument selection")} onSkip={() => act(() => draftWithOfferAsWritten(generation.id), "Drafting from the offer as written")} />}
            {status === "failed" && (
              <div className="rounded-card border border-bad/30 bg-bad-soft/40 p-5">
                <h2 className="flex items-center gap-2 text-base font-semibold text-bad"><AlertTriangle className="h-4 w-4" /> The run failed{generation.current_step ? ` at ${STEP_LABELS[generation.current_step as StepName] ?? generation.current_step}` : ""}</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-ink">{generation.error ?? "No error was recorded."}</p>
                <p className="mt-2 text-xs text-ink-muted">Retry restarts from this step. Earlier steps, including research and the argument, are reused.</p>
              </div>
            )}
            {status === "cancelled" && (
              <div className="rounded-card border border-line bg-surface p-5 text-sm text-ink-muted">
                This run was cancelled{generation.progress_message ? ` (${generation.progress_message})` : ""}. Resume to pick up from {generation.current_step ? STEP_LABELS[generation.current_step as StepName] ?? generation.current_step : "the start"}.
              </div>
            )}
            {hasDrafts && (
              <EditorPage
                detail={detail}
                canEdit={canEdit && !live}
                notice={<p className="mb-3 rounded-lg bg-surface-alt px-3 py-2 text-xs text-ink-muted">{live ? "Showing the previous version while the new run completes." : "Showing the last version written before the run stopped."}</p>}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RunningCard({ detail }: { detail: GenerationDetail }) {
  const { generation } = detail;
  const step = generation.current_step ? STEP_LABELS[generation.current_step as StepName] ?? generation.current_step : null;
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-brand" />
        <span className="font-medium text-ink">{generation.status === "queued" ? "Waiting for a worker" : step ? `${step} in progress` : "Working"}</span>
      </div>
      {generation.progress_message && <p className="mt-1 text-sm text-ink-muted">{generation.progress_message}</p>}
      <p className="mt-1 text-xs text-ink-soft">This page updates on its own. You can leave and come back; the run continues.</p>
      <div className="mt-5 space-y-3">
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

function NeedsInputCard({ detail, canEdit, pending, onContinue, onSkip }: { detail: GenerationDetail; canEdit: boolean; pending: boolean; onContinue: () => void; onSkip: () => void }) {
  const { generation, offer, openQuestions, hasApprovedOffer } = detail;
  const proposal = getOffer(detail.steps);
  const offerHref = offer ? `/app/offers/${offer.id}?tab=offer` : "/app/offers";
  const questionsHref = offer ? `/app/offers/${offer.id}?tab=questions` : "/app/offers";
  return (
    <div className="rounded-card border border-warn/40 bg-warn-soft/30 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><FileSignature className="h-4 w-4 text-warn" /> The engine needs your decision before it drafts</h2>
      {proposal ? (
        <div className="mt-2 space-y-2 text-sm text-ink">
          <p>
            It proposed an offer construction: a <span className="font-medium">{String(proposal.chosen?.variant ?? "new").replace(/_/g, " ")}</span> offer
            {proposal.chosen?.guarantee?.denominated_text ? <> with the guarantee <q>{proposal.chosen.guarantee.denominated_text}</q></> : null}
            {proposal.chosen?.deadline?.date_or_rule ? <> and a deadline ({proposal.chosen.deadline.date_or_rule})</> : null}. That changes what is sold, not just how, so it waits for you.
          </p>
          {proposal.promise_delivery_gap_note && <p className="text-ink-muted">{proposal.promise_delivery_gap_note}</p>}
          {proposal.ledger_rows_to_add?.length ? <p className="text-xs text-ink-muted">{proposal.ledger_rows_to_add.length} ledger row{proposal.ledger_rows_to_add.length === 1 ? "" : "s"} would be added on approval.</p> : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink">{generation.progress_message ?? "The offer step paused for approval or has blocking questions about the offer."}</p>
      )}
      {openQuestions.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Open questions</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink">
            {openQuestions.slice(0, 5).map((q) => <li key={q.id}>{q.question}</li>)}
          </ul>
          {openQuestions.length > 5 && <p className="text-xs text-ink-muted">and {openQuestions.length - 5} more</p>}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link href={offerHref}>{proposal ? "Review the offer construction" : "Open the offer"} <ExternalLink className="h-3.5 w-3.5" /></Link>
        </Button>
        {openQuestions.length > 0 && (
          <Button asChild size="sm" variant="outline"><Link href={questionsHref}>Answer the questions</Link></Button>
        )}
        {canEdit && (
          <>
            <Button size="sm" variant="outline" disabled={pending || (!hasApprovedOffer && !detail.options.skip_offer)} onClick={onContinue} title={hasApprovedOffer ? "Continue from argument selection" : "Approve the offer construction first"}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />} {hasApprovedOffer ? "Continue" : "Continue (approve first)"}
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={onSkip}>Use the offer as written</Button>
          </>
        )}
      </div>
    </div>
  );
}
