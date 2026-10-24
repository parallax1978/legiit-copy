"use client";
import { ChevronsUpDown, Plus, Check } from "lucide-react";
import { useTransition } from "react";
import Link from "next/link";
import { switchWorkspace } from "@/lib/actions/workspace";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function WorkspaceSwitcher({ workspaces, currentWorkspaceId }: { workspaces: { id: string; name: string; role: string }[]; currentWorkspaceId: string }) {
  const [pending, start] = useTransition();
  const current = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between rounded-lg" disabled={pending}>
          <span className="truncate text-left">
            <span className="block text-xs text-ink-soft">Workspace</span>
            <span className="block truncate text-sm font-semibold">{current?.name ?? "Workspace"}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {workspaces.map((w) => (
          <DropdownMenuItem key={w.id} onSelect={() => start(() => switchWorkspace(w.id))}>
            <span className="flex-1 truncate">{w.name}</span>
            <span className="text-xs text-ink-soft">{w.role}</span>
            {w.id === currentWorkspaceId && <Check className="h-4 w-4 text-brand" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/settings/workspaces/new"><Plus className="h-4 w-4" /> New workspace</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
