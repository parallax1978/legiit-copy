"use client";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { GitCompare, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DraftRow } from "@/lib/data/generations";
import { diffParagraphs, splitParagraphs } from "@/components/editor/markdown-blocks";

const ORIGIN: Record<string, { label: string; className: string }> = {
  system: { label: "Engine draft", className: "bg-brand-faint text-brand-strong" },
  revise: { label: "Revision", className: "bg-brand-faint text-brand-strong" },
  rewrite: { label: "Rewrite", className: "bg-good-soft text-good" },
  user: { label: "Your edit", className: "bg-warn-soft text-warn" },
  challenger: { label: "Challenger", className: "bg-surface-sunken text-ink-muted" },
};

export function VersionsPanel({ drafts, currentId, onOpen }: { drafts: DraftRow[]; currentId: string | null; onOpen: (id: string) => void }) {
  const sorted = useMemo(() => [...drafts].sort((a, b) => b.version - a.version), [drafts]);
  const [compare, setCompare] = useState<[string | null, string | null]>([null, null]);
  const a = sorted.find((d) => d.id === compare[0]) ?? null;
  const b = sorted.find((d) => d.id === compare[1]) ?? null;

  const pick = (id: string) => {
    setCompare(([x, y]) => {
      if (x === id) return [null, y];
      if (y === id) return [x, null];
      if (!x) return [id, y];
      if (!y) return [x, id];
      return [y, id];
    });
  };

  if (!drafts.length) return <p className="text-sm text-ink-muted">No versions yet.</p>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-muted">Open any version, or tick two to compare them paragraph by paragraph.</p>
      <ul className="space-y-1.5">
        {sorted.map((d) => {
          const o = ORIGIN[d.origin] ?? { label: d.origin, className: "bg-surface-sunken text-ink-muted" };
          const checked = compare.includes(d.id);
          return (
            <li key={d.id} className={cn("flex items-center gap-2 rounded-lg border p-2 text-sm", d.id === currentId ? "border-brand bg-brand-faint/40" : "border-line")}>
              <input type="checkbox" aria-label={`Compare version ${d.version}`} checked={checked} onChange={() => pick(d.id)} className="h-3.5 w-3.5 accent-[var(--brand)]" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-ink">v{d.version}</span>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", o.className)}>{o.label}</span>
                  {d.label && <span className="truncate text-xs text-ink-muted">{d.label}</span>}
                </div>
                <div className="text-[11px] text-ink-soft">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}{d.word_count ? ` · ${d.word_count.toLocaleString()} words` : ""}</div>
              </div>
              {d.id !== currentId && (
                <Button size="icon-xs" variant="ghost" aria-label={`Open version ${d.version}`} onClick={() => onOpen(d.id)}><Eye className="h-3 w-3" /></Button>
              )}
            </li>
          );
        })}
      </ul>
      {a && b && <DiffView a={a.version < b.version ? a : b} b={a.version < b.version ? b : a} onClose={() => setCompare([null, null])} />}
    </div>
  );
}

function DiffView({ a, b, onClose }: { a: DraftRow; b: DraftRow; onClose: () => void }) {
  const ops = useMemo(() => diffParagraphs(splitParagraphs(a.markdown), splitParagraphs(b.markdown)), [a.markdown, b.markdown]);
  const added = ops.filter((o) => o.kind === "added").length;
  const removed = ops.filter((o) => o.kind === "removed").length;
  return (
    <div className="rounded-lg border border-line">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-alt px-3 py-2 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-ink"><GitCompare className="h-3.5 w-3.5" /> v{a.version} → v{b.version}</span>
        <span className="text-ink-muted"><span className="text-good">+{added}</span> / <span className="text-bad">−{removed}</span> paragraphs</span>
        <Button size="icon-xs" variant="ghost" onClick={onClose} aria-label="Close comparison"><X className="h-3 w-3" /></Button>
      </div>
      <div className="max-h-[60vh] overflow-auto p-2 text-xs leading-relaxed">
        {ops.length === 0 && <p className="p-2 text-ink-muted">Both versions are empty.</p>}
        {added + removed === 0 && ops.length > 0 && <p className="p-2 text-ink-muted">No paragraph-level differences.</p>}
        <div className="grid grid-cols-2 gap-1">
          {ops.map((o, i) => (
            <DiffRow key={i} op={o} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DiffRow({ op }: { op: { kind: "same" | "added" | "removed"; text: string } }) {
  if (op.kind === "same") {
    return (
      <>
        <p className="whitespace-pre-line rounded px-2 py-1 text-ink-muted">{op.text}</p>
        <p className="whitespace-pre-line rounded px-2 py-1 text-ink-muted">{op.text}</p>
      </>
    );
  }
  if (op.kind === "removed") {
    return (
      <>
        <p className="whitespace-pre-line rounded bg-bad-soft/60 px-2 py-1 text-ink line-through decoration-bad/50">{op.text}</p>
        <p />
      </>
    );
  }
  return (
    <>
      <p />
      <p className="whitespace-pre-line rounded bg-good-soft/70 px-2 py-1 text-ink">{op.text}</p>
    </>
  );
}
