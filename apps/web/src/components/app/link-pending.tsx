"use client";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** A small spinner that appears inside a <Link> while its navigation is in flight. Must be rendered as a child of the Link. */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 className={cn("h-3.5 w-3.5 animate-spin text-ink-soft", className)} aria-label="Loading" />;
}
