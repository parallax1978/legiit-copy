"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/data/admin";

type ButtonProps = React.ComponentProps<typeof Button>;

export interface ActionButtonProps extends Omit<ButtonProps, "onClick"> {
  /** Server action to run on click. Return value is toasted. */
  action: () => Promise<ActionResult<unknown>>;
  /** Ask before running. */
  confirm?: string;
  /** Called after a successful action (the router is refreshed either way). */
  onDone?: (result: ActionResult<unknown>) => void;
  pendingLabel?: string;
}

/** A button that calls a server action, toasts the result and refreshes the route. */
export function ActionButton({ action, confirm: confirmText, onDone, pendingLabel, children, disabled, ...props }: ActionButtonProps) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      {...props}
      disabled={disabled || pending}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        start(async () => {
          try {
            const result = await action();
            if (result.ok) toast.success(result.message ?? "Done");
            else toast.error(result.error);
            router.refresh();
            onDone?.(result);
          } catch (e) {
            // redirect() inside an action throws; let Next handle it
            if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
            toast.error(e instanceof Error ? e.message : "Something went wrong");
          }
        });
      }}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
