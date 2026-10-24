"use client";
import { useEffect, useState, type RefObject } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SelectionInfo {
  text: string;
  blockId: string | null;
}

/**
 * Shows a floating "Rewrite selection" button when the user selects text inside `containerRef` (read mode).
 * The block id comes from the nearest [data-block-id] ancestor of the selection.
 */
export function SelectionToolbar({ containerRef, onRewrite, enabled }: { containerRef: RefObject<HTMLElement | null>; onRewrite: (sel: SelectionInfo) => void; enabled: boolean }) {
  const [state, setState] = useState<{ top: number; left: number; info: SelectionInfo } | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState(null);
      return;
    }
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const container = containerRef.current;
        const selection = window.getSelection();
        if (!container || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
          setState(null);
          return;
        }
        const range = selection.getRangeAt(0);
        const anchor = range.commonAncestorContainer;
        const anchorEl = anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : (anchor as Element);
        if (!anchorEl || !container.contains(anchorEl)) {
          setState(null);
          return;
        }
        const text = selection.toString().replace(/\s+/g, " ").trim();
        if (text.length < 3) {
          setState(null);
          return;
        }
        const rect = range.getBoundingClientRect();
        const box = container.getBoundingClientRect();
        const blockEl = anchorEl.closest<HTMLElement>("[data-block-id]");
        setState({
          top: rect.top - box.top - 40,
          left: Math.max(0, Math.min(rect.left - box.left + rect.width / 2 - 80, box.width - 170)),
          info: { text, blockId: blockEl?.dataset.blockId ?? null },
        });
      });
    };
    const clear = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-selection-toolbar]")) return;
      requestAnimationFrame(() => {
        const s = window.getSelection();
        if (!s || s.isCollapsed) setState(null);
      });
    };
    document.addEventListener("selectionchange", update);
    document.addEventListener("mousedown", clear);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("selectionchange", update);
      document.removeEventListener("mousedown", clear);
    };
  }, [containerRef, enabled]);

  if (!state) return null;
  return (
    <div data-selection-toolbar className="absolute z-20" style={{ top: Math.max(0, state.top), left: state.left }}>
      <Button
        type="button"
        size="sm"
        className="rounded-full shadow-lift"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          onRewrite(state.info);
          setState(null);
          window.getSelection()?.removeAllRanges();
        }}
      >
        <Wand2 className="h-3.5 w-3.5" /> Rewrite selection
      </Button>
    </div>
  );
}
