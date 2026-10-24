"use client";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "./form-bits";

export interface FilterField {
  name: string;
  label: string;
  options: readonly string[] | { value: string; label: string }[];
}

/** Search box plus selects that write to the URL search params; the server component re-reads them. */
export function FilterBar({ fields, searchPlaceholder = "Search…", searchName = "q" }: { fields: FilterField[]; searchPlaceholder?: string; searchName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get(searchName) ?? "");

  function update(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    router.replace(`${pathname}?${next.toString()}`);
  }

  const hasFilters = [...params.keys()].some((k) => k === searchName || fields.some((f) => f.name === k));

  return (
    <form
      className="mb-4 flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        update(searchName, q.trim());
      }}
    >
      <div className="relative min-w-48 flex-1 md:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ink-soft" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="pl-8" />
      </div>
      {fields.map((f) => (
        <NativeSelect key={f.name} aria-label={f.label} value={params.get(f.name) ?? ""} onChange={(e) => update(f.name, e.target.value)} className="w-auto min-w-32">
          <option value="">{f.label}: all</option>
          {f.options.map((o) => {
            const value = typeof o === "string" ? o : o.value;
            const label = typeof o === "string" ? o : o.label;
            return (
              <option key={value} value={value}>
                {label}
              </option>
            );
          })}
        </NativeSelect>
      ))}
      <Button type="submit" variant="secondary" size="sm">
        Apply
      </Button>
      {hasFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={() => router.replace(pathname)}>
          <X className="h-4 w-4" /> Clear
        </Button>
      )}
    </form>
  );
}
