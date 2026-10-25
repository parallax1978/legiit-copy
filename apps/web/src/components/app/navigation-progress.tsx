"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A thin bar along the top of the window that starts the moment an internal link is clicked and finishes
 * when the route changes. Server-rendered pages take a moment to arrive; without this a click looks ignored.
 */
export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}

const SAFETY_MS = 20_000;

function Bar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | null>(null);
  const safety = useRef<number | null>(null);
  const route = `${pathname}?${search?.toString() ?? ""}`;
  const started = useRef<string | null>(null);

  const clear = () => {
    if (timer.current) window.clearInterval(timer.current);
    if (safety.current) window.clearTimeout(safety.current);
    timer.current = null;
    safety.current = null;
  };

  const start = (from: string) => {
    if (started.current) return;
    started.current = from;
    setVisible(true);
    setWidth(12);
    clear();
    // creep toward 85% so a slow page still reads as "working"
    timer.current = window.setInterval(() => setWidth((w) => (w < 85 ? w + (85 - w) * 0.08 : w)), 180);
    safety.current = window.setTimeout(() => finish(), SAFETY_MS);
  };

  const finish = () => {
    clear();
    started.current = null;
    setWidth(100);
    window.setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 220);
  };

  // the route changed: whatever was loading has arrived
  useEffect(() => {
    if (started.current && started.current !== route) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.getAttribute("rel")?.includes("external")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const next = `${url.pathname}?${url.searchParams.toString()}`;
      if (next === route || (url.pathname === window.location.pathname && url.hash && url.search === window.location.search)) return;
      start(route);
    };
    const onPop = () => start(route);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]" style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease" }}>
      <div className="h-full bg-brand shadow-[0_0_8px_var(--brand)]" style={{ width: `${width}%`, transition: "width 180ms ease" }} />
    </div>
  );
}
