import { Logo } from "@/components/brand/logo";
import { createWorkspace } from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = { title: "Create your workspace" };

export default function OnboardingPage() {
  return (
    <main className="mx-auto max-w-md py-12">
      <Logo className="mb-8" />
      <div className="rounded-card border border-line bg-surface p-8 shadow-card">
        <h1 className="text-xl font-bold text-ink">Name your workspace</h1>
        <p className="mt-1 text-sm text-ink-muted">Offers, copy and teammates live inside a workspace. You can add more later.</p>
        <form action={createWorkspace} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace name</Label>
            <Input id="name" name="name" required placeholder="Acme Marketing" />
          </div>
          <Button type="submit" className="w-full rounded-full shadow-glow">Create workspace</Button>
        </form>
      </div>
    </main>
  );
}
