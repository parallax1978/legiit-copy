"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveSetup } from "@/lib/actions/offers";
import { SectionCard, ReadOnlyNote } from "./fields";
import { SetupFields, setupFromJson, type SetupValues } from "./setup-fields";

export function SetupForm({ offerId, setup, editable, extracted }: { offerId: string; setup: unknown; editable: boolean; extracted: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState<SetupValues>(() => setupFromJson(setup));
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const answered = Object.values(value).filter((v) => v.trim()).length;

  function save(reextract: boolean) {
    start(async () => {
      const r = await saveSetup(offerId, value, reextract);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setDirty(false);
      toast.success(reextract ? "Saved. Reading the sources again with your answers." : "Saved. They apply to the next piece you write.");
      router.refresh();
    });
  }

  return (
    <SectionCard
      title="Before we write"
      description={`What only you know. ${answered === 0 ? "Blank answers become questions the app has to ask later." : `${answered} of 6 answered.`}`}
      actions={editable ? (
        <div className="flex items-center gap-2">
          {extracted && (
            <Button size="sm" variant="outline" disabled={pending || !dirty} onClick={() => save(true)} title="Save and read the sources again so the brief and ledger use these answers">
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save and re-read sources
            </Button>
          )}
          <Button size="sm" disabled={pending || !dirty} onClick={() => save(false)}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </Button>
        </div>
      ) : undefined}
    >
      <ReadOnlyNote show={!editable} />
      <SetupFields value={value} onChange={(v) => { setValue(v); setDirty(true); }} disabled={!editable || pending} />
    </SectionCard>
  );
}
