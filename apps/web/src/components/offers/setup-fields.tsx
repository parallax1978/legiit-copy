"use client";
import { Field, TextInput, TextArea } from "./fields";

/** What only the client knows. Asked at offer setup, kept on the offer, never asked again. Every placeholder is a labelled example from another trade, so gray example text is never mistaken for a saved answer. */
export interface SetupValues {
  product_sentence: string;
  leave_out: string;
  speaker_name: string;
  speaker_role: string;
  reader: string;
  lead_offer: string;
  refund_policy: string;
  proof_on_hand: string;
}

export const EMPTY_SETUP: SetupValues = { product_sentence: "", leave_out: "", speaker_name: "", speaker_role: "", reader: "", lead_offer: "", refund_policy: "", proof_on_hand: "" };

export function setupFromJson(raw: unknown): SetupValues {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const s = (k: keyof SetupValues) => (typeof o[k] === "string" ? (o[k] as string) : "");
  return { product_sentence: s("product_sentence"), leave_out: s("leave_out"), speaker_name: s("speaker_name"), speaker_role: s("speaker_role"), reader: s("reader"), lead_offer: s("lead_offer"), refund_policy: s("refund_policy"), proof_on_hand: s("proof_on_hand") };
}

export function SetupFields({ value, onChange, disabled }: { value: SetupValues; onChange: (v: SetupValues) => void; disabled?: boolean }) {
  const set = (k: keyof SetupValues) => (v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="What is it, and what does it do for the buyer?" htmlFor="setup-product" hint="One sentence, the way you would tell a customer. Your words win over anything on your site. Include everything it makes for them." className="md:col-span-2">
        <TextInput id="setup-product" value={value.product_sentence} onChange={set("product_sentence")} placeholder="Example: a booking page for dog groomers that answers the phone and takes the deposit" disabled={disabled} />
      </Field>
      <Field label="Anything on your site that is not the product?" htmlFor="setup-leave-out" hint="Sample output, example reports, old features, a thing to leave out. The copy never treats these as what the product does." className="md:col-span-2">
        <TextInput id="setup-leave-out" value={value.leave_out} onChange={set("leave_out")} placeholder="Example: the sample report on the homepage is one customer's run, not a feature" disabled={disabled} />
      </Field>
      <Field label="Who signs the copy?" htmlFor="setup-speaker" hint="The person the reader hears from. Emails and posts carry this name.">
        <TextInput id="setup-speaker" value={value.speaker_name} onChange={set("speaker_name")} placeholder="Example: Dana Reyes" disabled={disabled} />
      </Field>
      <Field label="Their role" htmlFor="setup-role" hint="As it should appear after the name.">
        <TextInput id="setup-role" value={value.speaker_role} onChange={set("speaker_role")} placeholder="Example: Owner, Clipboard" disabled={disabled} />
      </Field>
      <Field label="Who is the reader?" htmlFor="setup-reader" hint="The one person this is written to, by situation. Leave blank to let the research decide." className="md:col-span-2">
        <TextInput id="setup-reader" value={value.reader} onChange={set("reader")} placeholder="Example: groomers with one shop who miss calls with their hands in the tub" disabled={disabled} />
      </Field>
      <Field label="Which offer should the copy lead with?" htmlFor="setup-lead" hint="When there are several plans or deals, name the one every piece states. Blank means the one your page leads with." className="md:col-span-2">
        <TextInput id="setup-lead" value={value.lead_offer} onChange={set("lead_offer")} placeholder="Example: the $9 first month, then $39 a month" disabled={disabled} />
      </Field>
      <Field label="Refund or guarantee" htmlFor="setup-refund" hint="Only if it is not already on your site. The copy never promises one you do not offer." className="md:col-span-2">
        <TextInput id="setup-refund" value={value.refund_policy} onChange={set("refund_policy")} placeholder="Example: none. Or: 30-day money back on the first month" disabled={disabled} />
      </Field>
      <Field label="Proof you can show" htmlFor="setup-proof" hint="Real customer results, testimonials with names, numbers you can stand behind. The copy cites only these and never invents one. None yet is fine: the copy still promises the result your product produces, carried by how it works and what the reader can try for themselves." className="md:col-span-2">
        <TextArea id="setup-proof" rows={3} value={value.proof_on_hand} onChange={set("proof_on_hand")} placeholder="Example: Jane Doe of Acme booked 41 jobs in April (screenshot on file). 1,200 paying users. Or: none yet." disabled={disabled} />
      </Field>
    </div>
  );
}
