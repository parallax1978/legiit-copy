"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCardsByFamily, SEQUENCE_TYPES, LENGTH_OPTIONS, isFormatId, type FormatCard, type FormatId } from "@/lib/formats";
import { type OfferOption, type GenerationInputValues } from "@/lib/data/generations";
import type { CreateGenerationInput } from "@/lib/actions/generations";
import { createGeneration } from "@/lib/actions/generations";

interface Props {
  offers: OfferOption[];
  voiceProfiles: { id: string; name: string; offer_id: string | null }[];
  initialOfferId: string | null;
  initialFormat: string | null;
  /** Settings of a previous piece to start from (Write another). */
  initial?: GenerationInputValues | null;
}

const STEPS = ["Offer and format", "Purpose and options", "Confirm"];

export function NewGenerationWizard({ offers, voiceProfiles, initialOfferId, initialFormat, initial = null }: Props) {
  const [step, setStep] = useState(initial && initialOfferId && initialFormat ? 1 : 0);
  const [offerId, setOfferId] = useState<string | null>(initialOfferId && offers.some((o) => o.id === initialOfferId) ? initialOfferId : offers.length === 1 ? offers[0].id : null);
  const [format, setFormat] = useState<FormatId | null>(initialFormat && isFormatId(initialFormat) ? initialFormat : null);
  const [purpose, setPurpose] = useState(initial?.purpose ?? "");
  const [length, setLength] = useState<"shorter" | "standard" | "longer">(initial?.length ?? "standard");
  const [cta, setCta] = useState(initial?.cta ?? "");
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [sequenceType, setSequenceType] = useState(initial?.sequence_type || "launch");
  const [voiceProfileId, setVoiceProfileId] = useState<string>(initial?.voice_profile_id ?? "none");
  const [controlText, setControlText] = useState(initial?.control_text ?? "");
  const [skipOffer, setSkipOffer] = useState(!!initial?.skip_offer);
  const [pending, start] = useTransition();

  const groups = useMemo(() => formatCardsByFamily(), []);
  const offer = offers.find((o) => o.id === offerId) ?? null;
  const card: FormatCard | null = useMemo(() => (format ? groups.flatMap((g) => g.formats).find((f) => f.id === format) ?? null : null), [format, groups]);
  const voices = voiceProfiles.filter((v) => !v.offer_id || v.offer_id === offerId);

  const canNext = step === 0 ? !!offerId && !!card?.available : true;
  const includesResearch = !!offer && !offer.hasResearch;
  const includesOffer = !!offer && !offer.hasApprovedOffer && !skipOffer;

  const submit = () => {
    if (!offerId || !format) return;
    const input: CreateGenerationInput = {
      offer_id: offerId,
      format,
      purpose,
      length,
      cta,
      deadline,
      instructions,
      sequence_type: format === "email_sequence" ? sequenceType : "",
      control_text: controlText,
      skip_offer: skipOffer,
      voice_profile_id: voiceProfileId === "none" ? null : voiceProfileId,
    };
    start(async () => {
      const res = await createGeneration(input);
      if (res && !res.ok) toast.error(res.error);
    });
  };

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold", i < step ? "bg-good text-white" : i === step ? "bg-brand text-white" : "bg-surface-sunken text-ink-muted")}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
            <span className={cn(i === step ? "font-medium text-ink" : "text-ink-muted")}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 hidden h-px w-8 bg-line sm:block" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-6">
          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <Label className="text-sm font-semibold text-ink">Offer</Label>
            <p className="mb-3 mt-1 text-xs text-ink-muted">The copy is written from this offer&apos;s ledger, research and offer construction.</p>
            {offers.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No offers yet. <Link href="/app/offers" className="text-brand-strong underline">Create one first.</Link>
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {offers.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setOfferId(o.id)}
                    className={cn("rounded-lg border p-3 text-left transition-colors", offerId === o.id ? "border-brand bg-brand-faint" : "border-line hover:border-line-strong hover:bg-surface-alt")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-ink">{o.name}</span>
                      {offerId === o.id && <Check className="h-4 w-4 shrink-0 text-brand-strong" />}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-ink-muted">
                      <span className={cn("rounded-full px-1.5 py-0.5", o.hasResearch ? "bg-good-soft text-good" : "bg-surface-sunken")}>{o.hasResearch ? "Research ready" : "Research will run"}</span>
                      <span className={cn("rounded-full px-1.5 py-0.5", o.hasApprovedOffer ? "bg-good-soft text-good" : "bg-surface-sunken")}>{o.hasApprovedOffer ? "Offer approved" : "Offer not yet constructed"}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-5">
            <div>
              <Label className="text-sm font-semibold text-ink">Format</Label>
              <p className="mt-1 text-xs text-ink-muted">Each format has its own spec: sections, length band and the gates the reviewer checks.</p>
            </div>
            {groups.map((g) => (
              <div key={g.family}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{g.label}</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {g.formats.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      disabled={!f.available}
                      onClick={() => setFormat(f.id)}
                      className={cn(
                        "flex h-full flex-col rounded-lg border p-3 text-left transition-colors",
                        !f.available && "cursor-not-allowed opacity-60",
                        format === f.id ? "border-brand bg-brand-faint" : "border-line bg-surface hover:border-line-strong hover:bg-surface-alt",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-ink">{f.name}</span>
                        {f.available ? format === f.id && <Check className="h-4 w-4 shrink-0 text-brand-strong" /> : <span className="shrink-0 rounded-full bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">Spec coming</span>}
                      </div>
                      <p className="mt-1 flex-1 text-xs text-ink-muted">{f.description}</p>
                      {f.length_band_words && (
                        <p className="mt-2 text-[11px] text-ink-soft">
                          {f.length_band_words[0].toLocaleString()}–{f.length_band_words[1].toLocaleString()} words
                          {f.multi_item ? ` · ${f.multi_item.min}–${f.multi_item.max} ${f.multi_item.item_name}s` : ""}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      {step === 1 && card && (
        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <section className="space-y-5 rounded-card border border-line bg-surface p-5 shadow-card">
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Textarea id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} placeholder="What this piece has to do, for whom, where it runs. Example: launch email to the warm list, three days before cart close." />
              <p className="text-xs text-ink-muted">Plain words. The engine turns this into a job for each section.</p>
            </div>
            {format === "email_sequence" && (
              <div className="space-y-2">
                <Label>Sequence type</Label>
                <Select value={sequenceType} onValueChange={setSequenceType}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEQUENCE_TYPES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="font-medium">{s.label}</span> <span className="text-ink-muted">· {s.description}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cta">Call to action</Label>
                <Input id="cta" value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Start the 14-day trial" />
                <p className="text-xs text-ink-muted">The literal action and where it leads.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input id="deadline" value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="Friday 11:59pm ET, price rises after" />
                <p className="text-xs text-ink-muted">Only a real one, with its mechanism. Leave blank for none.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Length</Label>
                <Select value={length} onValueChange={(v) => setLength(v as typeof length)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LENGTH_OPTIONS.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {card.length_band_words && <p className="text-xs text-ink-muted">Spec band: {card.length_band_words[0].toLocaleString()}–{card.length_band_words[1].toLocaleString()} words.</p>}
              </div>
              <div className="space-y-2">
                <Label>Voice profile</Label>
                <Select value={voiceProfileId} onValueChange={setVoiceProfileId}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default voice (from the offer)</SelectItem>
                    {voices.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">One-off instructions</Label>
              <Textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} placeholder="Anything specific to this piece: mention the webinar replay closes Sunday; do not reference the old price." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="control">Your current copy (optional)</Label>
              <Textarea id="control" value={controlText} onChange={(e) => setControlText(e.target.value)} rows={5} placeholder="Paste the email or page you use today for this job." className="font-mono text-xs" />
              <p className="text-xs text-ink-muted">If you paste it, the copy chief says whether the new piece is likely to beat it. Leave it empty and you get the verdict on the piece alone.</p>
            </div>
            <label className={cn("flex items-start gap-3 rounded-lg border border-line p-3", offer?.hasApprovedOffer && "opacity-60")}>
              <Checkbox checked={skipOffer || !!offer?.hasApprovedOffer} disabled={!!offer?.hasApprovedOffer} onCheckedChange={(v) => setSkipOffer(v === true)} className="mt-0.5" />
              <span className="text-sm">
                <span className="font-medium text-ink">Skip offer construction, use the offer as written</span>
                <span className="block text-xs text-ink-muted">{offer?.hasApprovedOffer ? "This offer already has an approved construction; it will be used." : "Otherwise the engine proposes an offer construction (guarantee, deadline, premiums) and pauses for your approval before drafting."}</span>
              </span>
            </label>
          </section>
          <aside className="space-y-3 text-sm">
            <div className="rounded-card border border-line bg-surface p-4 shadow-card">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Format</div>
              <div className="mt-1 font-medium text-ink">{card.name}</div>
              <p className="mt-1 text-xs text-ink-muted">{card.description}</p>
              {card.spec && (
                <ul className="mt-3 space-y-1 text-xs text-ink-muted">
                  {card.spec.sections.map((s) => (
                    <li key={s.id} className="flex gap-2">
                      <span className="text-ink-soft">·</span>
                      <span><span className="text-ink">{s.name}</span>{s.optional ? " (optional)" : ""}: {s.job}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}

      {step === 2 && card && offer && (
        <div className="grid gap-5">
          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="text-base font-semibold text-ink">Ready to write</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Row label="Offer" value={offer.name} />
              <Row label="Format" value={card.name} />
              <Row label="Purpose" value={purpose || "Not given"} />
              {format === "email_sequence" && <Row label="Sequence" value={SEQUENCE_TYPES.find((s) => s.id === sequenceType)?.label ?? sequenceType} />}
              <Row label="Call to action" value={cta || "Engine decides from the offer"} />
              <Row label="Deadline" value={deadline || "None"} />
              <Row label="Length" value={LENGTH_OPTIONS.find((l) => l.id === length)?.label ?? length} />
              <Row label="Voice" value={voiceProfileId === "none" ? "Default" : voices.find((v) => v.id === voiceProfileId)?.name ?? "Selected profile"} />
              <Row label="Your current copy" value={controlText ? `${controlText.trim().split(/\s+/).length} words pasted` : "None"} />
              <Row label="Offer construction" value={offer.hasApprovedOffer ? "Approved construction reused" : skipOffer ? "Skipped, offer used as written" : "Proposed, then paused for approval"} />
            </dl>
            <div className="mt-5 rounded-lg bg-surface-alt p-4 text-sm">
              <div className="font-medium text-ink">What happens next</div>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-muted">
                {includesResearch && <li>Research the market, competitors and proof. This runs once per offer and is reused by every later piece.</li>}
                {includesOffer && <li>Propose the offer construction and pause for your approval on the offer page.</li>}
                <li>Pick the argument: twenty candidates, gates, rubric, one winner.</li>
                <li>Draft inside the claims ledger, cold read on a second model, editorial and factual reviews, revise.</li>
                <li>Finish with the copy chief&apos;s verdict and a short list of what to check before you use it.</li>
              </ol>
            </div>
          </section>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < 2 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="rounded-full">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={pending || !offerId || !format} className="rounded-full shadow-glow">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Write it
          </Button>
        )}
      </div>
      {!canNext && step === 0 && offerId && card && !card.available && (
        <p className="flex items-center gap-1.5 text-xs text-ink-muted"><Lock className="h-3 w-3" /> That format&apos;s spec has not landed yet. Pick another.</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}
