"use client";
import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserMenu({ user, compact }: { user: { email: string; name: string | null }; compact?: boolean }) {
  const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-sunken", compact && "w-auto")}>
        <Avatar className="h-7 w-7"><AvatarFallback className="bg-brand-faint text-xs font-semibold text-brand-strong">{initials}</AvatarFallback></Avatar>
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{user.name ?? user.email}</span>
            {user.name && <span className="block truncate text-xs text-ink-soft">{user.email}</span>}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs text-ink-muted">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/app/settings/profile"><User className="h-4 w-4" /> Profile</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action="/auth/signout" method="post" className="w-full">
            <button type="submit" className="flex w-full items-center gap-2"><LogOut className="h-4 w-4" /> Sign out</button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
