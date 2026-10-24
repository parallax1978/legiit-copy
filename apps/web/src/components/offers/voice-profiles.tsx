"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Mic, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createVoiceProfile, deleteVoiceProfile, rerunVoiceProfile, updateVoiceProfile } from "@/lib/actions/offers";
import { cn } from "@/lib/utils";
import { titleCase } from "./constants";
import { Chips, Field, LinesArea, ReadOnlyNote, SectionCard, TextArea, TextInput } from "./fields";
import { formatJsonValue, linesToArray, normalizeExemplars, normalizeRecord, normalizeSamples, normalizeStringList, type VoiceProfileRow, type ExemplarParagraph, type VoiceSample } from "./normalize";

export function VoiceProfiles({ offerId, profiles, editable }: { offerId: string; profiles: VoiceProfileRow[]; editable: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(profiles[0]?.id ?? null);
  const selected = profiles.find((p) => p.id === selectedId) ?? profiles[0] ?? null;

  return (
    <div className="space-y-4">
      <ReadOnlyNote show={!editable} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">Paste three to ten samples of writing in the voice the copy should carry. The app measures the voice (sentence length, fragments, grade level, pronouns, paragraph habits), collects idioms and dead words, and keeps exemplar paragraphs the writer imitates.</p>
        {editable && <CreateVoiceDialog offerId={offerId} onCreated={setSelectedId} />}
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong bg-surface p-10 text-center">
          <Mic className="mx-auto size-6 text-brand" />
          <h3 className="mt-2 text-base font-semibold text-ink">No voice profile yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">Without one, the writer uses the standard&apos;s default parameters. Add samples from your emails, pages or posts to write in your voice.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <ul className="flex gap-2 overflow-x-auto lg:flex-col">
            {profiles.map((p) => (
              <li key={p.id} className="shrink-0 lg:shrink">
                <button type="button" onClick={() => setSelectedId(p.id)} className={cn("w-full rounded-card border px-3 py-2.5 text-left transition-colors", selected?.id === p.id ? "border-brand bg-brand-faint" : "border-line bg-surface hover:border-line-strong")}>
                  <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                  <p className="text-xs text-ink-muted">
                    {p.offer_id ? "This offer" : "Whole workspace"} · {normalizeSamples(p.samples).length} samples
                  </p>
                  {Object.keys(normalizeRecord(p.parameters)).length === 0 && <p className="text-[11px] text-warn">Not analysed yet</p>}
                </button>
              </li>
            ))}
          </ul>
          {selected && <VoiceDetail key={selected.id} offerId={offerId} profile={selected} editable={editable} onDeleted={() => setSelectedId(null)} />}
        </div>
      )}
    </div>
  );
}

