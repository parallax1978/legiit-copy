import { Package, ListChecks, PenLine } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { createWorkspace } from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = { title: "Create your workspace" };

const STEPS = [
  { icon: Package, title: "Save the offer", text: "Paste a URL or upload what you have. The brief is extracted and every fact gets a line in a claims ledger with its evidence and grade." },
  { icon: ListChecks, title: "Approve the ledger", text: "You decide what the copy may say. Risky claims are flagged with the rule and a rewrite, never quietly softened." },
  { icon: PenLine, title: "Write and review", text: "The argument is chosen before any prose. Drafts get a cold read on a second model and a copy chief's gates before you see them." },
];

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const error = sp.error === "name" ? "Give the workspace a name." : sp.error;

  return (
    <div className="mx-auto max-w-3xl py-6 md:py-10">
      <Logo className="mb-8" markSize={32} textSize={17} />
      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-sm font-semibold text-brand">Welcome to Legiit Copy</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink md:text-3xl">Copy that picks the argument before it writes a word.</h1>
          <p className="mt-3 text-sm text-ink-muted">
            Everything lives in a workspace: offers, their evidence, the copy written from it, and the teammates who review it. Name yours to start. You can create more later, one per client or brand.
          </p>
          <ol className="mt-6 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="brand-gradient inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-glow">
                  <s.icon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{i + 1}. {s.title}</h3>
                  <p className="mt-0.5 text-sm text-ink-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-card border border-line bg-surface p-6 shadow-card md:p-8">
          <h2 className="text-lg font-bold text-ink">Name your workspace</h2>
          <p className="mt-1 text-sm text-ink-muted">Use the client or brand the copy is for.</p>
          <form action={createWorkspace} className="mt-6 space-y-4">
            <input type="hidden" name="return_to" value="/app/onboarding" />
            <div className="space-y-2">
              <Label htmlFor="name">Workspace name</Label>
              <Input id="name" name="name" required maxLength={80} placeholder="Acme Marketing" autoFocus />
            </div>
            {error && <p className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
            <Button type="submit" className="w-full rounded-full shadow-glow">Create workspace</Button>
            <p className="text-center text-xs text-ink-soft">You will be its owner. Invite teammates from Settings.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
