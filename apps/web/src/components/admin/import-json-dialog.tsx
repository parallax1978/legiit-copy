"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/data/admin";

export interface ImportJsonDialogProps {
  title: string;
  description: React.ReactNode;
  /** Server action that receives the raw JSON text. */
  action: (jsonText: string) => Promise<ActionResult<unknown>>;
  triggerLabel?: string;
  placeholder?: string;
}

/** Paste or upload JSON, send it to an import action, show the summary. */
export function ImportJsonDialog({ title, description, action, triggerLabel = "Import JSON", placeholder }: ImportJsonDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<ActionResult<unknown> | null>(null);
  const router = useRouter();
  const importErrors = result?.ok ? summaryErrors(result.data) : [];

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
  }

  async function run() {
    if (!text.trim()) return toast.error("Paste or upload JSON first");
    setPending(true);
    try {
      const r = await action(text);
      setResult(r);
      if (r.ok) {
        toast.success(r.message ?? "Imported");
        router.refresh();
      } else toast.error(r.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setResult(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-ink-muted">{description}</div>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <input type="file" accept="application/json,.json" onChange={onFile} className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-md file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium" />
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder ?? '[{ "...": "..." }]'} className="min-h-56 font-mono text-xs" spellCheck={false} />
          {result && (
            <div className={result.ok ? "rounded-md border border-good/30 bg-good-soft p-3 text-sm text-good" : "rounded-md border border-bad/30 bg-bad-soft p-3 text-sm text-bad"}>
              {result.ok ? result.message : result.error}
              {importErrors.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs text-warn">
                  {importErrors.slice(0, 10).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={run} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function summaryErrors(data: unknown): string[] {
  if (!data || typeof data !== "object" || !("errors" in data)) return [];
  const errors = (data as { errors: unknown }).errors;
  return Array.isArray(errors) ? errors.map(String) : [];
}
