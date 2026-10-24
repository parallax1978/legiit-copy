"use client";
import Link from "next/link";
import { AlertTriangle, FileQuestion, HelpCircle, FlaskConical } from "lucide-react";
import type { DraftRow, GenerationDetail } from "@/lib/data/generations";
import { getFactual, getShip } from "./outputs";
import { readDraftOutput } from "@/components/editor/markdown-blocks";
import { Empty } from "./panel-argument";

export interface AttentionItems {
  attention: string[];
  needsSource: string[];
  questions: { id: string; question: string; why: string | null }[];
  challenger: { lead_id: string | null; test_variable: string | null } | null;
}

export function collectAttention(detail: GenerationDetail, current: DraftRow | null): AttentionItems {
  const ship = getShip(detail.steps);
  const factual = getFactual(detail.steps);
  const draft = current ? readDraftOutput(current.blocks) : null;
  const needs = new Set<string>();
  for (const s of draft?.needs_source ?? []) if (s?.trim()) needs.add(s.trim());
  for (const s of factual?.needs_source ?? []) if (s?.trim()) needs.add(s.trim());
  return {
    attention: (ship?.user_attention ?? []).filter((s) => s?.trim()),
    needsSource: Array.from(needs),
    questions: detail.openQuestions,
    challenger: ship && (ship.challenger_lead_id || ship.test_variable) ? { lead_id: ship.challenger_lead_id, test_variable: ship.test_variable } : null,
  };
}

export function attentionCount(items: AttentionItems): number {
  return items.attention.length + items.needsSource.length + items.questions.length;
}

export function AttentionPanel({ items, offerId }: { items: AttentionItems; offerId: string | null }) {
  if (attentionCount(items) === 0 && !items.challenger) return <Empty>Nothing waiting on you. The ship step lists open questions, unsourced claims and anything the reviewers want a human to look at.</Empty>;
  return (
    <div className="space-y-5">
      {items.attention.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-warn"><AlertTriangle className="h-3 w-3" /> Look at these before you use the copy</h3>
          <ul className="space-y-1.5">
            {items.attention.map((a, i) => (
              <li key={i} className="rounded-lg border border-warn/30 bg-warn-soft/40 px-3 py-2 text-sm text-ink">{a}</li>
            ))}
          </ul>
        </section>
      )}
      {items.needsSource.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-bad"><FileQuestion className="h-3 w-3" /> Claims with no evidence in the ledger</h3>
          <p className="mb-2 text-xs text-ink-muted">These lines were written as <code className="rounded bg-surface-sunken px-1">[[NEEDS SOURCE]]</code>. Add the evidence to the ledger and regenerate, or cut the claim.</p>
          <ul className="space-y-1.5">
            {items.needsSource.map((s, i) => (
              <li key={i} className="rounded-lg border border-line px-3 py-2 text-sm text-ink">{s}</li>
            ))}
          </ul>
          {offerId && <Link href={`/app/offers/${offerId}?tab=ledger`} className="mt-2 inline-block text-xs font-medium text-brand-strong hover:underline">Open the claims ledger</Link>}
        </section>
      )}
      {items.questions.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted"><HelpCircle className="h-3 w-3" /> Open questions about the offer</h3>
          <ul className="space-y-1.5">
            {items.questions.map((q) => (
              <li key={q.id} className="rounded-lg border border-line px-3 py-2 text-sm">
                <div className="text-ink">{q.question}</div>
                {q.why && <div className="mt-0.5 text-xs text-ink-muted">{q.why}</div>}
              </li>
            ))}
          </ul>
          {offerId && <Link href={`/app/offers/${offerId}?tab=questions`} className="mt-2 inline-block text-xs font-medium text-brand-strong hover:underline">Answer on the offer page</Link>}
        </section>
      )}
      {items.challenger && (
        <section className="rounded-lg bg-surface-alt p-3 text-sm">
          <h3 className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted"><FlaskConical className="h-3 w-3" /> Test next</h3>
          <p className="text-ink">
            {items.challenger.test_variable ? <>Challenger tests <span className="font-medium">{items.challenger.test_variable}</span>.</> : "A challenger lead is ready."}
            {items.challenger.lead_id && <span className="text-ink-muted"> Lead {items.challenger.lead_id}.</span>}
          </p>
        </section>
      )}
    </div>
  );
}