function VoiceDetail({ offerId, profile, editable, onDeleted }: { offerId: string; profile: VoiceProfileRow; editable: boolean; onDeleted: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"save" | "rerun" | "delete" | null>(null);
  const [name, setName] = useState(profile.name);
  const [greeting, setGreeting] = useState<string | null>(profile.greeting);
  const [band, setBand] = useState<string | null>(profile.readability_band);
  const [idioms, setIdioms] = useState<string[]>(normalizeStringList(profile.idiom_bank));
  const [dead, setDead] = useState<string[]>(normalizeStringList(profile.dead_words));
  const [exemplars, setExemplars] = useState<ExemplarParagraph[]>(normalizeExemplars(profile.exemplar_paragraphs));
  const [stories, setStories] = useState<string[]>(normalizeStringList(profile.story_inventory));
  const [samples, setSamples] = useState<VoiceSample[]>(normalizeSamples(profile.samples));
  const [dirty, setDirty] = useState(false);
  const params = normalizeRecord(profile.parameters);
  const analysed = Object.keys(params).length > 0;
  const ro = !editable;
  const mark = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDirty(true);
  };

  function save() {
    setMode("save");
    start(async () => {
      const r = await updateVoiceProfile(
        profile.id,
        {
          name,
          greeting: greeting?.trim() ? greeting : null,
          readability_band: band?.trim() ? band : null,
          idiom_bank: linesToArray(idioms.join("\n")),
          dead_words: linesToArray(dead.join("\n")),
          exemplar_paragraphs: exemplars.filter((e) => e.text.trim()),
          story_inventory: linesToArray(stories.join("\n")),
          samples: samples.filter((s) => s.text.trim()),
        },
        offerId,
      );
      setMode(null);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("Voice profile saved.");
        setDirty(false);
        router.refresh();
      }
    });
  }
  function rerun() {
    setMode("rerun");
    start(async () => {
      const r = await rerunVoiceProfile(profile.id, offerId);
      setMode(null);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("Analysis started. Parameters update when it finishes.");
        setTimeout(() => router.refresh(), 5000);
      }
    });
  }
  function remove() {
    if (!confirm(`Delete the voice profile “${profile.name}”? Generations that used it keep their copy.`)) return;
    setMode("delete");
    start(async () => {
      const r = await deleteVoiceProfile(profile.id, offerId);
      setMode(null);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("Voice profile deleted.");
        onDeleted();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title={profile.name}
        description={`${profile.offer_id ? "Attached to this offer" : "Available to every offer in the workspace"} · updated ${new Date(profile.updated_at).toLocaleString()}`}
        actions={
          editable && (
            <>
              <Button size="sm" variant="outline" onClick={rerun} disabled={pending}>
                {mode === "rerun" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} {analysed ? "Re-analyse" : "Analyse"}
              </Button>
              <Button size="sm" onClick={save} disabled={pending || !dirty}>
                {mode === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label="Delete profile" onClick={remove} disabled={pending}>
                <Trash2 className="size-4 text-ink-soft" />
              </Button>
            </>
          )
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name" htmlFor="vp-name">
            <Input id="vp-name" value={name} disabled={ro} onChange={(e) => mark(setName)(e.target.value)} />
          </Field>
          <Field label="Readability band" htmlFor="vp-band" hint="Measured if blank. E.g. “grade 6–8”.">
            <TextInput id="vp-band" value={band} disabled={ro} onChange={mark(setBand)} />
          </Field>
          <Field label="Greeting" htmlFor="vp-greeting" hint="How emails open. “Hey {first_name},” or none." className="md:col-span-2">
            <TextInput id="vp-greeting" value={greeting} disabled={ro} onChange={mark(setGreeting)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Measured parameters" description={analysed ? "What the samples show. The writer is instructed with these numbers, never with adjectives." : "Run the analysis to measure the samples."}>
        {analysed ? (
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(params).map(([k, v]) => (
              <div key={k} className="rounded-md bg-surface-alt px-3 py-2">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">{titleCase(k)}</dt>
                <dd className="mt-0.5 break-words text-sm text-ink">{formatJsonValue(v)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-ink-soft">No measurements yet.</p>
        )}
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Idiom bank" description="Phrases the voice actually uses. One per line.">
          {editable ? <LinesArea value={idioms} onChange={mark(setIdioms)} rows={6} /> : <Chips items={idioms} />}
        </SectionCard>
        <SectionCard title="Dead words" description="Words and phrases this voice never uses. One per line. The tell detector enforces them.">
          {editable ? <LinesArea value={dead} onChange={mark(setDead)} rows={6} /> : <Chips items={dead} />}
        </SectionCard>
      </div>

      <SectionCard
        title="Exemplar paragraphs"
        description="A lead, a proof passage and a close in this voice. Studied by the writer, never reproduced."
        actions={
          editable && (
            <Button size="sm" variant="outline" onClick={() => mark(setExemplars)([...exemplars, { label: `Exemplar ${exemplars.length + 1}`, text: "" }])}>
              <Plus className="size-4" /> Add
            </Button>
          )
        }
      >
        {exemplars.length === 0 ? (
          <p className="text-sm text-ink-soft">None yet. The analysis picks them from the samples; you can add your own.</p>
        ) : (
          <ul className="space-y-3">
            {exemplars.map((e, i) => (
              <li key={i} className="rounded-md border border-line p-3">
                <div className="flex items-center gap-2">
                  {editable ? <Input value={e.label} className="h-8 max-w-xs" onChange={(ev) => mark(setExemplars)(exemplars.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)))} /> : <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{e.label}</p>}
                  {editable && (
                    <Button size="icon-sm" variant="ghost" aria-label="Remove" className="ml-auto" onClick={() => mark(setExemplars)(exemplars.filter((_, j) => j !== i))}>
                      <Trash2 className="size-4 text-ink-soft" />
                    </Button>
                  )}
                </div>
                {editable ? <TextArea className="mt-2" rows={4} value={e.text} onChange={(t) => mark(setExemplars)(exemplars.map((x, j) => (j === i ? { ...x, text: t } : x)))} /> : <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{e.text}</p>}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Story inventory" description="Real events in the speaker's history that copy may tell. One per line, with the date and the numbers.">
        {editable ? (
          <LinesArea value={stories} onChange={mark(setStories)} rows={4} />
        ) : stories.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            {stories.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">None recorded.</p>
        )}
      </SectionCard>

      <SectionCard
        title={`Samples (${samples.length})`}
        description="What the analysis measured. Edit and re-analyse to update the parameters."
        actions={
          editable &&
          samples.length < 10 && (
            <Button size="sm" variant="outline" onClick={() => mark(setSamples)([...samples, { title: null, text: "" }])}>
              <Plus className="size-4" /> Add sample
            </Button>
          )
        }
      >
        <ul className="space-y-3">
          {samples.map((s, i) => (
            <li key={i} className="rounded-md border border-line p-3">
              <div className="flex items-center gap-2">
                {editable ? <Input placeholder={`Sample ${i + 1} title (optional)`} value={s.title ?? ""} className="h-8 max-w-xs" onChange={(ev) => mark(setSamples)(samples.map((x, j) => (j === i ? { ...x, title: ev.target.value || null } : x)))} /> : <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{s.title ?? `Sample ${i + 1}`}</p>}
                <span className="ml-auto text-xs text-ink-soft">{s.text.trim().split(/\s+/).filter(Boolean).length} words</span>
                {editable && (
                  <Button size="icon-sm" variant="ghost" aria-label="Remove sample" onClick={() => mark(setSamples)(samples.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4 text-ink-soft" />
                  </Button>
                )}
              </div>
              {editable ? <Textarea className="mt-2" rows={5} value={s.text} onChange={(ev) => mark(setSamples)(samples.map((x, j) => (j === i ? { ...x, text: ev.target.value } : x)))} /> : <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm text-ink-muted">{s.text}</p>}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

function CreateVoiceDialog({ offerId, onCreated }: { offerId: string; onCreated: (id: string) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"offer" | "workspace">("offer");
  const [samples, setSamples] = useState<VoiceSample[]>([{ title: null, text: "" }, { title: null, text: "" }, { title: null, text: "" }]);
  const [pending, start] = useTransition();
  const filled = samples.filter((s) => s.text.trim()).length;

  function submit() {
    if (!name.trim()) return toast.error("Name the voice.");
    if (filled < 3) return toast.error("Paste at least three samples.");
    start(async () => {
      const r = await createVoiceProfile({ offerId: scope === "offer" ? offerId : null, name, samples: samples.filter((s) => s.text.trim()) }, offerId);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("Voice profile created. Analysis is running.");
        onCreated(r.data.id);
        setOpen(false);
        setName("");
        setSamples([{ title: null, text: "" }, { title: null, text: "" }, { title: null, text: "" }]);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New voice profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New voice profile</DialogTitle>
          <DialogDescription>Three to ten samples, 150 words or more each works best: emails you sent, pages you wrote, posts that sound like you.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="new-vp-name">
            <Input id="new-vp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Founder voice" />
          </Field>
          <Field label="Scope">
            <Select value={scope} onValueChange={(v) => setScope(v as "offer" | "workspace")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="offer">This offer only</SelectItem>
                <SelectItem value="workspace">Whole workspace</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="space-y-3">
          {samples.map((s, i) => (
            <div key={i}>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-ink" htmlFor={`sample-${i}`}>
                  Sample {i + 1}
                </label>
                {samples.length > 3 && (
                  <button type="button" className="text-xs text-ink-soft hover:text-bad" onClick={() => setSamples(samples.filter((_, j) => j !== i))}>
                    remove
                  </button>
                )}
              </div>
              <Textarea id={`sample-${i}`} className="mt-1" rows={4} value={s.text} onChange={(e) => setSamples(samples.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
            </div>
          ))}
          {samples.length < 10 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setSamples([...samples, { title: null, text: "" }])}>
              <Plus className="size-4" /> Another sample
            </Button>
          )}
        </div>
        <DialogFooter>
          <span className="mr-auto self-center text-xs text-ink-muted">
            {filled} of {samples.length} filled
          </span>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || filled < 3 || !name.trim()}>
            {pending && <Loader2 className="size-4 animate-spin" />} Create and analyse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
