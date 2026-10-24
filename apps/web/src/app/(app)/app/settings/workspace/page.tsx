import { requireWorkspace, getMemberships } from "@/lib/auth";
import { parseInstructionMemory } from "@/lib/data/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceRenameForm } from "@/components/settings/workspace-rename-form";
import { InstructionMemoryEditor } from "@/components/settings/instruction-memory-editor";
import { DeleteWorkspaceDialog } from "@/components/settings/delete-workspace-dialog";

export const metadata = { title: "Workspace" };

export default async function WorkspaceSettingsPage() {
  const { workspace, role } = await requireWorkspace();
  const memberships = await getMemberships();
  const isOwner = role === "owner";
  const memory = parseInstructionMemory(workspace.instruction_memory);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Name and slug</CardTitle>
          <CardDescription>How this workspace appears in the switcher and in exports.</CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceRenameForm workspaceId={workspace.id} name={workspace.name} slug={workspace.slug} canEdit={isOwner} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instruction memory</CardTitle>
          <CardDescription>
            Standing preferences for this workspace: things the writer should always or never do here, learned from the edits you make to drafts or added by hand.
            They apply to every piece written in <span className="font-medium text-ink">{workspace.name}</span> and nowhere else. They never change how Legiit Copy writes for
            any other workspace, and they never override the copy standard: claims stay inside the ledger and proof stays next to its claim.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstructionMemoryEditor workspaceId={workspace.id} items={memory} canEdit={isOwner} />
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="border-bad/30">
          <CardHeader>
            <CardTitle className="text-bad">Danger zone</CardTitle>
            <CardDescription>
              Deleting a workspace removes its offers, ledgers, research, copy, drafts, usage history and members. It cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-muted">You will be asked to type the workspace name to confirm.</p>
            <DeleteWorkspaceDialog workspaceId={workspace.id} name={workspace.name} hasOtherWorkspace={memberships.length > 1} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
