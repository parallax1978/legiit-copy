"use client";
import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addExampleSection, deleteExampleSection } from "@/lib/actions/admin";
import { SECTION_TYPES } from "@/lib/constants";
import type { ExampleSectionRow } from "@/lib/data/admin";
import { ActionButton } from "./action-button";
import { CountedTextarea, Field, FormMessage, NativeSelect, OptionList, SubmitButton } from "./form-bits";
import { TableCard } from "./stat-tile";

export function SectionEditor({ exampleId, sections, fullTextAllowed }: { exampleId: string; sections: ExampleSectionRow[]; fullTextAllowed: boolean }) {
  const [state, action] = useActionState(addExampleSection, {});
  return (
    <div className="space-y-4">
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Section</TableHead>
              <TableHead>Annotation</TableHead>
              <TableHead>Excerpt</TableHead>
              <TableHead className="w-20">Embedded</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-ink-soft">
                  No sections yet. Add the headline, lead, proof and offer blocks with a structural annotation each.
                </TableCell>
              </TableRow>
            )}
            {sections.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.section_type}</TableCell>
                <TableCell className="text-sm">{s.annotation}</TableCell>
                <TableCell className="max-w-md text-xs text-ink-muted">{s.excerpt}</TableCell>
                <TableCell className="text-xs">{s.embedding ? "yes" : "no"}</TableCell>
                <TableCell>
                  <ActionButton variant="ghost" size="icon-sm" aria-label="Delete section" action={() => deleteExampleSection(s.id, exampleId)} confirm="Delete this section?">
                    <Trash2 className="h-4 w-4 text-bad" />
                  </ActionButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>

      <form action={action} className="rounded-card border border-line bg-surface p-5 shadow-card">
        <input type="hidden" name="example_id" value={exampleId} />
        <h3 className="text-sm font-semibold text-ink">Add a section</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <Field label="Section type" htmlFor="section_type">
            <NativeSelect id="section_type" name="section_type" defaultValue="lead">
              <OptionList options={SECTION_TYPES} />
            </NativeSelect>
          </Field>
          <Field label="Annotation" htmlFor="annotation" hint="Structural description in our words; this is what gets embedded and retrieved.">
            <Textarea id="annotation" name="annotation" required className="min-h-16" />
          </Field>
          <Field label="Excerpt" htmlFor="section_excerpt" hint="≤400 characters.">
            <CountedTextarea id="section_excerpt" name="excerpt" max={400} />
          </Field>
          <Field label="Text" htmlFor="section_text" hint={fullTextAllowed ? "Allowed by the example's rights status." : "Disabled: the example's rights status does not permit storing section text."}>
            <Textarea id="section_text" name="text" disabled={!fullTextAllowed} className="min-h-16 font-mono text-xs" />
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <FormMessage state={state} />
          <SubmitButton size="sm" pendingLabel="Adding…">
            Add section
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
