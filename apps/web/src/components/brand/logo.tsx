import { cn } from "@/lib/utils";

/** Gradient tile with a pen nib, matching the Legiit Leads / Legiit Keywords product marks. */
export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn("brand-gradient inline-flex shrink-0 items-center justify-center rounded-lg text-white shadow-glow", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    </span>
  );
}

export function Wordmark({ className, size = 15 }: { className?: string; size?: number }) {
  return (
    <span className={cn("font-bold tracking-tight text-ink", className)} style={{ fontSize: size }}>
      Legiit<span className="text-brand">Copy</span>
    </span>
  );
}

export function Logo({ className, markSize = 28, textSize = 15 }: { className?: string; markSize?: number; textSize?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={markSize} />
      <Wordmark size={textSize} />
    </span>
  );
}
