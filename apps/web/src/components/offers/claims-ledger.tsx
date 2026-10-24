"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Check, Loader2, Pencil, Plus, Trash2, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { decideClaim, deleteClaim } from "@/lib/actions/offers";
import { cn } from "@/lib/utils";
import { CLAIM_TYPES, CLAIM_TYPE_LABELS, CLAIM_ROLE_LABELS, type ClaimType, type ClaimRole } from "./constants";
import { ClaimStatusBadge, GradeBadge, SeverityBadge } from "./badges";
import { ReadOnlyNote } from "./fields";
import { normalizeEvidence, normalizeFlag, type OfferClaimRow, type ClaimFlag } from "./normalize";
import { ClaimDialog } from "./claim-dialog";

type StatusFilter = "all" | "verified" | "unverified" | "flagged" | "decided";

export function ClaimsLedger({ offerId, claims, editable }: { offerId: string; claims: OfferClaimRow[]; editable: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<"all" | ClaimType>("all");
  const [dialog, setDialog] = useState<{ open: boolean; claim: OfferClaimRow | null }>({ open: false, claim: null });
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { verified: 0, unverified: 0, flagged: 0, decided: 0 };
    for (const cl of claims) {
      if (cl.user_decision) c.decided++;
      if (cl.status === "flagged" && !cl.user_decision) c.flagged++;
      else if (cl.status === "verified") c.verified++;
      else if (cl.status === "unverified") c.unverified++;
    }
    return c;
  }, [claims]);

  const rows = useMemo(() => {
    const filtered = claims.filter((c) => {
      if (type !== "all" && c.claim_type !== type) return false;
      if (status === "all") return true;
      if (status === "decided") return !!c.user_decision;
      if (status === "flagged") return c.status === "flagged" && !c.user_decision;
      return c.status === status && !(c.status === "flagged" && c.user_decision);
    });
    // Undecided flags first, then by creation.
    return filtered.sort((a, b) => Number(!!b.flag && !b.user_decision) - Number(!!a.flag && !a.user_decision));
  }, [claims, status, type]);

  function decide(claim: OfferClaimRow, decision: "keep" | "rewrite" | "drop") {
    setBusy(claim.id);
    start(async () => {
      const r = await decideClaim(offerId, claim.id, decision);
      setBusy(null);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(decision === "keep" ? "Kept as written." : decision === "rewrite" ? "Rewrite applied." : "Marked dropped. The row stays in the ledger for the record.");
        router.refresh();
      }
    });
  }
  function remove(claim: OfferClaimRow) {
    if (!confirm("Delete this claim from the ledger? Copy that cites it will show [[NEEDS SOURCE]] until replaced.")) return;
    setBusy(claim.id);
    start(async () => {
      const r = await deleteClaim(offerId, claim.id);
      setBusy(null);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("Claim deleted.");
        router.refresh();
      }
    });
  }

  const typesPresent = CLAIM_TYPES.filter((t) => claims.some((c) => c.claim_type === t));

  return (
    <div className="space-y-4">
      <ReadOnlyNote show={!editable} />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["all", `All ${claims.length}`],
              ["flagged", `Flagged ${counts.flagged}`],
              ["unverified", `Unverified ${counts.unverified}`],
              ["verified", `Verified ${counts.verified}`],
              ["decided", `Decided ${counts.decided}`],
            ] as [StatusFilter, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setStatus(k)}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", status === k ? "border-brand bg-brand-faint text-brand-strong" : "border-line bg-surface text-ink-muted hover:text-ink", k === "flagged" && counts.flagged > 0 && status !== k && "border-warn/40 text-warn")}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Select value={type} onValueChange={(v) => setType(v as "all" | ClaimType)}>
            <SelectTrigger size="sm" className="w-full md:w-56">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {(typesPresent.length ? typesPresent : CLAIM_TYPES).map((t) => (
                <SelectItem key={t} value={t}>
                  {CLAIM_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {editable && (
            <Button size="sm" onClick={() => setDialog({ open: true, claim: null })}>
              <Plus className="size-4" /> Add claim
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-ink-muted">
        Nothing here is hidden or removed by the system. A flagged claim shows the rule and a suggested rewrite; you keep it, apply the rewrite or drop it. Dropped rows stay listed and are never used in copy.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong bg-surface p-8 text-center text-sm text-ink-muted">{claims.length === 0 ? "No claims yet. Extraction fills the ledger from the sources; you can also add rows by hand." : "No claims match these filters."}</div>
      ) : (
        <>
          {/* desktop table */}
          <div className="hidden overflow-hidden rounded-card border border-line bg-surface shadow-card md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-surface-alt hover:bg-surface-alt">
                  <TableHead className="w-[38%]">Claim</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead>Status</TableHead>
                  {editable && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => {
                  const flag = normalizeFlag(c.flag);
                  const ev = normalizeEvidence(c.evidence);
                  const dropped = c.user_decision === "drop";
                  const isBusy = pending && busy === c.id;
                  return [
                    <TableRow key={c.id} className={cn(dropped && "opacity-60", flag && !c.user_decision && "bg-bad-soft/20 hover:bg-bad-soft/30")}>
                      <TableCell className="whitespace-normal align-top">
                        <p className={cn("text-sm text-ink", dropped && "line-through")}>{c.claim_text}</p>
                        {c.precision && <p className="mt-1 text-xs text-ink-muted">Precision: {c.precision}</p>}
                        {c.typical_result && <p className="mt-0.5 text-xs text-ink-muted">Typical: {c.typical_result}</p>}
                        <p className="mt-1 text-[11px] text-ink-soft">
                          {c.created_by === "user" ? "Added by the team" : "Extracted"} · {new Date(c.updated_at).toLocaleDateString()}
                          {c.material_connection && " · material connection"}
                          {c.story_claim && " · story claim"}
                          {c.establishment_signal && " · establishment signal"}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-normal align-top text-xs text-ink">{CLAIM_TYPE_LABELS[c.claim_type as ClaimType] ?? c.claim_type}</TableCell>
                      <TableCell className="align-top text-xs text-ink-muted">{c.role ? CLAIM_ROLE_LABELS[c.role as ClaimRole] ?? c.role : "—"}</TableCell>
                      <TableCell className="align-top text-center">
                        <GradeBadge grade={c.evidence_grade} />
                      </TableCell>
                      <TableCell className="max-w-[260px] whitespace-normal align-top text-xs">
                        <EvidenceCell ev={ev} />
                      </TableCell>
                      <TableCell className="align-top">
                        <ClaimStatusBadge status={c.status} decision={c.user_decision} />
                        {c.user_decision && c.user_decision !== "drop" && <p className="mt-1 text-[11px] text-ink-soft">{c.user_decision === "keep" ? "Kept as written" : "Rewrite applied"}</p>}
                      </TableCell>
                      {editable && (
                        <TableCell className="align-top">
                          <div className="flex items-center gap-0.5">
                            <Button size="icon-sm" variant="ghost" aria-label="Edit" disabled={isBusy} onClick={() => setDialog({ open: true, claim: c })}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button size="icon-sm" variant="ghost" aria-label="Delete" disabled={isBusy} onClick={() => remove(c)}>
                              {isBusy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 text-ink-soft" />}
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>,
                    flag ? (
                      <TableRow key={`${c.id}-flag`} className="hover:bg-transparent">
                        <TableCell colSpan={editable ? 7 : 6} className="whitespace-normal p-0">
                          <FlagPanel flag={flag} decision={c.user_decision} editable={editable} busy={isBusy} onDecide={(d) => decide(c, d)} />
                        </TableCell>
                      </TableRow>
                    ) : null,
                  ];
                })}
              </TableBody>
            </Table>
          </div>

          {/* mobile cards */}
          <ul className="space-y-3 md:hidden">
            {rows.map((c) => {
              const flag = normalizeFlag(c.flag);
              const ev = normalizeEvidence(c.evidence);
              const dropped = c.user_decision === "drop";
              const isBusy = pending && busy === c.id;
              return (
                <li key={c.id} className={cn("overflow-hidden rounded-card border border-line bg-surface shadow-card", dropped && "opacity-60")}>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ClaimStatusBadge status={c.status} decision={c.user_decision} />
                        <GradeBadge grade={c.evidence_grade} />
                        <span className="text-xs text-ink-muted">{CLAIM_TYPE_LABELS[c.claim_type as ClaimType] ?? c.claim_type}</span>
                      </div>
                      {editable && (
                        <div className="flex items-center">
                          <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => setDialog({ open: true, claim: c })}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" aria-label="Delete" disabled={isBusy} onClick={() => remove(c)}>
                            <Trash2 className="size-4 text-ink-soft" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className={cn("mt-2 text-sm text-ink", dropped && "line-through")}>{c.claim_text}</p>
                    <div className="mt-2 text-xs text-ink-muted">
                      <EvidenceCell ev={ev} />
                    </div>
                    {c.role && <p className="mt-1 text-xs text-ink-soft">Role: {CLAIM_ROLE_LABELS[c.role as ClaimRole] ?? c.role}</p>}
                  </div>
                  {flag && <FlagPanel flag={flag} decision={c.user_decision} editable={editable} busy={isBusy} onDecide={(d) => decide(c, d)} />}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ClaimDialog offerId={offerId} claim={dialog.claim} open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />
    </div>
  );
}

function EvidenceCell({ ev }: { ev: ReturnType<typeof normalizeEvidence> }) {
  const detail = [ev.endpoint && `endpoint ${ev.endpoint}`, ev.population && `n/pop ${ev.population}`, ev.dose && `dose ${ev.dose}`, ev.duration && ev.duration, ev.effect_size && `effect ${ev.effect_size}`].filter(Boolean).join(" · ");
  if (!ev.source_ref && !ev.quote && !detail) return <span className="text-ink-soft">No source on file</span>;
  return (
    <div className="space-y-0.5">
      {ev.source_ref && <p className="break-words text-ink">{/^https?:\/\//.test(ev.source_ref) ? <a href={ev.source_ref} target="_blank" rel="noreferrer" className="underline decoration-line-strong hover:text-brand">{ev.source_ref}</a> : ev.source_ref}</p>}
      {ev.quote && <p className="text-ink-muted">“{ev.quote}”</p>}
      {detail && <p className="text-ink-soft">{detail}</p>}
    </div>
  );
}

function FlagPanel({ flag, decision, editable, busy, onDecide }: { flag: ClaimFlag; decision: string | null; editable: boolean; busy: boolean; onDecide: (d: "keep" | "rewrite" | "drop") => void }) {
  const decided = !!decision;
  return (
    <div className={cn("border-t px-4 py-3", decided ? "border-line bg-surface-alt" : "border-bad-soft bg-bad-soft/30")}>
      <div className="flex flex-wrap items-center gap-2">
        <AlertTriangle className={cn("size-4", decided ? "text-ink-soft" : "text-bad")} />
        <span className="text-sm font-medium text-ink">{decided ? "Flag (decided)" : "Flagged for your decision"}</span>
        <SeverityBadge severity={flag.severity} />
        {decided && <span className="text-xs text-ink-muted">You chose: {decision === "keep" ? "keep as is" : decision === "rewrite" ? "apply rewrite" : "drop"}</span>}
      </div>
      <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft sm:pt-0.5">Rule</dt>
        <dd className="text-ink">{flag.rule || "—"}</dd>
        <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft sm:pt-0.5">Issue</dt>
        <dd className="text-ink">{flag.issue || "—"}</dd>
        <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft sm:pt-0.5">Suggested rewrite</dt>
        <dd className={cn("text-ink", flag.suggested_rewrite && "rounded-md bg-surface px-2 py-1.5 ring-1 ring-line")}>{flag.suggested_rewrite ?? "No rewrite offered. Edit the claim or drop it."}</dd>
      </dl>
      {editable && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant={decision === "keep" ? "default" : "outline"} disabled={busy} onClick={() => onDecide("keep")}>
            <Check className="size-4" /> Keep as is
          </Button>
          <Button size="sm" variant={decision === "rewrite" ? "default" : "outline"} disabled={busy || !flag.suggested_rewrite} onClick={() => onDecide("rewrite")}>
            <Wand2 className="size-4" /> Apply rewrite
          </Button>
          <Button size="sm" variant={decision === "drop" ? "destructive" : "outline"} disabled={busy} onClick={() => onDecide("drop")}>
            <X className="size-4" /> Drop
          </Button>
          {busy && <Loader2 className="size-4 animate-spin self-center text-ink-soft" />}
        </div>
      )}
    </div>
  );
}
