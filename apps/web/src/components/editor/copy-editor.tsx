"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { marked } from "marked";
import TurndownService from "turndown";
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Undo2, Redo2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false, gfm: true, breaks: false }) as string;
}

let turndown: TurndownService | null = null;
export function htmlToMarkdown(html: string): string {
  if (!turndown) {
    turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced", emDelimiter: "*", strongDelimiter: "**" });
  }
  // turndown escapes [ and ], which would break [[L:<id>]] tags and [ Button ] lines
  return turndown.turndown(html).replace(/\\([[\]])/g, "$1").replace(/\n{3,}/g, "\n\n").trim();
}

interface Props {
  /** Markdown to start from. Change `key` on the parent to reset. */
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  onRewriteSelection?: (selectedText: string) => void;
  className?: string;
}

export function CopyEditor({ initialMarkdown, onChange, onRewriteSelection, className }: Props) {
  const html = useMemo(() => markdownToHtml(initialMarkdown), [initialMarkdown]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<{ top: number; left: number; text: string } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true } }),
      Placeholder.configure({ placeholder: "Write the copy…" }),
    ],
    content: html,
    immediatelyRender: false,
    editorProps: { attributes: { class: "copy-prose min-h-[50vh] outline-none" } },
    onUpdate: ({ editor }) => onChange(htmlToMarkdown(editor.getHTML())),
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      if (from === to || !wrapRef.current) {
        setSel(null);
        return;
      }
      const text = editor.state.doc.textBetween(from, to, "\n").trim();
      if (!text) {
        setSel(null);
        return;
      }
      const start = editor.view.coordsAtPos(from);
      const box = wrapRef.current.getBoundingClientRect();
      setSel({ top: start.top - box.top - 40, left: Math.max(0, Math.min(start.left - box.left, box.width - 160)), text });
    },
  });

  useEffect(() => {
    if (!editor) return;
    const onBlur = () => setTimeout(() => setSel(null), 150);
    editor.on("blur", onBlur);
    return () => {
      editor.off("blur", onBlur);
    };
  }, [editor]);

  if (!editor) return <div className={cn("min-h-[50vh] animate-pulse rounded-lg bg-surface-alt", className)} />;

  const Tool = ({ onClick, active, label, children }: { onClick: () => void; active?: boolean; label: string; children: React.ReactNode }) => (
    <Button type="button" variant="ghost" size="icon-sm" onMouseDown={(e) => e.preventDefault()} onClick={onClick} aria-label={label} title={label} className={cn(active && "bg-brand-faint text-brand-strong")}>
      {children}
    </Button>
  );

  return (
    <div className={cn("relative", className)} ref={wrapRef}>
      <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-0.5 rounded-lg border border-line bg-surface/95 p-1 shadow-card backdrop-blur">
        <Tool label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Tool>
        <Tool label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Tool>
        <span className="mx-1 h-5 w-px bg-line" />
        <Tool label="Headline" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></Tool>
        <Tool label="Deck" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Tool>
        <Tool label="Crosshead" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></Tool>
        <span className="mx-1 h-5 w-px bg-line" />
        <Tool label="Bullets" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Tool>
        <Tool label="Numbered" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Tool>
        <Tool label="Testimonial / quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></Tool>
        <span className="mx-1 h-5 w-px bg-line" />
        <Tool label="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></Tool>
        <Tool label="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></Tool>
        <span className="ml-auto hidden pr-2 text-[11px] text-ink-soft sm:block">Ledger tags look like [[L:…]] while editing. Keep them next to their claims.</span>
      </div>
      <EditorContent editor={editor} />
      {sel && onRewriteSelection && (
        <div className="absolute z-20" style={{ top: Math.max(44, sel.top), left: sel.left }}>
          <Button
            type="button"
            size="sm"
            className="rounded-full shadow-lift"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onRewriteSelection(sel.text);
              setSel(null);
            }}
          >
            <Wand2 className="h-3.5 w-3.5" /> Rewrite selection
          </Button>
        </div>
      )}
    </div>
  );
}
