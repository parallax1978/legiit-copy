"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface JsonTextareaProps extends Omit<React.ComponentProps<"textarea">, "defaultValue"> {
  defaultValue?: unknown;
  kind?: "object" | "array" | "any";
}

/** Textarea for a JSON field with live validation. Submits the raw text; the server action parses it again. */
export function JsonTextarea({ defaultValue, kind = "any", className, onChange, ...props }: JsonTextareaProps) {
  const initial = typeof defaultValue === "string" ? defaultValue : defaultValue === undefined ? "" : JSON.stringify(defaultValue, null, 2);
  const [status, setStatus] = React.useState<string | null>(() => validate(initial, kind));
  return (
    <div>
      <textarea
        {...props}
        defaultValue={initial}
        spellCheck={false}
        onChange={(e) => {
          setStatus(validate(e.target.value, kind));
          onChange?.(e);
        }}
        className={cn(
          "min-h-32 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          status ? "border-bad focus-visible:border-bad" : "border-input focus-visible:border-ring",
          className,
        )}
      />
      <p className={cn("mt-1 text-xs", status ? "text-bad" : "text-ink-soft")}>{status ?? (kind === "any" ? "Valid JSON" : `Valid JSON ${kind}`)}</p>
    </div>
  );
}

function validate(text: string, kind: "object" | "array" | "any"): string | null {
  if (!text.trim()) return null;
  try {
    const v = JSON.parse(text);
    if (kind === "object" && (v === null || typeof v !== "object" || Array.isArray(v))) return "Must be a JSON object";
    if (kind === "array" && !Array.isArray(v)) return "Must be a JSON array";
    return null;
  } catch (e) {
    return `Invalid JSON: ${(e as Error).message}`;
  }
}
