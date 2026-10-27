"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { saveClaim, type ClaimInput } from "@/lib/actions/offers";
import { CLAIM_TYPES, CLAIM_TYPE_LABELS, CLAIM_ROLES, CLAIM_ROLE_LABELS, EVIDENCE_GRADES, EVIDENCE_GRADE_LABELS, CLAIM_STATUSES, type ClaimType, type ClaimRole, type EvidenceGradeId, type ClaimStatus } from "./constants";
import { Field, TextInput, TextArea } from "./fields";
import { normalizeEvidence, type OfferClaimRow } from "./normalize";

const NONE = "__none__";

export function emptyClaimInput(): ClaimInput {
  return {
    claim_text: "",
    claim_type: "other",
    role: null,
    evidence_grade: null,
    evidence: { source_ref: null, quote: null, endpoint: null, population: null, dose: null, duration: null, effect_size: null },
    precision: null,
    typical_result: null,
    status: "unverified",
    material_connection: false,
    story_claim: false,
    establishment_signal: false,
  };
}

export function claimToInput(c: OfferClaimRow): ClaimInput {
  return {
    claim_text: c.claim_text,
    claim_type: (CLAIM_TYPES as readonly string[]).includes(c.claim_type) ? (c.claim_type as ClaimType) : "other",
    role: (CLAIM_ROLES as readonly string[]).includes(c.role ?? "") ? (c.role as ClaimRole) : null,
    evidence_grade: (EVIDENCE_GRADES as readonly string[]).includes(c.evidence_grade ?? "") ? (c.evidence_grade as EvidenceGradeId) : null,
    evidence: normalizeEvidence(c.evidence),
    precision: c.precision,
    typical_result: c.typical_result,
    status: (CLAIM_STATUSES as readonly string[]).includes(c.status) ? (c.status as ClaimStatus) : "unverified",
    material_connection: c.material_connection,
    story_claim: c.story_claim,
    establishment_signal: c.establishment_signal,
  };
}

export function ClaimDialog({ offerId, claim, open, onOpenChange }: { offerId: string; claim: OfferClaimRow | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [v, setV] = useState<ClaimInput>(emptyClaimInput());
  const [pending, start] = useTransition();
  useEffect(() => {
    if (open) setV(claim ? claimToInput(claim) : emptyClaimInput());
  }, [open, claim]);

  const ev = v.evidence;
  const setEv = (k: keyof typeof ev, val: string) => setV({ ...v, evidence: { ...ev, [k]: val || null } });
  const showEarnings = v.claim_type === "earnings";
  const showStudy = ["specific_health_benefit", "structure_function", "establishment", "statistic", "track_record"].includes(v.claim_type);

  function submit() {
    if (!v.claim_text.trim()) return toast.error("Write the claim first.");
    start(async () => {
      const r = await saveClaim(offerId, claim?.id ?? null, v);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(claim ? "Claim updated." : "Claim added to the ledger.");
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{claim ? "Edit claim" : "Add a claim"}</DialogTitle>
          <DialogDescription>Precision matches the evidence: record the figure exactly as the source states it, with the endpoint, population and duration measured.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Claim" htmlFor="claim_text" className="sm:col-span-2">
            <TextArea id="claim_text" rows={3} value={v.claim_text} onChange={(t) => setV({ ...v, claim_text: t })} placeholder="Members who finished the six weeks signed an average of 1.8 retainers within 90 days (n = 212, Jan–Jun 2025)." />
          </Field>
          <Field label="Type">
            <Select value={v.claim_type} onValueChange={(t) => setV({ ...v, claim_type: t as ClaimType })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLAIM_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {CLAIM_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Role in the argument">
            <Select value={v.role ?? NONE} onValueChange={(t) => setV({ ...v, role: t === NONE ? null : (t as ClaimRole) })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {CLAIM_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {CLAIM_ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Evidence grade" hint="For a health claim the grade sets the strongest wording allowed (the standard, §8.2). Any other product promises its result at full strength at every grade; a number or a result someone got is said as the evidence states it.">
            <Select value={v.evidence_grade ?? NONE} onValueChange={(t) => setV({ ...v, evidence_grade: t === NONE ? null : (t as EvidenceGradeId) })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not graded</SelectItem>
                {EVIDENCE_GRADES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {EVIDENCE_GRADE_LABELS[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={v.status} onValueChange={(t) => setV({ ...v, status: t as ClaimStatus })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="verified">Verified: evidence on file</SelectItem>
                <SelectItem value="unverified">Unverified: stated, not yet checked</SelectItem>
                <SelectItem value="flagged">Flagged: needs a decision</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Evidence source" htmlFor="source_ref" hint="URL, document name, study citation, or who said it.">
            <TextInput id="source_ref" value={ev.source_ref} onChange={(t) => setEv("source_ref", t)} />
          </Field>
          <Field label="Precision" htmlFor="precision" hint="The exact figure as the evidence states it.">
            <TextInput id="precision" value={v.precision} onChange={(t) => setV({ ...v, precision: t || null })} placeholder="11 mg/dL average, 12 weeks, n = 84" />
          </Field>
          <Field label="Quote" htmlFor="quote" hint="The source's own words." className="sm:col-span-2">
            <TextArea id="quote" rows={2} value={ev.quote} onChange={(t) => setEv("quote", t)} />
          </Field>
          {showStudy && (
            <>
              <Field label="Endpoint" htmlFor="endpoint">
                <TextInput id="endpoint" value={ev.endpoint} onChange={(t) => setEv("endpoint", t)} />
              </Field>
              <Field label="Population" htmlFor="population">
                <TextInput id="population" value={ev.population} onChange={(t) => setEv("population", t)} />
              </Field>
              <Field label="Dose" htmlFor="dose">
                <TextInput id="dose" value={ev.dose} onChange={(t) => setEv("dose", t)} />
              </Field>
              <Field label="Duration" htmlFor="duration">
                <TextInput id="duration" value={ev.duration} onChange={(t) => setEv("duration", t)} />
              </Field>
              <Field label="Effect size" htmlFor="effect_size" className="sm:col-span-2">
                <TextInput id="effect_size" value={ev.effect_size} onChange={(t) => setEv("effect_size", t)} />
              </Field>
            </>
          )}
          {(showEarnings || v.claim_type === "results_testimonial" || v.claim_type === "experience_testimonial") && (
            <Field label="Typical result" htmlFor="typical_result" hint="What most buyers get. Sits beside the claim in copy." className="sm:col-span-2">
              <TextArea id="typical_result" rows={2} value={v.typical_result} onChange={(t) => setV({ ...v, typical_result: t || null })} />
            </Field>
          )}
          <div className="grid gap-2 sm:col-span-2 sm:grid-cols-3">
            <Toggle label="Material connection" hint="Paid, affiliated or employed source." checked={v.material_connection} onChange={(c) => setV({ ...v, material_connection: c })} />
            <Toggle label="Story claim" hint="A narrative event that must have happened." checked={v.story_claim} onChange={(c) => setV({ ...v, story_claim: c })} />
            <Toggle label="Establishment signal" hint="“Proven”, “clinically”, lab-coat imagery." checked={v.establishment_signal} onChange={(c) => setV({ ...v, establishment_signal: c })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {claim ? "Save changes" : "Add claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-md border border-line px-3 py-2">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-ink-muted">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
