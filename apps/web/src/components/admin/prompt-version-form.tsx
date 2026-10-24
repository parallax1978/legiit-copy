"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { createPromptVersion } from "@/lib/actions/admin";
import { EFFORTS } from "@/lib/constants";
import { Field, FormMessage, NativeSelect, OptionList, SubmitButton } from "./form-bits";

export function PromptVersionForm({
  steps,
  step,
  nextVersion,
  defaults,
}: {
  steps: readonly string[];
  step: string;
  nextVersion: number;
  defaults: { template: string; model: string; effort: string; max_tokens: number };
}) {
  const [state, action] = useActionState(createPromptVersion, {});
  return (
    <form action={action} className="space-y-4 rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">New version</h3>
          <p className="text-xs text-ink-muted">
            Will be saved as <span className="font-mono">{step} v{nextVersion}</span>. Versions are immutable once created; to change a prompt, create the next version.
          </p>
        </div>
      </div>
      <FormMessage state={state} />
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Step" htmlFor="step">
          <NativeSelect id="step" name="step" defaultValue={step}>
            <OptionList options={steps} />
          </NativeSelect>
        </Field>
        <Field label="Model" htmlFor="model">
          <Input id="model" name="model" defaultValue={defaults.model} required />
        </Field>
        <Field label="Effort" htmlFor="effort">
          <NativeSelect id="effort" name="effort" defaultValue={defaults.effort}>
            <OptionList options={EFFORTS} />
          </NativeSelect>
        </Field>
        <Field label="Max tokens" htmlFor="max_tokens" hint="Cap 12,000 per call.">
          <Input id="max_tokens" name="max_tokens" type="number" min={1} max={12000} defaultValue={defaults.max_tokens} required />
        </Field>
      </div>
      <Field label="Template (system prompt)" htmlFor="template" hint="Replaces the step's file system prompt when active. Must be self-contained: parameters and exemplar paragraphs, never tone adjectives, no template variables.">
        <Textarea id="template" name="template" required defaultValue={defaults.template} className="min-h-72 font-mono text-xs" spellCheck={false} />
      </Field>
      <Field label="Notes" htmlFor="notes" hint="What changed and why; which eval run motivated it.">
        <Textarea id="notes" name="notes" className="min-h-16" />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Checkbox id="activate" name="activate" />
          <label htmlFor="activate" className="text-sm text-ink">
            Activate immediately (deactivates the current version of this step)
          </label>
        </div>
        <SubmitButton pendingLabel="Creating…">Create version</SubmitButton>
      </div>
    </form>
  );
}
