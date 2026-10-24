"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-renders the server component tree every few seconds while mounted (used while generations are running). */
export function AutoRefresh({ everyMs = 8000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs]);
  return null;
}
