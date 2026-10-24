"use client";
import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/actions/admin";

export function SubmitButton({ children, pendingLabel, className, ...props }: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className} {...props}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> {pendingLabel ?? "Saving…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function FormMessage({ state }: { state: FormState | undefined }) {
  if (!state) return null;
  if (state.error) return <p className="rounded-md border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad">{state.error}</p>;
  if (state.ok && state.message) return <p className="rounded-md border border-good/30 bg-good-soft px-3 py-2 text-sm text-good">{state.message}</p>;
  return null;
}

export function Field({ label, htmlFor, hint, children, className }: { label: React.ReactNode; htmlFor?: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

/** A native select styled like the shadcn input; submits with FormData without extra wiring. */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={cn(
        "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function OptionList({ options, blank }: { options: readonly string[]; blank?: string }) {
  return (
    <>
      {blank !== undefined && <option value="">{blank}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </>
  );
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

/** Textarea with a live character counter and a hard max. */
export function CountedTextarea({ max, defaultValue, className, ...props }: React.ComponentProps<"textarea"> & { max: number }) {
  const [len, setLen] = React.useState(String(defaultValue ?? "").length);
  return (
    <div>
      <textarea
        {...props}
        defaultValue={defaultValue}
        maxLength={max}
        onChange={(e) => setLen(e.target.value.length)}
        className={cn(
          "min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          className,
        )}
      />
      <p className={cn("mt-1 text-right text-xs", len > max * 0.9 ? "text-warn" : "text-ink-soft")}>
        {len}/{max}
      </p>
    </div>
  );
}
