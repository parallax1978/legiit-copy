import { cn } from "@/lib/utils";
import { renderMarkdownSafe } from "@/lib/markdown";

/** Renders model-written markdown. Server component; raw HTML in the source is shown literally and unsafe link schemes are dropped. */
export function Markdown({ source, className }: { source: string | null | undefined; className?: string }) {
  if (!source) return <p className="text-sm italic text-ink-soft">No output</p>;
  return <div className={cn("copy-prose", className)} dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(source) }} />;
}
