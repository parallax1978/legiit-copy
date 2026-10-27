"use client";
import { Eraser, Eye, Gavel, Gauge, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GenerationDetail } from "@/lib/data/generations";
import type { TellEditOutput } from "@engine/schemas/mod.ts";
import { getColdRead, getEditorial, getMechanical, getShip, getTellEdits } from "./outputs";
import { PredictionBadge } from "./status-badge";
import { Empty } from "./panel-argument";
import { LedgerText } from "@/components/editor/ledger-chip";

export function ReviewPanel({ detail }: { detail: GenerationDetail }) {
  const editorial = getEditorial(detail.steps);
  const cold = getColdRead(detail.steps);
  const mech = getMechanical(detail.steps);
  const ship = getShip(detail.steps);
  const tellEdits = getTellEdits(detail.steps);
  const prediction = detail.predictions[detail.predictions.length - 1] ?? null;
  // The beat/lose call only means something against copy the user pasted; without it, the verdict is the review.
  const hasControl = !!((detail.generation.options as { control_text?: string } | null)?.control_text ?? "").trim();
  const verdictLabel = editorial?.verdict === "APPROVE" ? "Ready to use" : editorial?.verdict === "REVISE" ? "Needs work" : "Not ready";
  const gateLabel: Record<string, string> = { A: "the argument", B: "the lead", C: "the claims", D: "the voice" };

  if (!editorial && !cold && !mech && !tellEdits.length) return <Empty>Reviews appear here once the piece is written: the copy chief&apos;s verdict, what a blind reader took from it, and the tell check.</Empty>;

  return (
    <div className="space-y-6">
      {(editorial || ship || prediction) && (
        <section className="space-y-3">
          <Heading icon={<Gavel className="h-3.5 w-3.5" />}>Copy chief&apos;s verdict</Heading>
          <div className="flex flex-wrap items-center gap-2">
            {editorial && (
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", editorial.verdict === "APPROVE" ? "bg-good-soft text-good" : editorial.verdict === "REVISE" ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad")}>
                {verdictLabel}{editorial.reject_gate ? ` · stopped at ${gateLabel[editorial.reject_gate] ?? editorial.reject_gate}` : ""}
              </span>
            )}
            {hasControl && <PredictionBadge prediction={ship?.prediction ?? prediction?.prediction ?? editorial?.prediction ?? "unsure"} />}
          </div>
          {editorial && !hasControl && (
            <p className="text-xs text-ink-soft">To get a head-to-head call, paste the copy you use today as &quot;Your current copy&quot; when you start a piece.</p>
          )}
          {hasControl && (ship?.prediction_reason ?? prediction?.reason ?? editorial?.prediction_reason) && <p className="text-sm text-ink-muted"><LedgerText text={ship?.prediction_reason ?? prediction?.reason ?? editorial?.prediction_reason ?? ""} /></p>}
          {prediction?.reported_result ? (
            <p className="rounded-lg bg-surface-alt px-3 py-2 text-xs text-ink-muted">
              <span className="font-medium text-ink">What actually happened:</span> {describeResult(prediction.reported_result)}
              {prediction.refund_rate != null ? ` · refunds ${(Number(prediction.refund_rate) * 100).toFixed(1)}%` : ""}
            </p>
          ) : null}
          {editorial && (
            <>
              {editorial.one_thing && (
                <div className="rounded-lg border border-bad/30 bg-bad-soft/40 p-3">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-bad">Fix this first</div>
                  <Note note={editorial.one_thing} />
                </div>
              )}
              {editorial.secondary_notes?.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Also worth fixing</div>
                  <ol className="space-y-2">
                    {editorial.secondary_notes.map((n, i) => (
                      <li key={i} className="rounded-lg border border-line p-2.5"><Note note={n} /></li>
                    ))}
                  </ol>
                </div>
              )}
              {editorial.what_works?.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-good">What works</div>
                  <ul className="space-y-1.5">
                    {editorial.what_works.map((w, i) => (
                      <li key={i} className="text-sm"><q className="text-ink"><LedgerText text={w.quote} /></q> <span className="text-ink-muted">— <LedgerText text={w.why} /></span></li>
                    ))}
                  </ul>
                </div>
              )}
              {editorial.do_not_touch?.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Do not touch</div>
                  <ul className="space-y-1 text-sm">
                    {editorial.do_not_touch.map((d, i) => <li key={i} className="border-l-2 border-good pl-2 text-ink"><LedgerText text={d} /></li>)}
                  </ul>
                </div>
              )}
              {editorial.argument_readback && (
                <details>
                  <summary className="cursor-pointer text-xs font-medium text-ink-muted hover:text-ink">Argument readback {editorial.argument_readback.matches_memo ? "(matches the memo)" : "(does not match the memo)"}</summary>
                  <dl className="mt-2 grid gap-1 text-xs">
                    <KV k="Sells" v={editorial.argument_readback.sells} />
                    <KV k="To" v={editorial.argument_readback.to} />
                    <KV k="Promise" v={editorial.argument_readback.promise} />
                    <KV k="Because" v={editorial.argument_readback.because} />
                    <KV k="Skim readback" v={editorial.skim_readback} />
                  </dl>
                </details>
              )}
              {editorial.testable_disputes?.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-xs font-medium text-ink-muted hover:text-ink">{editorial.testable_disputes.length} testable dispute{editorial.testable_disputes.length === 1 ? "" : "s"}</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-ink-muted">{editorial.testable_disputes.map((d, i) => <li key={i}><LedgerText text={d} /></li>)}</ul>
                </details>
              )}
              {editorial.calibration && (
                <details>
                  <summary className="cursor-pointer text-xs font-medium text-ink-muted hover:text-ink">Calibration dimensions (logged, never decide the verdict)</summary>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {Object.entries(editorial.calibration).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        <span className="w-20 shrink-0 capitalize text-ink-muted">{k.replace(/_/g, " ")}</span>
                        <span className="flex gap-0.5">{[1, 2, 3].map((n) => <span key={n} className={cn("h-2 w-4 rounded-sm", Number(v) >= n ? "bg-brand" : "bg-surface-sunken")} />)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </section>
      )}

      {tellEdits.length > 0 && <TellEditSection runs={tellEdits} />}

      {cold && (
        <section className="space-y-3 border-t border-line pt-5">
          <Heading icon={<Eye className="h-3.5 w-3.5" />}>Cold read <span className="font-normal normal-case tracking-normal text-ink-soft">· a different model, no brief</span></Heading>
          <dl className="grid gap-2 text-sm">
            <KV k="What is sold" v={cold.skim_readback?.what_sold} />
            <KV k="To whom" v={cold.skim_readback?.to_whom} />
            <KV k="For how much" v={cold.skim_readback?.price} />
            <KV k="Why believe it" v={cold.skim_readback?.why_believe} />
            <KV k="The promise, one sentence" v={cold.promise_one_sentence} />
          </dl>
          {cold.attention_drop_line && (
            <p className="rounded-lg bg-warn-soft/60 px-3 py-2 text-sm"><span className="text-[11px] font-semibold uppercase tracking-wide text-warn">Attention dropped at</span><br /><q className="text-ink"><LedgerText text={cold.attention_drop_line} /></q></p>
          )}
          {cold.disbelieved_claim && (
            <p className="rounded-lg bg-bad-soft/50 px-3 py-2 text-sm"><span className="text-[11px] font-semibold uppercase tracking-wide text-bad">Did not believe</span><br /><q className="text-ink"><LedgerText text={cold.disbelieved_claim} /></q></p>
          )}
          {cold.lead_pick && <p className="text-xs text-ink-muted"><span className="font-medium text-ink">Lead pick:</span> {cold.lead_pick.chosen_lead_id} — <LedgerText text={cold.lead_pick.reason} /></p>}
        </section>
      )}

      {mech && (
        <section className="space-y-3 border-t border-line pt-5">
          <Heading icon={<Gauge className="h-3.5 w-3.5" />}>Mechanical passes</Heading>
          <div className="flex flex-wrap gap-2 text-xs">
            <Stat label="Tell score / 300 words" value={fmt(mech.tell_score_per_300)} warn={mech.tell_score_per_300 > 1} />
            {mech.fk_grade != null && <Stat label="FK grade" value={fmt(mech.fk_grade)} />}
            {mech.cadence_cv != null && <Stat label="Cadence CV" value={fmt(mech.cadence_cv)} warn={mech.cadence_flag} />}
            <Stat label="“And then” beats" value={String(mech.and_then_count)} />
            <Stat label="Words" value={mech.word_count?.toLocaleString() ?? "—"} />
          </div>
          {mech.hard_fail && (
            <div className="rounded-lg border border-bad/30 bg-bad-soft/40 p-3 text-sm">
              <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-bad"><ShieldAlert className="h-3 w-3" /> Hard fail</div>
              <ul className="list-disc space-y-0.5 pl-4 text-ink">{mech.hard_fail_reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
          {mech.format_gate_failures?.length > 0 && (
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-warn">Format gate failures</div>
              <ul className="list-disc space-y-0.5 pl-4 text-sm text-ink">{mech.format_gate_failures.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
          {mech.flags?.length > 0 && (
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Tells found</div>
              <ul className="space-y-2">
                {mech.flags.map((f, i) => (
                  <li key={i} className="rounded-lg border border-line p-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink">{f.tell}</span>
                      <span className="shrink-0 text-xs text-ink-muted">tier {f.tier} · ×{f.count}</span>
                    </div>
                    {f.examples?.length > 0 && <p className="mt-1 text-xs text-ink-muted"><q><LedgerText text={f.examples[0]} /></q>{f.examples.length > 1 ? ` and ${f.examples.length - 1} more` : ""}</p>}
                    {f.fix && <p className="mt-1 text-xs text-ink"><span className="text-ink-muted">Fix:</span> <LedgerText text={f.fix} /></p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/** What the owner's editing rules changed, across the tell edit after the draft and after each revision. */
function TellEditSection({ runs }: { runs: TellEditOutput[] }) {
  const edits = runs.flatMap((r) => r.edits);
  const lines: string[] = [];
  for (const r of runs) for (const l of r.what_changed) if (!lines.some((x) => x.toLowerCase() === l.toLowerCase())) lines.push(l);
  const before = runs[0]?.owner_tells_before ?? 0;
  const after = runs[runs.length - 1]?.owner_tells_after ?? 0;
  return (
    <section className="space-y-3 border-t border-line pt-5">
      <Heading icon={<Eraser className="h-3.5 w-3.5" />}>AI tell cleanup <span className="font-normal normal-case tracking-normal text-ink-soft">· your editing rules, on every draft</span></Heading>
      {edits.length === 0 ? (
        <p className="text-sm text-ink-muted">No AI tells found. The copy was left as written.</p>
      ) : (
        <>
          {lines.length > 0 && <ul className="list-disc space-y-1 pl-4 text-sm text-ink">{lines.slice(0, 6).map((l, i) => <li key={i}>{l}</li>)}</ul>}
          <p className="text-xs text-ink-muted">{edits.length} change{edits.length === 1 ? "" : "s"}. The checker counted {before} AI tell{before === 1 ? "" : "s"} before the cleanup and {after} after.</p>
          <details>
            <summary className="cursor-pointer text-xs font-medium text-ink-muted hover:text-ink">See each change</summary>
            <ul className="mt-2 space-y-2">
              {edits.slice(0, 60).map((e, i) => (
                <li key={i} className="rounded-lg border border-line p-2.5 text-xs">
                  <div className="text-ink-muted line-through"><LedgerText text={e.before} /></div>
                  <div className="mt-1 text-ink">{e.after ? <LedgerText text={e.after} /> : <span className="italic text-ink-muted">cut</span>}</div>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}

function fmt(n: number | null | undefined) {
  return n == null ? "—" : Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function describeResult(r: unknown): string {
  if (!r || typeof r !== "object") return String(r ?? "");
  const o = r as { metric?: string; value?: number; control_value?: number | null; notes?: string };
  const parts = [o.metric ? o.metric.replace(/_/g, " ") : null, o.value != null ? String(o.value) : null, o.control_value != null ? `vs control ${o.control_value}` : null, o.notes || null].filter(Boolean);
  return parts.join(" · ");
}

function Heading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{icon}{children}</h3>;
}

function Note({ note }: { note: { quote: string; fails: string; do: string } }) {
  return (
    <div className="space-y-1 text-sm">
      <q className="block text-ink"><LedgerText text={note.quote} /></q>
      <p className="text-ink-muted"><span className="font-medium text-ink">Fails:</span> <LedgerText text={note.fails} /></p>
      <p className="text-ink-muted"><span className="font-medium text-ink">Do:</span> <LedgerText text={note.do} /></p>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{k}</dt>
      <dd className="text-ink"><LedgerText text={v} /></dd>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={cn("rounded-lg border px-2.5 py-1.5", warn ? "border-warn/40 bg-warn-soft/50" : "border-line")}>
      <div className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className={cn("font-semibold", warn ? "text-warn" : "text-ink")}>{value}</div>
    </div>
  );
}
