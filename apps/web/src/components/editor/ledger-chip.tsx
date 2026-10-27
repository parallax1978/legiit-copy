"use client";
import { createContext, useContext, useMemo, Fragment } from "react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ClaimSummary } from "@/lib/data/generations";
import { LEDGER_TAG } from "@engine/schemas/common.ts";
import { NEEDS_SOURCE } from "./markdown-blocks";

interface LedgerContextValue {
  claims: Map<string, ClaimSummary>;
  /** Stable 1-based numbers per claim id, in order of first appearance in the draft. */
  numbers: Map<string, number>;
  offerId: string | null;
  show: boolean;
}

const LedgerContext = createContext<LedgerContextValue>({ claims: new Map(), numbers: new Map(), offerId: null, show: true });

export function LedgerProvider({ claims, orderedIds, offerId, show, children }: { claims: ClaimSummary[]; orderedIds: string[]; offerId: string | null; show: boolean; children: React.ReactNode }) {
  const value = useMemo<LedgerContextValue>(() => {
    const map = new Map(claims.map((c) => [c.id, c]));
    const numbers = new Map<string, number>();
    orderedIds.forEach((id) => {
      if (!numbers.has(id)) numbers.set(id, numbers.size + 1);
    });
    return { claims: map, numbers, offerId, show };
  }, [claims, orderedIds, offerId, show]);
  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger() {
  return useContext(LedgerContext);
}

export function claimHref(offerId: string | null, claimId: string) {
  return offerId ? `/app/offers/${offerId}?tab=ledger#claim-${claimId}` : "#";
}

export function LedgerChip({ id, className }: { id: string; className?: string }) {
  const { claims, numbers, offerId, show } = useLedger();
  if (!show) return null;
  const claim = claims.get(id);
  const n = numbers.get(id);
  const label = n != null ? `L${n}` : `L:${id.slice(0, 4)}`;
  const chip = (
    <Link
      href={claimHref(offerId, id)}
      className={cn("ledger-ref ml-0.5 inline-flex items-center gap-0.5 no-underline hover:bg-brand-soft", !claim && "bg-warn-soft text-warn", className)}
      data-ledger-id={id}
      onClick={(e) => e.stopPropagation()}
      contentEditable={false}
    >
      {label}
    </Link>
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {claim ? (
          <div className="space-y-1">
            <div className="text-xs leading-snug">{claim.claim_text}</div>
            <div className="flex flex-wrap gap-1 text-[10px] opacity-80">
              <span>{claim.claim_type.replace(/_/g, " ")}</span>
              {claim.role && <span>· {claim.role}</span>}
              {claim.evidence_grade && <span>· grade {claim.evidence_grade}</span>}
              <span>· {claim.status}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs">Claim {id} is not in this offer&apos;s ledger.</div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/** Text with inline [[L:<id>]] tags rendered as chips and [[NEEDS SOURCE]] as a warning mark. */
export function LedgerText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => splitLedger(text), [text]);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.kind === "text" ? (
          <Fragment key={i}>{p.value}</Fragment>
        ) : p.kind === "ledger" ? (
          <LedgerChip key={i} id={p.value} />
        ) : (
          <span key={i} className="mx-0.5 rounded bg-warn-soft px-1 text-[0.7rem] font-semibold text-warn" title="The claims ledger does not hold this figure, name or date. Add it to the ledger, or cut it; the line's promise stands without it.">
            NEEDS SOURCE
          </span>
        ),
      )}
    </span>
  );
}

type Part = { kind: "text" | "ledger" | "needs_source"; value: string };

export function splitLedger(text: string): Part[] {
  const out: Part[] = [];
  const re = new RegExp(`${LEDGER_TAG.source}|${NEEDS_SOURCE.replace(/[[\]]/g, "\\$&")}`, "g");
  let last = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ kind: "text", value: text.slice(last, idx).replace(/\s+$/, (ws) => (ws ? " " : "")) });
    if (m[1]) out.push({ kind: "ledger", value: m[1] });
    else out.push({ kind: "needs_source", value: NEEDS_SOURCE });
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", value: text.slice(last) });
  return out;
}
