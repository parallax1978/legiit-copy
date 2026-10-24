"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setHoldout } from "@/lib/actions/admin";

export function HoldoutSwitch({ id, holdout }: { id: string; holdout: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Switch
      checked={holdout}
      disabled={pending}
      aria-label="Reserve for judge calibration"
      onCheckedChange={(next) =>
        start(async () => {
          const r = await setHoldout(id, next);
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
          router.refresh();
        })
      }
    />
  );
}
