"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createOffer, submitOfferSources } from "@/lib/actions/offers";
import { linesToArray } from "./normalize";
import { Field } from "./fields";
import { SourceInputs, emptySourceDraft, sourceDraftCount, uploadPendingFiles, type SourceDraft, type PendingFile, type UploadedFile } from "./source-inputs";

export function NewOfferForm() {
  const [name, setName] = useState("");
  const [draft, setDraft] = useState<SourceDraft>(emptySourceDraft());
  const [phase, setPhase] = useState<"idle" | "creating" | "uploading" | "starting">("idle");
  const [created, setCreated] = useState<{ offerId: string; workspaceId: string } | null>(null);
  const uploadedRef = useRef<Map<string, UploadedFile>>(new Map());
  const [pending, startTransition] = useTransition();
  const busy = pending || phase !== "idle";
  const count = sourceDraftCount(draft);
  const invalidFiles = draft.files.filter((f) => f.state === "invalid");

  function patchFile(id: string, patch: Partial<PendingFile>) {
    setDraft((d) => ({ ...d, files: d.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (count === 0) {
      toast.error("Add at least one source: a URL, a document or a description.");
      return;
    }
    if (invalidFiles.length > 0) {
      toast.error("Remove the files that cannot be uploaded first.");
      return;
    }
    const urls = linesToArray(draft.urls);
    const bad = urls.filter((u) => !/^https?:\/\/\S+$/i.test(u));
    if (bad.length > 0) {
      toast.error(`Not a full URL: ${bad[0]}`);
      return;
    }
    startTransition(async () => {
      setPhase("creating");
      let ids = created;
      if (!ids) {
        const r = await createOffer({ name, firstUrl: urls[0], firstFile: draft.files[0]?.file.name, description: draft.text });
        if (!r.ok) {
          toast.error(r.error);
          setPhase("idle");
          return;
        }
        ids = r.data;
        setCreated(ids);
      }
      // Files already uploaded on an earlier attempt are kept; only new or failed ones go up.
      const toUpload = draft.files.filter((f) => f.state === "ready" || f.state === "error");
      if (toUpload.length > 0) {
        setPhase("uploading");
        const res = await uploadPendingFiles(ids.workspaceId, ids.offerId, toUpload, patchFile);
        for (const u of res.uploaded) uploadedRef.current.set(u.id, { name: u.name, storage_path: u.storage_path, mime_type: u.mime_type });
        if (res.failed.length > 0) {
          toast.error(`${res.failed.length} file${res.failed.length > 1 ? "s" : ""} could not be uploaded. Remove or retry, then continue.`);
          setPhase("idle");
          return;
        }
      }
      const uploaded = draft.files.map((f) => uploadedRef.current.get(f.id)).filter((u): u is UploadedFile => !!u);
      setPhase("starting");
      const result = await submitOfferSources({ offerId: ids.offerId, urls, text: draft.text, files: uploaded });
      // On success the action redirects and never returns.
      if (result && !result.ok) {
        toast.error(result.error);
        setPhase("idle");
      }
    });
  }

  const label = phase === "creating" ? "Creating offer…" : phase === "uploading" ? "Uploading documents…" : phase === "starting" ? "Starting extraction…" : `Create offer${count > 0 ? ` from ${count} source${count > 1 ? "s" : ""}` : ""}`;

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
        <Field label="Offer name" hint="Optional. We take it from the first source if you leave it blank." htmlFor="name" className="max-w-md">
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Retainer Launchpad" disabled={busy} />
        </Field>
      </div>
      <div className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
        <h2 className="text-base font-semibold text-ink">Sources</h2>
        <p className="mb-5 mt-0.5 text-sm text-ink-muted">Use any mix. Everything is read into one brief, a claims ledger and a list of open questions. Nothing you give is used anywhere outside this workspace.</p>
        <SourceInputs draft={draft} onChange={setDraft} disabled={busy} />
      </div>
      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-ink-muted">
          {created && phase === "idle" ? (
            <>
              The offer was created but has no sources yet.{" "}
              <Link className="underline" href={`/app/offers/${created.offerId}`}>
                Open it anyway
              </Link>
              .
            </>
          ) : (
            <>Extraction takes a minute or two. You can watch it on the offer page.</>
          )}
        </div>
        <Button type="submit" disabled={busy} className="rounded-full shadow-glow">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {label}
        </Button>
      </div>
    </form>
  );
}
