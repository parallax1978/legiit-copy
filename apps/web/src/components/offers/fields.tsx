"use client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { linesToArray } from "./normalize";

export function Field({ label, hint, htmlFor, children, className }: { label: React.ReactNode; hint?: React.ReactNode; htmlFor?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-ink">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function TextInput({ value, onChange, disabled, ...rest }: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & { value: string | null; onChange: (v: string) => void }) {
  return <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} {...rest} />;
}

export function TextArea({ value, onChange, disabled, ...rest }: Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange"> & { value: string | null; onChange: (v: string) => void }) {
  return <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} {...rest} />;
}

/** A list edited as one item per line. */
export function LinesArea({ value, onChange, disabled, rows = 4, placeholder }: { value: string[]; onChange: (v: string[]) => void; disabled?: boolean; rows?: number; placeholder?: string }) {
  return <Textarea value={value.join("\n")} onChange={(e) => onChange(e.target.value.split(/\r?\n/))} onBlur={(e) => onChange(linesToArray(e.target.value))} disabled={disabled} rows={rows} placeholder={placeholder} className="font-mono text-[13px]" />;
}

export function SectionCard({ title, description, actions, children, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-card border border-line bg-surface shadow-card", className)}>
      <header className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function Dl({ items, className }: { items: { label: string; value: React.ReactNode }[]; className?: string }) {
  const shown = items.filter((i) => i.value !== null && i.value !== undefined && i.value !== "");
  if (shown.length === 0) return <p className="text-sm text-ink-soft">Nothing recorded.</p>;
  return (
    <dl className={cn("grid gap-x-6 gap-y-3 sm:grid-cols-2", className)}>
      {shown.map((i) => (
        <div key={i.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft">{i.label}</dt>
          <dd className="mt-0.5 text-sm text-ink">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Chips({ items, empty = "None" }: { items: string[]; empty?: string }) {
  if (items.length === 0) return <p className="text-sm text-ink-soft">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span key={`${it}-${i}`} className="rounded-md bg-surface-sunken px-2 py-0.5 text-xs text-ink">
          {it}
        </span>
      ))}
    </div>
  );
}

export function ReadOnlyNote({ show }: { show: boolean }) {
  if (!show) return null;
  return <p className="rounded-md bg-surface-sunken px-3 py-2 text-xs text-ink-muted">You have view-only access to this workspace. Ask an owner for the editor role to make changes.</p>;
}
