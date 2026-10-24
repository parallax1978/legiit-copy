"use client";
import * as React from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "./status-badge";
import { ActionButton } from "./action-button";
import { deleteControl } from "@/lib/actions/admin";
import { asStringArray, jsonPretty } from "./fmt";
import type { ControlListRow } from "@/lib/data/admin";

export function ControlDrawer({ control }: { control: ControlListRow }) {
  const [open, setOpen] = React.useState(false);
  const lessons = asStringArray(control.lessons);
  const losing = Array.isArray(control.losing_variants) ? control.losing_variants : [];
  return (
    <>
      <Button variant="link" size="sm" className="h-auto p-0 text-left font-medium text-ink" onClick={() => setOpen(true)}>
        {control.title}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{control.title}</SheetTitle>
            <SheetDescription>
              {[control.author, control.format, control.market, control.funnel_position, control.traffic].filter(Boolean).join(" · ")}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4 pb-6 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={control.rights_status} />
              {control.verification && <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-ink-muted">verification: {control.verification}</span>}
              {control.external_id && <span className="font-mono text-xs text-ink-soft">{control.external_id}</span>}
              {control.source_url && (
                <a href={control.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand hover:underline">
                  source <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {control.excerpt && (
              <Block title="Excerpt">
                <p className="whitespace-pre-wrap text-ink">{control.excerpt}</p>
              </Block>
            )}
            <Block title="Structure">
              <pre className="max-h-72 overflow-auto rounded-md bg-surface-sunken p-3 font-mono text-xs">{jsonPretty(control.structure)}</pre>
            </Block>
            <Block title="Results">
              <pre className="max-h-48 overflow-auto rounded-md bg-surface-sunken p-3 font-mono text-xs">{jsonPretty(control.results)}</pre>
            </Block>
            <Block title={`Losing variants (${losing.length})`}>
              {losing.length ? <pre className="max-h-72 overflow-auto rounded-md bg-surface-sunken p-3 font-mono text-xs">{jsonPretty(losing)}</pre> : <p className="text-xs text-ink-soft">None recorded</p>}
            </Block>
            <Block title={`Lessons (${lessons.length})`}>
              {lessons.length ? (
                <ul className="list-disc space-y-1 pl-5">
                  {lessons.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-ink-soft">None recorded</p>
              )}
            </Block>
            {control.notes && (
              <Block title="Notes">
                <p className="whitespace-pre-wrap text-ink-muted">{control.notes}</p>
              </Block>
            )}
            <div className="flex justify-end border-t border-line pt-4">
              <ActionButton variant="destructive" size="sm" action={() => deleteControl(control.id)} confirm="Delete this control? This cannot be undone." onDone={(r) => r.ok && setOpen(false)}>
                Delete control
              </ActionButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</h4>
      {children}
    </div>
  );
}
