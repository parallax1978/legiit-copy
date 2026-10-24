"use client";
import * as React from "react";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { saveExample } from "@/lib/actions/admin";
import { AWARENESS_LEVELS, EXAMPLE_STATUSES, LEAD_TYPES, RIGHTS_STATUSES, SELLING_SITUATIONS, SOPHISTICATION_LEVELS, allowsFullText, type ExampleRow } from "@/lib/data/admin";
import { CountedTextarea, Field, FormMessage, FormSection, NativeSelect, OptionList, SubmitButton } from "./form-bits";
import { JsonTextarea } from "./json-textarea";
import { asStringArray } from "./fmt";

export function ExampleForm({ example, formats }: { example: ExampleRow | null; formats: readonly string[] }) {
  const [state, action] = useActionState(saveExample, {});
  const [rights, setRights] = React.useState(example?.rights_status ?? "unknown");
  const fullTextAllowed = allowsFullText(rights);
  return (
    <form action={action} className="space-y-5">
      {example && <input type="hidden" name="id" value={example.id} />}
      <FormMessage state={state} />

      <FormSection title="Identity" description="What the piece is and where it sits.">
        <Field label="Title" htmlFor="title" className="md:col-span-2">
          <Input id="title" name="title" required defaultValue={example?.title ?? ""} />
        </Field>
        <Field label="Author" htmlFor="author">
          <Input id="author" name="author" defaultValue={example?.author ?? ""} />
        </Field>
        <Field label="Format" htmlFor="format">
          <NativeSelect id="format" name="format" required defaultValue={example?.format ?? ""}>
            <OptionList options={formats} blank="Pick a format" />
          </NativeSelect>
        </Field>
        <Field label="Market" htmlFor="market">
          <Input id="market" name="market" defaultValue={example?.market ?? ""} placeholder="e.g. financial newsletters" />
        </Field>
        <Field label="Funnel position" htmlFor="funnel_position">
          <Input id="funnel_position" name="funnel_position" defaultValue={example?.funnel_position ?? ""} placeholder="front end, upsell, reactivation…" />
        </Field>
        <Field label="Selling situation" htmlFor="selling_situation">
          <NativeSelect id="selling_situation" name="selling_situation" defaultValue={example?.selling_situation ?? ""}>
            <OptionList options={SELLING_SITUATIONS} blank="—" />
          </NativeSelect>
        </Field>
        <Field label="Status" htmlFor="status" hint="Only curated examples reach the prompts.">
          <NativeSelect id="status" name="status" defaultValue={example?.status ?? "draft"}>
            <OptionList options={EXAMPLE_STATUSES} />
          </NativeSelect>
        </Field>
        <div className="flex items-center gap-2 pt-6">
          <Checkbox id="is_loser" name="is_loser" defaultChecked={example?.is_loser ?? false} />
          <label htmlFor="is_loser" className="text-sm text-ink">
            Loser (documented losing variant; excluded from retrieval by default)
          </label>
        </div>
      </FormSection>

      <FormSection title="Argument" description="The decisions the piece made, in the standard's order.">
        <Field label="Awareness" htmlFor="awareness">
          <NativeSelect id="awareness" name="awareness" defaultValue={example?.awareness ?? ""}>
            <OptionList options={AWARENESS_LEVELS} blank="—" />
          </NativeSelect>
        </Field>
        <Field label="Sophistication" htmlFor="sophistication">
          <NativeSelect id="sophistication" name="sophistication" defaultValue={example?.sophistication ?? ""}>
            <OptionList options={SOPHISTICATION_LEVELS} blank="—" />
          </NativeSelect>
        </Field>
        <Field label="Lead type" htmlFor="lead_type">
          <NativeSelect id="lead_type" name="lead_type" defaultValue={example?.lead_type ?? ""}>
            <OptionList options={LEAD_TYPES} blank="—" />
          </NativeSelect>
        </Field>
        <Field label="Mechanism type" htmlFor="mechanism_type">
          <Input id="mechanism_type" name="mechanism_type" defaultValue={example?.mechanism_type ?? ""} placeholder="unique process, hidden cause, missing ingredient…" />
        </Field>
        <Field label="Argument sentence" htmlFor="argument_sentence" className="md:col-span-2" hint='"This sells [product] to [reader] on the promise [one thing] because [mechanism/proof]."'>
          <Textarea id="argument_sentence" name="argument_sentence" defaultValue={example?.argument_sentence ?? ""} className="min-h-16" />
        </Field>
        <Field label="Hook" htmlFor="hook" className="md:col-span-2">
          <Textarea id="hook" name="hook" defaultValue={example?.hook ?? ""} className="min-h-16" />
        </Field>
        <Field label="Proof placement" htmlFor="proof_placement" hint="One item per line (where each proof sits relative to its claim).">
          <Textarea id="proof_placement" name="proof_placement" defaultValue={asStringArray(example?.proof_placement).join("\n")} className="min-h-20" />
        </Field>
        <Field label="Offer devices" htmlFor="offer_devices" hint="One per line: guarantee type, deadline mechanism, bonus structure…">
          <Textarea id="offer_devices" name="offer_devices" defaultValue={asStringArray(example?.offer_devices).join("\n")} className="min-h-20" />
        </Field>
        <Field label="Voice profile" htmlFor="voice_profile">
          <Input id="voice_profile" name="voice_profile" defaultValue={example?.voice_profile ?? ""} />
        </Field>
        <Field label="Documented result" htmlFor="documented_result">
          <Input id="documented_result" name="documented_result" defaultValue={example?.documented_result ?? ""} placeholder="e.g. control for 4 years; beat by 31% in 2019" />
        </Field>
      </FormSection>

      <FormSection title="Rights and text" description="Teaching examples are studied, never reproduced. Store the smallest excerpt that teaches the lesson.">
        <Field label="Rights status" htmlFor="rights_status">
          <NativeSelect id="rights_status" name="rights_status" value={rights} onChange={(e) => setRights(e.target.value)}>
            <OptionList options={RIGHTS_STATUSES} />
          </NativeSelect>
        </Field>
        <Field label="Source URL" htmlFor="source_url">
          <Input id="source_url" name="source_url" type="url" defaultValue={example?.source_url ?? ""} />
        </Field>
        <Field label="Excerpt" htmlFor="excerpt" className="md:col-span-2" hint="At most 400 characters; the database enforces it too.">
          <CountedTextarea id="excerpt" name="excerpt" max={400} defaultValue={example?.excerpt ?? ""} />
        </Field>
        <Field
          label="Full text"
          htmlFor="full_text"
          className="md:col-span-2"
          hint={
            fullTextAllowed
              ? "Allowed: the rights status permits storing the whole piece."
              : "Disabled: full text can be stored only when rights status is public_domain or licensed (constraint examples_full_text_rights). Publicly posted copyrighted work is kept as an excerpt plus annotations."
          }
        >
          <Textarea id="full_text" name="full_text" disabled={!fullTextAllowed} defaultValue={fullTextAllowed ? (example?.full_text ?? "") : ""} className="min-h-40 font-mono text-xs" />
        </Field>
      </FormSection>

      <FormSection title="Teaching notes" description="What the prompts actually read.">
        <Field label="Annotations (JSON object)" htmlFor="annotations" className="md:col-span-2" hint='Structural notes keyed by section, e.g. {"lead": "problem-solution, speaker named in sentence 2", "proof": "study within one sentence of the claim"}'>
          <JsonTextarea id="annotations" name="annotations" kind="object" defaultValue={example?.annotations ?? {}} />
        </Field>
        <Field label="Lessons" htmlFor="lessons" className="md:col-span-2" hint="One lesson per line, written as a rule the drafter can apply.">
          <Textarea id="lessons" name="lessons" defaultValue={asStringArray(example?.lessons).join("\n")} className="min-h-28" />
        </Field>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <SubmitButton>{example ? "Save example" : "Create example"}</SubmitButton>
      </div>
    </form>
  );
}
