"use client";
import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface LiveOptions {
  /** Refresh on changes to these generation ids (and their steps and flags). */
  generationId?: string;
  /** Refresh on any change to generations in this workspace (the list page). */
  workspaceId?: string;
  /** Poll every 10s while true (fallback when Realtime is unavailable). */
  polling: boolean;
  intervalMs?: number;
}

/**
 * Keeps a server-rendered page current: subscribes to postgres_changes with the browser client and re-runs the
 * server components through router.refresh() (client state such as edit mode survives), with a 10s poll as fallback.
 */
export function useLiveRefresh({ generationId, workspaceId, polling, intervalMs = 10_000 }: LiveOptions) {
  const router = useRouter();
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    if (pending.current) return;
    pending.current = setTimeout(() => {
      pending.current = null;
      router.refresh();
    }, 400);
  }, [router]);

  useEffect(() => {
    if (!generationId && !workspaceId) return;
    const supabase = createClient();
    let channel = supabase.channel(`live:${generationId ?? workspaceId}`);
    if (generationId) {
      channel = channel
        .on("postgres_changes", { event: "*", schema: "public", table: "generations", filter: `id=eq.${generationId}` }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "generation_steps", filter: `generation_id=eq.${generationId}` }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "draft_flags", filter: `generation_id=eq.${generationId}` }, refresh);
    } else if (workspaceId) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table: "generations", filter: `workspace_id=eq.${workspaceId}` }, refresh);
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [generationId, workspaceId, refresh]);

  useEffect(() => {
    if (!polling) return;
    const t = setInterval(refresh, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [polling, intervalMs, refresh]);

  return refresh;
}

export function LiveRefresh(props: LiveOptions) {
  useLiveRefresh(props);
  return null;
}
