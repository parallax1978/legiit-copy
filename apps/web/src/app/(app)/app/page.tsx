import Link from "next/link";
import { format } from "date-fns";
import { Package, FileText, Activity, Receipt, Plus, PenLine, CheckCircle2 } from "lucide-react";
import { requireWorkspace, getUser, canEdit } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData, formatInt } from "@/lib/data/dashboard";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { StatTile, StatTiles } from "@/components/dashboard/stat-tiles";
import { InProgressList } from "@/components/dashboard/in-progress";
import { RecentDrafts } from "@/components/dashboard/recent-drafts";
import { FirstRunChecklist } from "@/components/dashboard/first-run";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ joined?: string; deleted?: string }> }) {
  const sp = await searchParams;
  const { workspace, role } = await requireWorkspace();
  const user = await getUser();
  const supabase = await createClient();
  const [{ data: profile }, data] = await Promise.all([
    user ? supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    getDashboardData(workspace.id),
  ]);
  const fullName = (profile?.full_name ?? (user?.user_metadata?.full_name as string | undefined) ?? "").trim();
  const firstName = fullName.split(/\s+/)[0] || null;
  const editor = canEdit(role);
  const monthLabel = format(new Date(), "MMMM");
  const showChecklist = !data.checklist.hasGeneration;

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `Hi, ${firstName}` : "Welcome back"}
        description={
          <>
            You are in <span className="font-semibold text-ink">{workspace.name}</span>
            {role !== "owner" && <> as {role === "editor" ? "an editor" : "a viewer"}</>}. Copy here is argued from each offer&apos;s own evidence.
          </>
        }
        actions={
          editor ? (
            <>
              <Button asChild variant="outline" className="rounded-full"><Link href="/app/offers/new"><Plus className="h-4 w-4" /> New offer</Link></Button>
              <Button asChild className="rounded-full shadow-glow"><Link href="/app/generations/new"><PenLine className="h-4 w-4" /> Write copy</Link></Button>
            </>
          ) : undefined
        }
      />

      {sp.joined && (
        <p className="flex items-center gap-2 rounded-md bg-good-soft px-4 py-2.5 text-sm text-good"><CheckCircle2 className="h-4 w-4" /> You joined {workspace.name}.</p>
      )}
      {sp.deleted && (
        <p className="flex items-center gap-2 rounded-md bg-surface-sunken px-4 py-2.5 text-sm text-ink-muted"><CheckCircle2 className="h-4 w-4" /> Workspace deleted. You are now in {workspace.name}.</p>
      )}

      {showChecklist && <FirstRunChecklist checklist={data.checklist} canEdit={editor} />}

      <StatTiles>
        <StatTile label="Offers" value={formatInt(data.offers)} hint="active offers" icon={Package} href="/app/offers" />
        <StatTile label="Copy pieces" value={formatInt(data.piecesThisMonth)} hint={`completed in ${monthLabel}`} icon={FileText} href="/app/generations" />
        <StatTile label="Running now" value={formatInt(data.runningNow)} hint="queued or writing" icon={Activity} accent={data.runningNow > 0} />
        <StatTile label="Awaiting you" value={formatInt(data.awaitingYou)} hint="pieces that need a decision" icon={Receipt} href="/app/generations?status=needs_input" accent={data.awaitingYou > 0} />
      </StatTiles>

      <div className="grid gap-6 lg:grid-cols-2">
        <InProgressList items={data.inProgress} />
        <RecentDrafts drafts={data.recentDrafts} />
      </div>

      {data.inProgress.length > 0 && <AutoRefresh />}
    </div>
  );
}
