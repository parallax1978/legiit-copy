"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Copy, FileText, FileCode, FileType, Loader2, File, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportDraft, handoffForClaude } from "@/lib/actions/generations";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  // the message opens in a window with its own Copy button: a clipboard write after a wait of several seconds is refused
  // by browsers that want a fresh click, and a failure then looked like the export failing
  const [handoff, setHandoff] = useState<{ text: string; note: string | null } | null>(null);
  const forClaude = async () => {
    if (!controlText) {
      setHandoff({ text: claudeHandoff(cleanMarkdown(all.markdown), null), note: null });
      return;
    }
    // a rewrite: the engine places every block onto the page first (one model call, a few seconds)
    setBusy(true);
    const waiting = toast.loading("Placing each line of the new copy on the page.");
    try {
      const r = await handoffForClaude(draftId);
      toast.dismiss(waiting);
      if (!r.ok) {
        setHandoff({ text: claudeHandoff(cleanMarkdown(all.markdown), controlText), note: `Matched by role and order, not exact placement: ${r.error}` });
        return;
      }
      const note = !r.placed ? `Matched by role and order, not exact placement${r.note ? `: ${r.note}` : "."}` : r.unplaced ? `${r.unplaced} block${r.unplaced === 1 ? "" : "s"} had no line on the page and are listed at the end to place.` : null;
      setHandoff({ text: r.text, note });
    } catch (e) {
      toast.dismiss(waiting);
      setHandoff({ text: claudeHandoff(cleanMarkdown(all.markdown), controlText), note: `Matched by role and order, not exact placement: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBusy(false);
    }
  };
  const copyHandoff = async () => {
    if (!handoff) return;
    try {
      await navigator.clipboard.writeText(handoff.text);
      toast.success("Copied. Paste it into the Claude conversation that holds your page.");
    } catch {
      toast.error("The browser refused the copy. Select the text in the box and copy it.");
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
    <>
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
    <Dialog open={!!handoff} onOpenChange={(open) => !open && setHandoff(null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>For Claude</DialogTitle>
          <DialogDescription>Copy this and paste it into the Claude conversation that holds your page. Claude changes the words and leaves the design alone. The REMOVE lines are parts of the page the new copy does not carry: delete any you want the page to keep, here, before you copy.</DialogDescription>
        </DialogHeader>
        {handoff?.note && <p className="rounded-md bg-surface-alt px-3 py-2 text-xs text-ink-muted">{handoff.note}</p>}
        <Textarea value={handoff?.text ?? ""} onChange={(e) => handoff && setHandoff({ ...handoff, text: e.target.value })} rows={16} className="font-mono text-xs" />
        <DialogFooter>
          <Button variant="outline" onClick={() => handoff && download(`${slug(fileBase)}-for-claude.md`, handoff.text, "text/markdown;charset=utf-8")}><FileText className="h-4 w-4" /> Download (.md)</Button>
          <Button onClick={copyHandoff}><Copy className="h-4 w-4" /> Copy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
