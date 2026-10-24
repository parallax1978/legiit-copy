"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSetting } from "@/lib/actions/admin";
import type { SettingKey } from "@/lib/data/admin";
import { StatusBadge } from "./status-badge";

export function SettingField({ keyName, label, hint, value, secret }: { keyName: SettingKey; label: string; hint: React.ReactNode; value: string | null; secret?: boolean }) {
  const [draft, setDraft] = React.useState(secret ? "" : (value ?? ""));
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  async function save() {
    setPending(true);
    try {
      const r = await saveSetting(keyName, draft);
      if (r.ok) {
        toast.success(r.message);
        if (secret) setDraft("");
        router.refresh();
      } else toast.error(r.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={keyName} className="text-sm font-semibold text-ink">
          {label} <span className="ml-1 font-mono text-xs font-normal text-ink-soft">{keyName}</span>
        </label>
        {secret && <StatusBadge value={value ? "active" : "unknown"} className={value ? "" : ""} />}
      </div>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
      <div className="mt-3 flex gap-2">
        <Input
          id={keyName}
          type={secret ? "password" : "text"}
          autoComplete={secret ? "new-password" : "off"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={secret ? (value ? "Set. Enter a new value to rotate." : "Not set") : ""}
          className="font-mono text-xs"
        />
        <Button onClick={save} disabled={pending || !draft.trim()} size="sm">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </Button>
      </div>
    </div>
  );
}
