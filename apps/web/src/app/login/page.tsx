import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="min-h-screen bg-surface-alt">
      <div className="mx-auto flex max-w-md flex-col gap-8 px-4 py-16">
        <Link href="/" className="self-start"><Logo /></Link>
        <div className="rounded-card border border-line bg-surface p-8 shadow-card">
          <h1 className="text-xl font-bold tracking-tight text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-ink-muted">Enter your email. We send a link that signs you in. No password.</p>
          {sp.error === "link" && (
            <p className="mt-4 rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">That link expired or was already used. Request a new one.</p>
          )}
          <LoginForm next={sp.next} />
        </div>
        <p className="text-xs text-ink-soft">A Legiit product. By signing in you agree to the <Link className="underline" href="/terms">terms</Link> and <Link className="underline" href="/privacy">privacy policy</Link>.</p>
      </div>
    </main>
  );
}
