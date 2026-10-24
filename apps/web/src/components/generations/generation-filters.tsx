"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { GENERATION_STATUSES } from "@/lib/data/generations";
import { statusLabel } from "./status-badge";

const ALL = "__all";

export function GenerationFilters({ offers, formats }: { offers: { id: string; name: string }[]; formats: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const offer = params.get("offer") ?? ALL;
  const status = params.get("status") ?? ALL;
  const format = params.get("format") ?? ALL;
  const active = [offer, status, format].some((v) => v !== ALL);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === ALL) next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={offer} onValueChange={(v) => set("offer", v)}>
        <SelectTrigger className="h-9 w-[180px] bg-surface" aria-label="Filter by offer">
          <SelectValue placeholder="All offers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All offers</SelectItem>
          {offers.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => set("status", v)}>
        <SelectTrigger className="h-9 w-[160px] bg-surface" aria-label="Filter by status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {GENERATION_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={format} onValueChange={(v) => set("format", v)}>
        <SelectTrigger className="h-9 w-[190px] bg-surface" aria-label="Filter by format">
          <SelectValue placeholder="All formats" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All formats</SelectItem>
          {formats.map((f) => (
            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {active && (
        <Button variant="ghost" size="sm" onClick={() => router.replace(pathname)}>
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}
