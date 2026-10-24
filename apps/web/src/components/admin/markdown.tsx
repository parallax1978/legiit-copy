import { marked } from "marked";
import { cn } from "@/lib/utils";

/** Renders model-written markdown. Server component; no raw HTML passthrough from the source is trusted. */
export function Markdown({ source, className }: { source: string | null | undefined; className?: string }) {
  if (!source) return <p className="text-sm italic text-ink-soft">No output</p>;
  const html = marked.parse(escapeHtmlInSource(source), { async: false, gfm: true, breaks: true }) as string;
  return <div className={cn("copy-prose", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Escape raw HTML tags so markdown is rendered but inline HTML from the model is shown literally. */
function escapeHtmlInSource(md: string) {
  return md.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
