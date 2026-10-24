import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/app/login/login-form";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AcceptInvite } from "@/components/settings/accept-invite";

export const metadata = { title: "Join a workspace" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const next = `/invite/${token}`;
  const user = await getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-surface-alt">
        <div className="mx-auto flex max-w-md flex-col gap-8 px-4 py-16">
          <Link href="/" className="self-start"><Logo /></Link>
          <div className="rounded-card border border-line bg-surface p-8 shadow-card">
            <p className="text-sm font-semibold text-brand">You have been invited</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">Sign in to join the workspace</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Use the email address the invite was sent to. We send a link that signs you in; no password. New here? The same link creates your account and adds you to the workspace.
            </p>
            <LoginForm next={next} />
            <p className="mt-4 text-xs text-ink-soft">
              Prefer the full sign-in page? <Link className="underline" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
            </p>
          </div>
          <p className="text-xs text-ink-soft">A Legiit product. By signing in you agree to the <Link className="underline" href="/terms">terms</Link> and <Link className="underline" href="/privacy">privacy policy</Link>.</p>
        </div>
      </main>
    );
  }

  // readable when the invite is addressed to this user's email (RLS), otherwise the action explains
  const supabase = await createClient();
  const { data: invite } = await supabase.from("workspace_invites").select("role").eq("token", token).maybeSingle();

  return (
    <main className="min-h-screen bg-surface-alt">
      <div className="mx-auto flex max-w-md flex-col gap-8 px-4 py-16">
        <Link href="/app" className="self-start"><Logo /></Link>
        <div className="rounded-card border border-line bg-surface p-8 shadow-card">
          <h1 className="text-xl font-bold tracking-tight text-ink">Joining workspace</h1>
          <p className="mt-1 mb-6 text-sm text-ink-muted">One moment while we add you.</p>
          <AcceptInvite token={token} email={user.email ?? ""} role={invite?.role ?? null} />
        </div>
      </div>
    </main>
  );
}
