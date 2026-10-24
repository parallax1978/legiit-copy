"use client";
import { Quote, MousePointerClick, Tag, ShieldCheck, Clock3, Presentation, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Block, Section } from "./markdown-blocks";
import { LedgerText } from "./ledger-chip";

export function SectionList({ sections, showSectionTitles = true, className }: { sections: Section[]; showSectionTitles?: boolean; className?: string }) {
  return (
    <div className={cn("copy-prose", className)}>
      {sections.map((s) => (
        <section key={s.section_id} data-section-id={s.section_id} className="relative">
          {showSectionTitles && (
            <div className="mt-6 mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft select-none first:mt-0">
              <span className="h-px flex-1 bg-line" />
              {s.title?.trim() || s.section_id.replace(/[_-]+/g, " ")}
              <span className="h-px flex-1 bg-line" />
            </div>
          )}
          {s.blocks.map((b) => (
            <BlockView key={b.id} block={b} />
          ))}
        </section>
      ))}
    </div>
  );
}

export function BlockView({ block }: { block: Block }) {
  const b = block;
  const attrs = { "data-block-id": b.id, "data-block-type": b.type };
  const text = <LedgerText text={b.text} />;
  switch (b.type) {
    case "preheadline":
      return <p {...attrs} className="mb-1 text-sm font-semibold uppercase tracking-wide text-brand-strong">{text}</p>;
    case "headline":
      return <h1 {...attrs}>{text}</h1>;
    case "deck":
      return <h2 {...attrs} className="font-semibold text-ink-muted">{text}</h2>;
    case "crosshead":
      return <h3 {...attrs}>{text}</h3>;
    case "hook":
      return <p {...attrs} className="text-lg font-semibold text-ink">{text}</p>;
    case "paragraph":
    case "greeting":
      return <p {...attrs} className="whitespace-pre-line">{text}</p>;
    case "signoff":
      return <p {...attrs} className="whitespace-pre-line text-ink">{text}</p>;
    case "bullets":
      return (
        <ul {...attrs}>
          {(b.items ?? []).map((item, i) => (
            <li key={i}><LedgerText text={item} /></li>
          ))}
          {b.text && !b.items?.length && <li>{text}</li>}
        </ul>
      );
    case "numbered":
      return (
        <ol {...attrs} className="mb-3 list-decimal pl-6">
          {(b.items ?? []).map((item, i) => (
            <li key={i}><LedgerText text={item} /></li>
          ))}
        </ol>
      );
    case "cta":
      return (
        <p {...attrs} className="my-4 flex gap-2 rounded-lg border border-brand-soft bg-brand-faint/60 px-4 py-3 font-medium text-ink">
          <MousePointerClick className="mt-1 h-4 w-4 shrink-0 text-brand-strong" />
          <span>{text}</span>
        </p>
      );
    case "button":
      return (
        <p {...attrs} className="my-4 text-center">
          <span className="brand-gradient inline-block rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-glow">{text}</span>
        </p>
      );
    case "ps":
      return <p {...attrs} className="mt-5 whitespace-pre-line border-t border-dashed border-line pt-3">{b.text.startsWith("P.S.") ? text : <><strong>P.S.</strong> {text}</>}</p>;
    case "testimonial":
      return (
        <blockquote {...attrs} className="relative">
          <Quote className="absolute -left-0.5 -top-1 h-3 w-3 text-brand-soft" />
          <span className="whitespace-pre-line">{text}</span>
          {b.meta?.attribution && <footer className="mt-1 text-xs text-ink-soft">— {b.meta.attribution}</footer>}
        </blockquote>
      );
    case "price":
      return <Box {...attrs} icon={<Tag className="h-3.5 w-3.5" />} label="Price">{text}</Box>;
    case "guarantee":
      return <Box {...attrs} icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Guarantee">{text}</Box>;
    case "recap":
      return (
        <Box {...attrs} label="What you get">
          {b.text && <div className="mb-1">{text}</div>}
          {b.items?.length ? (
            <ul className="mb-0">
              {b.items.map((item, i) => (
                <li key={i}><LedgerText text={item} /></li>
              ))}
            </ul>
          ) : null}
        </Box>
      );
    case "subject":
      return <Labeled {...attrs} icon={<Mail className="h-3.5 w-3.5" />} label="Subject" strong>{text}</Labeled>;
    case "preview":
      return <Labeled {...attrs} label="Preview">{text}</Labeled>;
    case "caption":
      return <p {...attrs} className="text-sm italic text-ink-muted">{text}</p>;
    case "label":
      return <p {...attrs} className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">{text}</p>;
    case "disclosure":
      return <p {...attrs} className="rounded border border-line bg-surface-alt px-3 py-2 text-xs text-ink-muted">{text}</p>;
    case "beat":
      return (
        <div {...attrs} className="my-2 grid grid-cols-[auto_1fr] gap-3 rounded-lg border border-line px-3 py-2">
          <div className="flex flex-col items-start gap-1 text-[11px] text-ink-soft">
            {b.meta?.timestamp && <span className="inline-flex items-center gap-1 font-mono"><Clock3 className="h-3 w-3" />{b.meta.timestamp}</span>}
            {b.meta?.speaker && <span className="font-semibold uppercase tracking-wide">{b.meta.speaker}</span>}
            {b.meta?.visual && <span className="italic">{b.meta.visual}</span>}
          </div>
          <div className="whitespace-pre-line">{text}</div>
        </div>
      );
    case "slide":
      return (
        <div {...attrs} className="my-3 rounded-lg border border-line bg-surface-alt p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            <Presentation className="h-3 w-3" /> {b.meta?.title ?? b.meta?.slide ?? "Slide"}
            {b.meta?.timestamp && <span className="font-mono normal-case tracking-normal">· {b.meta.timestamp}</span>}
          </div>
          <div className="whitespace-pre-line">{text}</div>
          {b.items?.length ? (
            <ul className="mb-0 mt-2">
              {b.items.map((item, i) => (
                <li key={i}><LedgerText text={item} /></li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    case "field": {
      const limit = b.meta?.limit ? Number(b.meta.limit) : null;
      const len = b.text.replace(/\[\[L:[^\]]+\]\]/g, "").trim().length;
      const over = limit != null && len > limit;
      return (
        <div {...attrs} className="my-2 rounded-lg border border-line px-3 py-2">
          <div className="mb-0.5 flex items-center justify-between gap-2 text-[11px] text-ink-soft">
            <span className="font-semibold uppercase tracking-wide">{b.meta?.platform_field ?? b.meta?.field ?? "Field"}</span>
            {limit != null && <span className={cn("font-mono", over && "text-bad")}>{len}/{limit}</span>}
          </div>
          <div className="whitespace-pre-line">{text}</div>
        </div>
      );
    }
    default:
      return <p {...attrs} className="whitespace-pre-line">{text}</p>;
  }
}

function Box({ label, icon, children, ...attrs }: { label: string; icon?: React.ReactNode; children: React.ReactNode } & Record<string, unknown>) {
  return (
    <div {...attrs} className="my-4 rounded-lg border border-line bg-surface-alt p-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{icon}{label}</div>
      <div className="whitespace-pre-line">{children}</div>
    </div>
  );
}

function Labeled({ label, icon, strong, children, ...attrs }: { label: string; icon?: React.ReactNode; strong?: boolean; children: React.ReactNode } & Record<string, unknown>) {
  return (
    <p {...attrs} className={cn("mb-1 flex flex-wrap items-baseline gap-x-2", strong ? "font-semibold text-ink" : "text-ink-muted")}>
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{icon}{label}</span>
      <span>{children}</span>
    </p>
  );
}
