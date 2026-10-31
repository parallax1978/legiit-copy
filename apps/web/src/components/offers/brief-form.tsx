"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { OfferBrief } from "@engine/schemas/mod.ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveBrief } from "@/lib/actions/offers";
import { PRICE_PLANS } from "./constants";
import { Field, TextInput, TextArea, LinesArea, SectionCard, ReadOnlyNote } from "./fields";
import { linesToArray } from "./normalize";

const NONE = "__none__";

export function BriefForm({ offerId, name: initialName, brief: initial, editable, empty }: { offerId: string; name: string; brief: OfferBrief; editable: boolean; empty: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [b, setB] = useState<OfferBrief>(initial);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const ro = !editable;
  // the page refreshes underneath when the offer changes (a status, a source): the stored brief replaces the form only while nothing typed is unsaved
  const stored = JSON.stringify({ initialName, initial });
  useEffect(() => {
    if (dirty) return;
    const s = JSON.parse(stored) as { initialName: string; initial: OfferBrief };
    setName(s.initialName);
    setB(s.initial);
  }, [stored, dirty]);

  function patch(p: Partial<OfferBrief>) {
    setB((prev) => ({ ...prev, ...p }));
    setDirty(true);
  }

  function save() {
    const clean: OfferBrief = {
      ...b,
      deliverables: linesToArray(b.deliverables.join("\n")),
      competitors: linesToArray(b.competitors.join("\n")),
      urls: linesToArray(b.urls.join("\n")),
      audience: { ...b.audience, verbatim_sources: linesToArray(b.audience.verbatim_sources.join("\n")) },
      proof_available: b.proof_available.filter((p) => p.claim.trim() || p.evidence.trim()),
      terms: b.terms?.trim() ? b.terms : null,
      positioning: b.positioning?.trim() ? b.positioning : null,
      guarantee: { ...b.guarantee, text: b.guarantee.text?.trim() ? b.guarantee.text : null, type: b.guarantee.type?.trim() ? b.guarantee.type : null },
    };
    start(async () => {
      const r = await saveBrief(offerId, { name, brief: clean });
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("Brief saved.");
        setDirty(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <ReadOnlyNote show={ro} />
      {empty && <p className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">The brief is empty. Extraction fills it from the sources; you can also type it in by hand and save.</p>}

      <SectionCard
        title="Product"
        actions={
          editable && (
            <Button size="sm" onClick={save} disabled={pending || !dirty}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save brief
            </Button>
          )
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Offer name" htmlFor="offer-name" hint="How it shows in the offers list.">
            <Input id="offer-name" value={name} disabled={ro} onChange={(e) => { setName(e.target.value); setDirty(true); }} />
          </Field>
          <Field label="Product name" htmlFor="product_name" hint="As the customer sees it on the order form.">
            <TextInput id="product_name" value={b.product_name} disabled={ro} onChange={(v) => patch({ product_name: v })} />
          </Field>
          <Field label="One line" htmlFor="one_line" hint="What it is, for whom, in one sentence. No adjectives." className="md:col-span-2">
            <TextArea id="one_line" rows={2} value={b.one_line} disabled={ro} onChange={(v) => patch({ one_line: v })} />
          </Field>
          <Field label="Deliverables" hint="One per line. Exactly what arrives, in what form, when." className="md:col-span-2">
            <LinesArea value={b.deliverables} disabled={ro} rows={5} onChange={(v) => patch({ deliverables: v })} placeholder={"6 live sessions, 90 minutes each\nRetainer proposal template (Google Doc)\nPrivate Slack for 12 months"} />
          </Field>
          <Field label="Positioning" htmlFor="positioning" hint="The category it belongs to and how it differs from the obvious alternative." className="md:col-span-2">
            <TextArea id="positioning" rows={3} value={b.positioning} disabled={ro} onChange={(v) => patch({ positioning: v })} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Price, terms and guarantee">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Price as stated" htmlFor="price_text" hint="Exactly as it appears, e.g. “$1,497 or 3 × $549”.">
            <TextInput id="price_text" value={b.price.text} disabled={ro} onChange={(v) => patch({ price: { ...b.price, text: v } })} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Amount" htmlFor="price_amount">
              <Input id="price_amount" type="number" inputMode="decimal" step="0.01" value={b.price.amount ?? ""} disabled={ro} onChange={(e) => patch({ price: { ...b.price, amount: e.target.value === "" ? null : Number(e.target.value) } })} />
            </Field>
            <Field label="Currency" htmlFor="price_currency">
              <TextInput id="price_currency" placeholder="USD" value={b.price.currency} disabled={ro} onChange={(v) => patch({ price: { ...b.price, currency: v || null } })} />
            </Field>
            <Field label="Plan">
              <Select value={b.price.plan ?? NONE} disabled={ro} onValueChange={(v) => patch({ price: { ...b.price, plan: v === NONE ? null : v } })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unknown</SelectItem>
                  {PRICE_PLANS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Terms" htmlFor="terms" hint="Billing, renewal, cancellation, delivery, added costs. Everything the order form says." className="md:col-span-2">
            <TextArea id="terms" rows={3} value={b.terms} disabled={ro} onChange={(v) => patch({ terms: v })} />
          </Field>
          <Field label="Guarantee text" htmlFor="guarantee_text" hint="The sentence the customer reads. Conditions included.">
            <TextArea id="guarantee_text" rows={3} value={b.guarantee.text} disabled={ro} onChange={(v) => patch({ guarantee: { ...b.guarantee, text: v } })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type" htmlFor="guarantee_type" hint="money back, conditional, performance, none">
              <TextInput id="guarantee_type" value={b.guarantee.type} disabled={ro} onChange={(v) => patch({ guarantee: { ...b.guarantee, type: v } })} />
            </Field>
            <Field label="Days" htmlFor="guarantee_days">
              <Input id="guarantee_days" type="number" inputMode="numeric" value={b.guarantee.days ?? ""} disabled={ro} onChange={(e) => patch({ guarantee: { ...b.guarantee, days: e.target.value === "" ? null : Number(e.target.value) } })} />
            </Field>
            <div className="col-span-2 flex items-center justify-between rounded-md border border-line px-3 py-2">
              <div>
                <p className="text-sm font-medium text-ink">Denominated</p>
                <p className="text-xs text-ink-muted">The guarantee names a measurable result or a specific refund, not just “satisfaction”.</p>
              </div>
              <Switch checked={b.guarantee.denominated} disabled={ro} onCheckedChange={(v) => patch({ guarantee: { ...b.guarantee, denominated: v } })} />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Audience and market">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Who" htmlFor="aud_who" hint="The buyer, described by situation rather than demographics.">
            <TextArea id="aud_who" rows={3} value={b.audience.who} disabled={ro} onChange={(v) => patch({ audience: { ...b.audience, who: v } })} />
          </Field>
          <Field label="Situation" htmlFor="aud_situation" hint="What just happened or keeps happening that makes them look.">
            <TextArea id="aud_situation" rows={3} value={b.audience.situation} disabled={ro} onChange={(v) => patch({ audience: { ...b.audience, situation: v || null } })} />
          </Field>
          <Field label="Where customers talk" hint="One per line: review pages, forums, groups, support inboxes. Research mines these for verbatims.">
            <LinesArea value={b.audience.verbatim_sources} disabled={ro} onChange={(v) => patch({ audience: { ...b.audience, verbatim_sources: v } })} />
          </Field>
          <Field label="Competitors" hint="One per line. Names or URLs.">
            <LinesArea value={b.competitors} disabled={ro} onChange={(v) => patch({ competitors: v })} />
          </Field>
          <Field label="URLs" hint="One per line. Pages that belong to this offer." className="md:col-span-2">
            <LinesArea value={b.urls} disabled={ro} rows={3} onChange={(v) => patch({ urls: v })} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Proof available"
        description="Facts the sources offer as evidence. Each one should also be a ledger row with a grade."
        actions={
          editable && (
            <Button size="sm" variant="outline" onClick={() => patch({ proof_available: [...b.proof_available, { claim: "", evidence: "", source: null }] })}>
              <Plus className="size-4" /> Add
            </Button>
          )
        }
      >
        {b.proof_available.length === 0 ? (
          <p className="text-sm text-ink-soft">No proof recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {b.proof_available.map((p, i) => (
              <li key={i} className="grid gap-2 rounded-md border border-line p-3 md:grid-cols-[1fr_1fr_200px_auto]">
                <TextArea aria-label="Claim" rows={2} placeholder="Claim" value={p.claim} disabled={ro} onChange={(v) => patch({ proof_available: b.proof_available.map((x, j) => (j === i ? { ...x, claim: v } : x)) })} />
                <TextArea aria-label="Evidence" rows={2} placeholder="Evidence" value={p.evidence} disabled={ro} onChange={(v) => patch({ proof_available: b.proof_available.map((x, j) => (j === i ? { ...x, evidence: v } : x)) })} />
                <TextInput aria-label="Source" placeholder="Source" value={p.source} disabled={ro} onChange={(v) => patch({ proof_available: b.proof_available.map((x, j) => (j === i ? { ...x, source: v || null } : x)) })} />
                {editable && (
                  <Button size="icon-sm" variant="ghost" aria-label="Remove" onClick={() => patch({ proof_available: b.proof_available.filter((_, j) => j !== i) })}>
                    <Trash2 className="size-4 text-ink-soft" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {editable && (
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={save} disabled={pending || !dirty} className="rounded-full shadow-glow">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {dirty ? "Save brief" : "Saved"}
          </Button>
        </div>
      )}
    </div>
  );
}
