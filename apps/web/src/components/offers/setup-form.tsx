"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveSetup } from "@/lib/actions/offers";
import { SectionCard, ReadOnlyNote } from "./fields";
import { SetupFields, setupFromJson, type SetupValues } from "./setup-fields";

/** How long after the last keystroke the answers save on their own. */
export const AUTOSAVE_MS = 1200;
const FIELD_COUNT = 8;

/**
 * What only the client knows. The answers save on their own (a pause after typing, or leaving a field), so nothing is
 * lost when the user clicks Write copy or another tab without pressing Save; the page refreshing underneath (a status
 * change, a source finishing) never replaces what is being typed: the stored answers are taken only while nothing is
 * unsaved. Save and re-read sources stays a button, because reading the sources again costs a model call.
 */
export function SetupForm({ offerId, setup, editable, extracted }: { offerId: string; setup: unknown; editable: boolean; extracted: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState<SetupValues>(() => setupFromJson(setup));
  const [dirty, setDirty] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [pending, start] = useTransition();
  const latest = useRef(value);
  latest.current = value;
  const stored = JSON.stringify(setupFromJson(setup));
  const answered = Object.values(value).filter((v) => v.trim()).length;

  // the stored answers replace the form only while nothing typed is unsaved
  useEffect(() => {
    if (!dirty) setValue(JSON.parse(stored) as SetupValues);
  }, [stored, dirty]);

  async function persist(snapshot: SetupValues, reextract: boolean): Promise<boolean> {
    setState("saving");
    const r = await saveSetup(offerId, snapshot, reextract);
    if (!r.ok) {
      setState("failed");
      toast.error(r.error);
      return false;
    }
    // typing went on while the save was in flight: those keystrokes are still unsaved
    if (JSON.stringify(latest.current) === JSON.stringify(snapshot)) setDirty(false);
    setState("saved");
    return true;
  }

  // autosave: a pause after the last change
  useEffect(() => {
    if (!dirty || !editable) return;
    const t = setTimeout(() => void persist(latest.current, false), AUTOSAVE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, dirty, editable]);

  function saveNow(reextract: boolean) {
    start(async () => {
      const ok = await persist(latest.current, reextract);
      if (!ok) return;
      toast.success(reextract ? "Saved. Reading the sources again with your answers." : "Saved. They apply to the next piece you write.");
      router.refresh();
    });
  }

  const status = state === "saving" ? "Saving…" : state === "failed" ? "Not saved. Try again." : dirty ? "Unsaved" : state === "saved" ? "Saved" : "";

  return (
    <SectionCard
      title="Before we write"
      description={`What only you know. ${answered === 0 ? "Blank answers become questions the app has to ask later." : `${answered} of ${FIELD_COUNT} answered.`} Answers save as you type.`}
      actions={editable ? (
        <div className="flex items-center gap-2">
          {status && <span className={`text-xs ${state === "failed" ? "text-destructive" : "text-muted-foreground"}`} aria-live="polite">{status}</span>}
          {extracted && (
            <Button size="sm" variant="outline" disabled={pending || state === "saving"} onClick={() => saveNow(true)} title="Save and read the sources again so the brief and ledger use these answers">
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save and re-read sources
            </Button>
          )}
          <Button size="sm" disabled={pending || state === "saving" || !dirty} onClick={() => saveNow(false)}>
            {pending || state === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </Button>
        </div>
      ) : undefined}
    >
      <ReadOnlyNote show={!editable} />
      <div onBlur={() => { if (dirty && editable) void persist(latest.current, false); }}>
        <SetupFields value={value} onChange={(v) => { setValue(v); setDirty(true); setState("idle"); }} disabled={!editable} />
      </div>
    </SectionCard>
  );
}
