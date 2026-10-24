"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createEvalRun } from "@/lib/actions/admin";
import { Field, FormMessage, FormSection, SubmitButton } from "./form-bits";
import { JsonTextarea } from "./json-textarea";

export function EvalRunForm({
  formats,
  modelSetDefault,
  activeVersions,
}: {
  formats: { id: string; hasSpec: boolean }[];
  modelSetDefault: Record<string, string>;
  activeVersions: { step: string; version: number; id: string }[];
}) {
  const [state, action] = useActionState(createEvalRun, {});
  return (
    <form action={action} className="space-y-5">
      <FormMessage state={state} />
      <FormSection title="New eval run" description="Runs every brief through the pipeline for the chosen formats with the prompt versions active right now.">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" required placeholder="e.g. draft v3 + editorial v2" />
        </Field>
        <div className="flex items-center gap-2 pt-6">
          <Checkbox id="baseline" name="baseline" />
          <label htmlFor="baseline" className="text-sm text-ink">
            Baseline run (single-prompt generator, for the blind comparison)
          </label>
        </div>
        <Field label="Formats" htmlFor="formats" className="md:col-span-2" hint="Formats without a spec file are listed but the engine will skip them.">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
            {formats.map((f) => (
              <label key={f.id} className="flex items-center gap-2 rounded-md border border-line px-2 py-1.5 text-xs">
                <Checkbox name="formats" value={f.id} defaultChecked={f.hasSpec} disabled={!f.hasSpec} />
                <span className={f.hasSpec ? "text-ink" : "text-ink-soft"}>{f.id}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="Model set (JSON object)" htmlFor="model_set" hint="Model per step. Stored on the run as model_set together with the chosen formats.">
          <JsonTextarea id="model_set" name="model_set" kind="object" defaultValue={modelSetDefault} className="min-h-56" />
        </Field>
        <Field label="Prompt version snapshot" hint="Captured at creation from the active versions; steps without an active version use the file prompt.">
          <div className="rounded-md border border-line bg-surface-sunken p-3 font-mono text-xs">
            {activeVersions.length === 0 && <p className="text-ink-soft">No active prompt versions; every step uses its file prompt.</p>}
            {activeVersions.map((v) => (
              <div key={v.id} className="flex justify-between gap-2">
                <span>{v.step}</span>
                <span className="text-ink-muted">v{v.version}</span>
              </div>
            ))}
          </div>
        </Field>
      </FormSection>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Creating…">Create run</SubmitButton>
      </div>
    </form>
  );
}
