"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, FileText, Link2, Loader2, PenLine, Plus, RotateCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { addOfferSources, deleteSource, retrySource } from "@/lib/actions/offers";
import type { OfferSourceView } from "./normalize";
import { linesToArray } from "./normalize";
import { SourceStatusBadge } from "./badges";
import { SectionCard } from "./fields";
import { SourceInputs, emptySourceDraft, sourceDraftCount, uploadPendingFiles, type SourceDraft, type PendingFile } from "./source-inputs";

const KIND_ICON = { url: Link2, file: FileText, text: PenLine } as const;

export function SourcesPanel({ offerId, workspaceId, sources, editable }: { offerId: string; workspaceId: string; sources: OfferSourceView[]; editable: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function act(id: string, fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setBusyId(id);
    start(async () => {
      const r = await fn();
      setBusyId(null);
      if (!r.ok) toast.error(r.error ?? "Something went wrong.");
      else {
        toast.success(success);
        router.refresh();
      }
    });
  }

  return (
    <SectionCard
      title="Sources"
      description="What the brief and ledger were read from. Adding a source re-runs extraction over everything."
      actions={editable && <AddSourcesDialog offerId={offerId} workspaceId={workspaceId} />}
    >
      {sources.length === 0 ? (
        <p className="text-sm text-ink-muted">No sources yet. Add a URL, a document or a description to start extraction.</p>
      ) : (
        <ul className="divide-y divide-line">
          {sources.map((s) => {
            const Icon = KIND_ICON[s.kind as keyof typeof KIND_ICON] ?? FileText;
            const busy = pending && busyId === s.id;
            return (
              <li key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                <Icon className="hidden size-4 shrink-0 text-ink-soft sm:block" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">{s.title ?? (s.kind === "text" ? "Typed description" : s.url ?? s.storage_path ?? s.kind)}</span>
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noreferrer" className="shrink-0 text-ink-soft hover:text-brand" aria-label="Open source">
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="truncate text-xs text-ink-muted">
                    {s.kind === "url" ? s.url : s.kind === "file" ? (s.mime_type ?? "document") : `${s.extracted_chars.toLocaleString()} characters`}
                    {" · "}added {new Date(s.created_at).toLocaleDateString()}
                    {s.extracted_chars > 0 && s.kind !== "text" ? ` · ${s.extracted_chars.toLocaleString()} characters read` : ""}
                  </p>
                  {s.error && <p className="mt-1 text-xs text-bad">{s.error}</p>}
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  <SourceStatusBadge status={s.extraction_status} />
                  {editable && (
                    <>
                      {s.extraction_status === "failed" && (
                        <Button size="icon-sm" variant="ghost" aria-label="Retry" disabled={busy} onClick={() => act(s.id, () => retrySource(s.id), "Retrying this source.")}>
                          {busy ? <Loader2 className="size-4 animate-spin" /> : <RotateCw className="size-4" />}
                        </Button>
                      )}
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Remove source"
                        disabled={busy}
                        onClick={() => {
                          if (confirm("Remove this source? The brief keeps what was already extracted until you re-run extraction.")) act(s.id, () => deleteSource(s.id), "Source removed.");
                        }}
                      >
                        <Trash2 className="size-4 text-ink-soft" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

export function AddSourcesDialog({ offerId, workspaceId, triggerLabel = "Add sources" }: { offerId: string; workspaceId: string; triggerLabel?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SourceDraft>(emptySourceDraft());
  const [busy, setBusy] = useState(false);
  const count = sourceDraftCount(draft);

  function patchFile(id: string, patch: Partial<PendingFile>) {
    setDraft((d) => ({ ...d, files: d.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
  }

  async function submit() {
    if (count === 0) return toast.error("Add at least one source.");
    if (draft.files.some((f) => f.state === "invalid")) return toast.error("Remove the files that cannot be uploaded first.");
    setBusy(true);
    try {
      const urls = linesToArray(draft.urls);
      const toUpload = draft.files.filter((f) => f.state === "ready" || f.state === "error");
      const { uploaded, failed } = await uploadPendingFiles(workspaceId, offerId, toUpload, patchFile);
      if (failed.length > 0) {
        toast.error(`${failed.length} file${failed.length > 1 ? "s" : ""} could not be uploaded.`);
        return;
      }
      const r = await addOfferSources({ offerId, urls, text: draft.text, files: uploaded });
      if (!r.ok) return toast.error(r.error);
      toast.success(`${r.data.count} source${r.data.count > 1 ? "s" : ""} added. Extraction restarted.`);
      setDraft(emptySourceDraft());
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add sources</DialogTitle>
          <DialogDescription>New material is read, then the brief, ledger and open questions are rebuilt from all sources together.</DialogDescription>
        </DialogHeader>
        <SourceInputs draft={draft} onChange={setDraft} disabled={busy} compact />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || count === 0}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Add and re-extract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
