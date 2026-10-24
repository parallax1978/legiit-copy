"use client";
import { useRef } from "react";
import { FileText, Link2, PenLine, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ACCEPTED_FILE_TYPES, MAX_FILE_BYTES, STORAGE_BUCKET } from "./constants";
import { Field } from "./fields";

export interface PendingFile {
  file: File;
  id: string;
  state: "invalid" | "ready" | "uploading" | "done" | "error";
  error?: string;
}
export interface UploadedFile {
  name: string;
  storage_path: string;
  mime_type: string | null;
}

export function extOf(name: string) {
  return (name.split(".").pop() ?? "").toLowerCase();
}
export function mimeFor(file: File) {
  return ACCEPTED_FILE_TYPES[extOf(file.name)] ?? (file.type || null);
}
export function validateFile(file: File): string | null {
  if (!ACCEPTED_FILE_TYPES[extOf(file.name)]) return "Only PDF, DOCX, TXT and MD files.";
  if (file.size > MAX_FILE_BYTES) return "Over 25 MB.";
  return null;
}
export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Uploads straight from the browser to offer-sources/<workspace>/<offer>/<file>. */
export async function uploadPendingFiles(
  workspaceId: string,
  offerId: string,
  files: PendingFile[],
  onState: (id: string, patch: Partial<PendingFile>) => void,
): Promise<{ uploaded: UploadedFile[]; failed: PendingFile[] }> {
  const supabase = createClient();
  const uploaded: UploadedFile[] = [];
  const failed: PendingFile[] = [];
  for (const pf of files) {
    onState(pf.id, { state: "uploading" });
    const safe = pf.file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120);
    const path = `${workspaceId}/${offerId}/${Date.now().toString(36)}-${safe}`;
    const mime = mimeFor(pf.file);
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, pf.file, { contentType: mime ?? undefined, upsert: false });
    if (error) {
      onState(pf.id, { state: "error", error: error.message });
      failed.push({ ...pf, state: "error", error: error.message });
    } else {
      onState(pf.id, { state: "done" });
      uploaded.push({ name: pf.file.name, storage_path: path, mime_type: mime });
    }
  }
  return { uploaded, failed };
}

export interface SourceDraft {
  urls: string;
  files: PendingFile[];
  text: string;
}
export const emptySourceDraft = (): SourceDraft => ({ urls: "", files: [], text: "" });
export function sourceDraftCount(d: SourceDraft) {
  return d.urls.split(/\r?\n/).filter((l) => l.trim()).length + d.files.length + (d.text.trim() ? 1 : 0);
}

export function SourceInputs({ draft, onChange, disabled, compact }: { draft: SourceDraft; onChange: (d: SourceDraft) => void; disabled?: boolean; compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...draft.files];
    for (const file of Array.from(list)) {
      const err = validateFile(file);
      next.push({ file, id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`, state: err ? "invalid" : "ready", error: err ?? undefined });
    }
    onChange({ ...draft, files: next });
  }

  return (
    <div className={cn("grid gap-5", !compact && "lg:grid-cols-3")}>
      <Field
        label={
          <span className="inline-flex items-center gap-1.5">
            <Link2 className="size-4 text-brand" /> Page URLs
          </span>
        }
        hint="One per line. Sales pages, order forms, FAQs, review pages."
        htmlFor="urls"
      >
        <Textarea id="urls" rows={compact ? 3 : 6} value={draft.urls} disabled={disabled} onChange={(e) => onChange({ ...draft, urls: e.target.value })} placeholder={"https://example.com/offer\nhttps://example.com/faq"} className="font-mono text-[13px]" />
      </Field>

      <Field
        label={
          <span className="inline-flex items-center gap-1.5">
            <Upload className="size-4 text-brand" /> Documents
          </span>
        }
        hint="PDF, DOCX, TXT or MD. Up to 25 MB each."
      >
        <div
          className={cn("flex min-h-24 flex-col items-center justify-center rounded-md border border-dashed border-line-strong bg-surface-alt px-3 py-4 text-center text-sm text-ink-muted transition-colors", !disabled && "hover:border-brand hover:bg-brand-faint/40")}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!disabled) addFiles(e.dataTransfer.files);
          }}
        >
          <input ref={inputRef} type="file" multiple accept=".pdf,.docx,.txt,.md" className="hidden" disabled={disabled} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
            Choose files
          </Button>
          <span className="mt-1.5 text-xs">or drop them here</span>
        </div>
        {draft.files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {draft.files.map((pf) => (
              <li key={pf.id} className="flex items-center gap-2 rounded-md border border-line bg-surface px-2 py-1.5 text-xs">
                <FileText className="size-3.5 shrink-0 text-ink-soft" />
                <span className="min-w-0 flex-1 truncate text-ink" title={pf.file.name}>
                  {pf.file.name}
                </span>
                <span className="shrink-0 text-ink-soft">{formatBytes(pf.file.size)}</span>
                {pf.state === "uploading" && <span className="shrink-0 text-brand">uploading…</span>}
                {pf.state === "done" && <span className="shrink-0 text-good">uploaded</span>}
                {(pf.state === "error" || pf.state === "invalid") && <span className="shrink-0 text-bad">{pf.error}</span>}
                {!disabled && (
                  <button type="button" aria-label="Remove file" className="shrink-0 rounded p-0.5 text-ink-soft hover:bg-surface-sunken hover:text-ink" onClick={() => onChange({ ...draft, files: draft.files.filter((f) => f.id !== pf.id) })}>
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Field>

      <Field
        label={
          <span className="inline-flex items-center gap-1.5">
            <PenLine className="size-4 text-brand" /> Describe it
          </span>
        }
        hint="What it is, who it is for, what it costs, what you promise, what you can prove."
        htmlFor="text"
      >
        <Textarea id="text" rows={compact ? 3 : 6} value={draft.text} disabled={disabled} onChange={(e) => onChange({ ...draft, text: e.target.value })} placeholder="A 6-week cohort course for freelance designers who want to land retainer clients. $1,497 or 3 × $549. 30-day money back…" />
      </Field>
    </div>
  );
}
