"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, AlertTriangle } from "lucide-react";
import { acceptInvite } from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";

/** Runs accept_invite once on mount, then the action redirects into the workspace. Errors render inline. */
export function AcceptInvite({ token, email, role }: { token: string; email: string; role: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ran = useRef(false);

  function run() {
    setError(null);
    start(async () => {
      const res = await acceptInvite(token);
      if (res && !res.ok) setError(res.error);
    });
  }

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md bg-bad-soft px-4 py-3 text-sm text-bad">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
        <p className="text-xs text-ink-muted">You are signed in as <strong>{email}</strong>.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={pending} className="rounded-full">Try again</Button>
          <Button asChild variant="outline" className="rounded-full"><Link href="/app">Go to the app</Link></Button>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="ghost">Sign out</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm text-ink-muted">
      <Loader2 className="h-4 w-4 animate-spin text-brand" />
      <span>Adding you to the workspace{role ? ` as ${role}` : ""}…</span>
    </div>
  );
}
