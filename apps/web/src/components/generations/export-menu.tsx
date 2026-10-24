"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Copy, FileText, FileCode, FileType, Loader2, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportDraft } from "@/lib/actions/generations";
import { cleanMarkdown, markdownToText } from "@/components/editor/markdown-blocks";
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

export function ExportMenu({ draftId, fileBase, all, item }: Props) {
  const [busy, setBusy] = useState(false);
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
