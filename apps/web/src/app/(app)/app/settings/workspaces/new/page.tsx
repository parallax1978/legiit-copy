import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createWorkspace } from "@/lib/actions/workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = { title: "New workspace" };

export default async function NewWorkspacePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const error = sp.error === "name" ? "Give the workspace a name." : sp.error;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/app/settings" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Settings
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Create a workspace</CardTitle>
          <CardDescription>
            A workspace holds its own offers, claims ledgers, copy, instruction memory and teammates. Use one per client or brand so evidence never crosses over. You become its owner and can invite people from Members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createWorkspace} className="space-y-4">
            <input type="hidden" name="return_to" value="/app/settings/workspaces/new" />
            <div className="space-y-2">
              <Label htmlFor="name">Workspace name</Label>
              <Input id="name" name="name" required maxLength={80} placeholder="Acme Marketing" autoFocus />
            </div>
            {error && <p className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button asChild variant="ghost"><Link href="/app/settings">Cancel</Link></Button>
              <Button type="submit" className="rounded-full shadow-glow">Create and switch to it</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
