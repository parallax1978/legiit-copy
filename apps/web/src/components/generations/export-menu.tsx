"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Copy, FileText, FileCode, FileType, Loader2, File, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportDraft, handoffForClaude } from "@/lib/actions/generations";
import { claudeHandoff, cleanMarkdown, markdownToText } from "@/components/editor/markdown-blocks";
import { markdownToHtml } from "@/components/editor/copy-editor";

export interface ExportScope {
  label: string;
  markdown: string;
  sectionIds?: string[];
}

interface Props {
  draftId: string;
  fileBase: string;
  all: ExportScope;
  /** The item currently shown, for multi-item formats. */
  item?: ExportScope | null;
  /** The page's copy as it is now (a rewrite's control): packed with the new copy so Claude can match part to part. */
  controlText?: string | null;
}


function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "copy";
}

export function ExportMenu({ draftId, fileBase, all, item, controlText }: Props) {
  const [busy, setBusy] = useState(false);
  const forClaude = async () => {
    // a rewrite: the engine places every block onto the page first (a model call of a few seconds); otherwise the marked copy, built here
    if (!controlText) {
      try {
        await navigator.clipboard.writeText(claudeHandoff(cleanMarkdown(all.markdown), null));
        toast.success("Copied. Paste it into the Claude conversation that holds your page.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Copy failed");
      }
      return;
    }
    setBusy(true);
    const waiting = toast.loading("Placing each line of the new copy on the page.");
    try {
      const r = await handoffForClaude(draftId);
      toast.dismiss(waiting);
      if (!r.ok) {
        // the placement could not run (the engine not yet updated, a model error): the message still goes out, matched by role
        await navigator.clipboard.writeText(claudeHandoff(cleanMarkdown(all.markdown), controlText));
        toast.message("Copied, matched by role and order rather than exact placement.", { description: r.error });
        return;
      }
      await navigator.clipboard.writeText(r.text);
      toast.success(r.unplaced ? `Copied. ${r.unplaced} block${r.unplaced === 1 ? "" : "s"} had no line on the page and are listed at the end to place.` : "Copied. Paste it into the Claude conversation that holds your page.");
    } catch (e) {
      toast.dismiss(waiting);
      toast.error(e instanceof Error ? e.message : "Copy failed");
    } finally {
      setBusy(false);
    }
  };
  const scopes: { key: string; scope: ExportScope }[] = item ? [{ key: "item", scope: item }, { key: "all", scope: all }] : [{ key: "all", scope: all }];

  const run = async (scope: ExportScope, kind: "copy" | "md" | "html" | "txt" | "docx") => {
    const base = slug(scope === all ? fileBase : `${fileBase}-${scope.label}`);
    const md = cleanMarkdown(scope.markdown);
    try {
      if (kind === "copy") {
        await navigator.clipboard.writeText(markdownToText(md));
        toast.success("Copied to clipboard");
        return;
      }
      if (kind === "md") return download(`${base}.md`, md, "text/markdown;charset=utf-8");
      if (kind === "txt") return download(`${base}.txt`, markdownToText(md), "text/plain;charset=utf-8");
      if (kind === "html") {
        const body = markdownToHtml(md);
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(fileBase)}</title><style>body{max-width:720px;margin:40px auto;padding:0 20px;font:16px/1.6 Georgia,serif;color:#111}h1{font-size:2rem;line-height:1.2}blockquote{border-left:3px solid #ddd;margin:0;padding-left:1rem;color:#444}</style></head><body>${body}</body></html>`;
        return download(`${base}.html`, html, "text/html;charset=utf-8");
      }
      setBusy(true);
      const res = await exportDraft(draftId, "docx", scope.sectionIds);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      window.open(res.url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {scopes.map(({ key, scope }, i) => (
          <div key={key}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-ink-muted">{scopes.length > 1 ? (key === "item" ? `This item: ${scope.label}` : "All items") : "This version"}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => run(scope, "copy")}><Copy className="h-4 w-4" /> Copy to clipboard</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run(scope, "md")}><FileText className="h-4 w-4" /> Markdown (.md)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run(scope, "html")}><FileCode className="h-4 w-4" /> HTML (.html)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run(scope, "txt")}><FileType className="h-4 w-4" /> Plain text (.txt)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run(scope, "docx")}><File className="h-4 w-4" /> Word (.docx)</DropdownMenuItem>
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-ink-muted">Update the page</DropdownMenuLabel>
        <DropdownMenuItem onClick={forClaude}><Sparkles className="h-4 w-4" /> For Claude: paste one message, it updates the page</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
