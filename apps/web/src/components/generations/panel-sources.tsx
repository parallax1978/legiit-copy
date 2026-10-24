"use client";
import { ExternalLink, Quote as QuoteIcon, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GenerationDetail } from "@/lib/data/generations";
import type { Dossier } from "@engine/schemas/mod.ts";
import type { ArgumentOutput } from "@engine/schemas/mod.ts";
import { Empty } from "./panel-argument";
import { LedgerChip } from "@/components/editor/ledger-chip";

type Source = { url?: string | null; title?: string | null; kind?: string | null };

function readSources(v: unknown): Source[] {
  return Array.isArray(v) ? (v as Source[]).filter((s) => s && (s.url || s.title)) : [];
}

export function SourcesPanel({ detail, ledgerIds }: { detail: GenerationDetail; ledgerIds: string[] }) {
  const research = detail.research;
  const dossier = (research?.dossier && typeof research.dossier === "object" ? (research.dossier as Partial<Dossier>) : null) ?? null;
  const sources = [...readSources(research?.sources), ...readSources(dossier?.sources)].filter((s, i, all) => all.findIndex((x) => (x.url ?? x.title) === (s.url ?? s.title)) === i);
  const winner = detail.angles.find((a) => a.id === detail.generation.selected_angle_id) ?? detail.angles.find((a) => a.is_winner) ?? null;
  const candidate = (winner?.candidate as Partial<ArgumentOutput["candidates"][number]> | null) ?? null;
  const leadVerbatimId = candidate?.lead_verbatim_id ?? null;
  const verbatims = dossier?.verbatims ?? [];
  const usedClaimIds = new Set(ledgerIds);
  const proofUsed = (dossier?.proof_inventory ?? []).filter((p) => p.ledger_ref && usedClaimIds.has(p.ledger_ref));
  const claimsUsed = detail.claims.filter((c) => usedClaimIds.has(c.id));

  if (!research && !claimsUsed.length) return <Empty>No research dossier is attached to this generation. Sources, the verbatims the argument leans on and the ledger rows the copy cites appear here.</Empty>;

  return (
    <div className="space-y-6">
      {claimsUsed.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted"><Link2 className="h-3 w-3" /> Ledger rows cited in this version ({claimsUsed.length})</h3>
          <ul className="space-y-1.5">
            {ledgerIds.map((id) => {
              const c = detail.claims.find((x) => x.id === id);
              if (!c) return null;
              return (
                <li key={id} className="flex gap-2 text-sm">
                  <LedgerChip id={id} className="mt-1 shrink-0" />
                  <span className="text-ink">{c.claim_text}{c.evidence_grade && <span className="ml-1 text-xs text-ink-muted">grade {c.evidence_grade}</span>}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {verbatims.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted"><QuoteIcon className="h-3 w-3" /> Verbatims {leadVerbatimId ? "· lead verbatim first" : ""}</h3>
          <ul className="space-y-2">
            {[...verbatims].sort((a, b) => (a.id === leadVerbatimId ? -1 : b.id === leadVerbatimId ? 1 : 0)).slice(0, 12).map((v) => (
              <li key={v.id} className={cn("rounded-lg border p-2.5 text-sm", v.id === leadVerbatimId ? "border-brand bg-brand-faint/40" : "border-line")}>
                {v.id === leadVerbatimId && <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-strong">Lead verbatim</div>}
                <q className="text-ink">{v.text}</q>
                <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-ink-muted">
                  <span>{v.source_type}</span>
                  {v.speaker_role && <span>· {v.speaker_role}</span>}
                  {v.tags?.slice(0, 3).map((t) => <span key={t} className="rounded bg-surface-sunken px-1">{t.replace(/_/g, " ")}</span>)}
                  {v.source_url && <a href={v.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-brand-strong hover:underline">source <ExternalLink className="h-2.5 w-2.5" /></a>}
                </div>
              </li>
            ))}
          </ul>
          {verbatims.length > 12 && <p className="mt-1 text-xs text-ink-soft">{verbatims.length - 12} more in the dossier on the offer page.</p>}
        </section>
      )}

      {proofUsed.length > 0 && (
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Proof carried by the copy</h3>
          <ul className="space-y-1.5 text-sm">
            {proofUsed.map((p, i) => (
              <li key={i} className="rounded-lg border border-line p-2.5">
                <div className="flex items-start justify-between gap-2"><span className="text-ink">{p.claim}</span><span className="shrink-0 rounded bg-surface-sunken px-1.5 text-[10px] font-semibold">{p.grade}</span></div>
                <div className="mt-0.5 text-xs text-ink-muted">{p.evidence_type.replace(/_/g, " ")}{p.source ? ` · ${p.source}` : ""}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sources.length > 0 && (
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Sources ({sources.length}){research ? ` · research v${research.version}` : ""}</h3>
          <ul className="space-y-1 text-sm">
            {sources.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-ink-soft" />
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer" className="break-all text-brand-strong hover:underline">{s.title?.trim() || s.url}</a>
                ) : (
                  <span className="text-ink">{s.title}</span>
                )}
                {s.kind && <span className="shrink-0 text-[10px] text-ink-soft">{s.kind}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
