"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveEvalBrief } from "@/lib/actions/admin";
import type { EvalBriefRow } from "@/lib/data/admin";
import { Field, FormMessage, FormSection, SubmitButton } from "./form-bits";
import { JsonTextarea } from "./json-textarea";
import { asStringArray } from "./fmt";

export function EvalBriefForm({ brief, formats }: { brief: EvalBriefRow | null; formats: readonly string[] }) {
  const [state, action] = useActionState(saveEvalBrief, {});
  return (
    <form action={action} className="space-y-5">
      {brief && <input type="hidden" name="id" value={brief.id} />}
      <FormMessage state={state} />
      <FormSection title="Brief" description="An offer the teaching library has never seen. The run generates every listed format for it.">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" required defaultValue={brief?.name ?? ""} />
        </Field>
        <Field label="External id" htmlFor="external_id" hint="Dedupe key for imports.">
          <Input id="external_id" name="external_id" defaultValue={brief?.external_id ?? ""} />
        </Field>
        <Field label="Market" htmlFor="market">
          <Input id="market" name="market" defaultValue={brief?.market ?? ""} />
        </Field>
        <Field label="Formats" htmlFor="formats" hint={`One format id per line. Known: ${formats.join(", ")}`}>
          <Textarea id="formats" name="formats" defaultValue={asStringArray(brief?.formats).join("\n")} className="min-h-20 font-mono text-xs" />
        </Field>
        <Field label="Brief (JSON object)" htmlFor="brief" className="md:col-span-2" hint="The offer brief in the same shape offers.brief uses: product, audience, price, guarantee, claims with evidence, voice.">
          <JsonTextarea id="brief" name="brief" kind="object" defaultValue={brief?.brief ?? {}} className="min-h-72" />
        </Field>
        <Field label="Notes" htmlFor="notes" className="md:col-span-2">
          <Textarea id="notes" name="notes" defaultValue={brief?.notes ?? ""} className="min-h-16" />
        </Field>
      </FormSection>
      <div className="flex justify-end">
        <SubmitButton>{brief ? "Save brief" : "Create brief"}</SubmitButton>
      </div>
    </form>
  );
}
