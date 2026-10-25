"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ next, initialEmail }: { next?: string; initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = createClient();
    const redirect = `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect, shouldCreateUser: true } });
    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="mt-6 rounded-md bg-brand-faint px-4 py-3 text-sm text-brand-strong">
        Check <strong>{email}</strong> for a sign-in link. It works once and expires in an hour.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {state === "error" && <p className="text-sm text-bad">{message}</p>}
      <Button type="submit" className="w-full rounded-full shadow-glow" disabled={state === "sending"}>
        {state === "sending" ? "Sending link…" : "Send me a sign-in link"}
      </Button>
    </form>
  );
}
