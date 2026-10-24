"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveOfferConfig, type ConfigInput } from "@/lib/actions/offers";
import { EDGE_TOLERANCES } from "./constants";
import { Field, ReadOnlyNote, SectionCard, TextArea, TextInput } from "./fields";
import { normalizeHumor, type OfferConfigRow } from "./normalize";

const NONE = "__none__";
const VERTICALS = ["Health & supplements", "Business opportunity", "Financial & trading", "Software / SaaS", "Coaching & courses", "E-commerce", "Agency services", "Local services", "Publishing", "Nonprofit", "Other"];

function toInput(c: OfferConfigRow | null): ConfigInput {
  return {
    vertical: c?.vertical ?? null,
    business_opportunity: c?.business_opportunity ?? false,
    notice_recipient: c?.notice_recipient ?? false,
    humor_policy: normalizeHumor(c?.humor_policy),
    greeting: c?.greeting ?? null,
    edge_tolerance: (EDGE_TOLERANCES as readonly string[]).includes(c?.edge_tolerance ?? "") ? (c!.edge_tolerance as ConfigInput["edge_tolerance"]) : null,
    refund_window_days: c?.refund_window_days ?? null,
    first_week_experience: c?.first_week_experience ?? null,
  };
}

export function OfferSettingsForm({ offerId, config, editable }: { offerId: string; config: OfferConfigRow | null; editable: boolean }) {
  const router = useRouter();
  const [v, setV] = useState<ConfigInput>(() => toInput(config));
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const ro = !editable;
  const patch = (p: Partial<ConfigInput>) => {
    setV((prev) => ({ ...prev, ...p }));
    setDirty(true);
  };

  function save() {
    start(async () => {
      const r = await saveOfferConfig(offerId, v);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("Settings saved.");
        setDirty(false);
        router.refresh();
      }
    });
  }

  const saveButton = editable && (
    <Button size="sm" onClick={save} disabled={pending || !dirty}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save settings
    </Button>
  );

  return (
    <div className="space-y-5">
      <ReadOnlyNote show={ro} />
      <SectionCard title="Vertical and regulation" description="These switch on the screens the factual review runs: disease wording for supplements, the earnings screen for business opportunities, Notice penalties." actions={saveButton}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Vertical" hint="Pick the closest. It sets which claims taxonomy rows get the strictest review.">
            <Select value={v.vertical ?? NONE} disabled={ro} onValueChange={(t) => patch({ vertical: t === NONE ? null : t })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a vertical" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not set</SelectItem>
                {VERTICALS.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
                {v.vertical && !VERTICALS.includes(v.vertical) && <SelectItem value={v.vertical}>{v.vertical}</SelectItem>}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Refund window (days)" htmlFor="refund_days" hint="Drives the guarantee sentence and the trial screen.">
            <Input id="refund_days" type="number" inputMode="numeric" min={0} value={v.refund_window_days ?? ""} disabled={ro} onChange={(e) => patch({ refund_window_days: e.target.value === "" ? null : Number(e.target.value) })} />
          </Field>
          <ToggleRow label="Business opportunity" hint="The offer promises income, savings or a way to make money. Every earnings claim then needs dates, cohort, percentage achieving, time and effort, expenses." checked={v.business_opportunity} disabled={ro} onChange={(c) => patch({ business_opportunity: c })} />
          <ToggleRow label="FTC Notice of Penalty Offenses recipient" hint="Your company received the 2021 Notice on earnings claims. Civil penalties apply to undocumented figures." checked={v.notice_recipient} disabled={ro} onChange={(c) => patch({ notice_recipient: c })} />
        </div>
      </SectionCard>

      <SectionCard title="Voice and edge" description="How far the copy can lean. These are parameters the prompts carry, never adjectives.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Edge tolerance" hint="Low: no provocation. Medium: pointed, never personal. High: the market expects a fight.">
            <Select value={v.edge_tolerance ?? NONE} disabled={ro} onValueChange={(t) => patch({ edge_tolerance: t === NONE ? null : (t as ConfigInput["edge_tolerance"]) })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Default (medium)</SelectItem>
                {EDGE_TOLERANCES.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x[0].toUpperCase() + x.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Greeting" htmlFor="greeting" hint="How emails open for this offer. Leave blank to use the voice profile's.">
            <TextInput id="greeting" value={v.greeting} disabled={ro} onChange={(t) => patch({ greeting: t || null })} placeholder="Hey {first_name}," />
          </Field>
          <ToggleRow label="Humor allowed" hint="Whether the writer may use humor at all in this offer's copy." checked={v.humor_policy.allowed} disabled={ro} onChange={(c) => patch({ humor_policy: { ...v.humor_policy, allowed: c } })} />
          <Field label="Humor notes" htmlFor="humor_notes" hint="Per format if needed: “dry asides in emails, none on the order form”.">
            <TextArea id="humor_notes" rows={2} value={v.humor_policy.notes} disabled={ro} onChange={(t) => patch({ humor_policy: { ...v.humor_policy, notes: t || null } })} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="First week" description="What actually happens after purchase. The copy promises the first visible win from this, not from the hope." actions={saveButton}>
        <Field label="First-week experience" htmlFor="first_week" hint="Delivery, onboarding, the first thing they do, the first result they can see and when.">
          <TextArea id="first_week" rows={4} value={v.first_week_experience} disabled={ro} onChange={(t) => patch({ first_week_experience: t || null })} />
        </Field>
      </SectionCard>
    </div>
  );
}

function ToggleRow({ label, hint, checked, disabled, onChange }: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (c: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-line px-3 py-2.5">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-ink-muted">{hint}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  );
}
