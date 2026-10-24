"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveCritique } from "@/lib/actions/admin";
import { EXAMPLE_STATUSES } from "@/lib/constants";
import type { CritiqueRow } from "@/lib/data/admin";
import { Field, FormMessage, FormSection, NativeSelect, OptionList, SubmitButton } from "./form-bits";
import { JsonTextarea } from "./json-textarea";
import { asStringArray } from "./fmt";

const CONFIDENCE = ["high", "medium", "low", "unknown"] as const;
const QUOTE_STATUS = ["verbatim", "paraphrase", "reconstructed", "unknown"] as const;
const EVIDENCE = ["split_test", "documented_result", "expert_critique", "principle_only", "unknown"] as const;

export function CritiqueForm({ critique, formats }: { critique: CritiqueRow | null; formats: readonly string[] }) {
  const [state, action] = useActionState(saveCritique, {});
  return (
    <form action={action} className="space-y-5">
      {critique && <input type="hidden" name="id" value={critique.id} />}
      <FormMessage state={state} />

      <FormSection title="Before and after" description="The weak draft, the chief's revision, and the defect they named.">
        <Field label="Before (weak draft)" htmlFor="weak_draft">
          <Textarea id="weak_draft" name="weak_draft" required defaultValue={critique?.weak_draft ?? ""} className="min-h-40" />
        </Field>
        <Field label="After (strong revision)" htmlFor="strong_revision">
          <Textarea id="strong_revision" name="strong_revision" required defaultValue={critique?.strong_revision ?? ""} className="min-h-40" />
        </Field>
        <Field label="Defect (code)" htmlFor="defect" hint="Short code, e.g. NOT_CUSTOMER_LANGUAGE_GENERIC">
          <Input id="defect" name="defect" defaultValue={critique?.defect ?? ""} />
        </Field>
        <Field label="Defect as the chief named it" htmlFor="defect_named">
          <Input id="defect_named" name="defect_named" defaultValue={critique?.defect_named ?? ""} />
        </Field>
        <Field label="Principle" htmlFor="principle" className="md:col-span-2">
          <Textarea id="principle" name="principle" defaultValue={critique?.principle ?? ""} className="min-h-16" />
        </Field>
        <Field label="Reason (the chief's reasoning)" htmlFor="reason" className="md:col-span-2">
          <Textarea id="reason" name="reason" defaultValue={critique?.reason ?? ""} className="min-h-16" />
        </Field>
        <Field label="Brief / context" htmlFor="brief" className="md:col-span-2">
          <Textarea id="brief" name="brief" defaultValue={critique?.brief ?? ""} className="min-h-16" />
        </Field>
      </FormSection>

      <FormSection title="Provenance" description="Who said it, where, and how sure we are.">
        <Field label="Chief" htmlFor="chief">
          <Input id="chief" name="chief" defaultValue={critique?.chief ?? ""} />
        </Field>
        <Field label="Format" htmlFor="format" hint="Free text is accepted; prefer a format id so retrieval can filter.">
          <Input id="format" name="format" defaultValue={critique?.format ?? ""} list="critique-formats" />
          <datalist id="critique-formats">
            {formats.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </Field>
        <Field label="Source" htmlFor="source">
          <Input id="source" name="source" defaultValue={critique?.source ?? ""} />
        </Field>
        <Field label="Source URL" htmlFor="source_url">
          <Input id="source_url" name="source_url" type="url" defaultValue={critique?.source_url ?? ""} />
        </Field>
        <Field label="External id" htmlFor="external_id" hint="Dedupe key for imports (e.g. P01).">
          <Input id="external_id" name="external_id" defaultValue={critique?.external_id ?? ""} />
        </Field>
        <Field label="Quote status" htmlFor="quote_status">
          <NativeSelect id="quote_status" name="quote_status" defaultValue={critique?.quote_status ?? ""}>
            <OptionList options={QUOTE_STATUS} blank="—" />
          </NativeSelect>
        </Field>
        <Field label="Evidence" htmlFor="evidence">
          <NativeSelect id="evidence" name="evidence" defaultValue={critique?.evidence ?? ""}>
            <OptionList options={EVIDENCE} blank="—" />
          </NativeSelect>
        </Field>
        <Field label="Confidence" htmlFor="confidence">
          <NativeSelect id="confidence" name="confidence" defaultValue={critique?.confidence ?? ""}>
            <OptionList options={CONFIDENCE} blank="—" />
          </NativeSelect>
        </Field>
        <Field label="Tested (JSON)" htmlFor="tested" className="md:col-span-2" hint='e.g. {"status": "split_test", "result": "+23.6% open rate"}'>
          <JsonTextarea id="tested" name="tested" kind="any" defaultValue={critique?.tested ?? ""} className="min-h-20" />
        </Field>
      </FormSection>

      <FormSection title="Classification" description="Which AI failure this teaches against, and how it is filed.">
        <Field label="AI failure map" htmlFor="ai_failure_map" hint="One thesis id per line, e.g. thesis_1_wrong_central_argument">
          <Textarea id="ai_failure_map" name="ai_failure_map" defaultValue={asStringArray(critique?.ai_failure_map).join("\n")} className="min-h-20" />
        </Field>
        <Field label="Tags" htmlFor="tags" hint="One per line.">
          <Textarea id="tags" name="tags" defaultValue={asStringArray(critique?.tags).join("\n")} className="min-h-20" />
        </Field>
        <Field label="Status" htmlFor="status" hint="Only curated critiques reach the prompts.">
          <NativeSelect id="status" name="status" defaultValue={critique?.status ?? "curated"}>
            <OptionList options={EXAMPLE_STATUSES} />
          </NativeSelect>
        </Field>
      </FormSection>

      <div className="flex justify-end">
        <SubmitButton>{critique ? "Save critique" : "Create critique"}</SubmitButton>
      </div>
    </form>
  );
}
