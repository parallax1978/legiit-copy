"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { runJudgeOnHoldout } from "@/lib/actions/admin";
import type { SplitTestPairRow } from "@/lib/data/admin";
import { TableCard } from "./stat-tile";
import { truncate } from "./fmt";

export function JudgeHoldoutForm({ pairs }: { pairs: SplitTestPairRow[] }) {
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set(pairs.map((p) => p.id)));
  const [pending, setPending] = React.useState(false);
  const router = useRouter();
  const all = selected.size === pairs.length && pairs.length > 0;

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function run() {
    setPending(true);
    try {
      const r = await runJudgeOnHoldout([...selected]);
      if (r.ok) toast.success(r.message ?? "Judge finished");
      else toast.error(r.error);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-muted">
          {pairs.length} holdout pair(s). The judge never sees these in prompts; its pick is scored against the documented winner and stored in judge_calibrations.
        </p>
        <Button onClick={run} disabled={pending || selected.size === 0} size="sm">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />} Run judge on {selected.size} pair(s)
        </Button>
      </div>
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={all} aria-label="Select all" onCheckedChange={(c) => setSelected(c ? new Set(pairs.map((p) => p.id)) : new Set())} />
              </TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Element</TableHead>
              <TableHead>Variant A</TableHead>
              <TableHead>Variant B</TableHead>
              <TableHead>Winner</TableHead>
              <TableHead>Lift</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pairs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-sm text-ink-soft">
                  No holdout pairs. Reserve some on the Controls page (holdout toggle).
                </TableCell>
              </TableRow>
            )}
            {pairs.map((p) => (
              <TableRow key={p.id} data-state={selected.has(p.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} aria-label="Select pair" />
                </TableCell>
                <TableCell className="font-mono text-xs">{p.format}</TableCell>
                <TableCell className="text-xs">{p.element_tested}</TableCell>
                <TableCell className="max-w-xs text-xs text-ink-muted">{truncate(p.variant_a, 90)}</TableCell>
                <TableCell className="max-w-xs text-xs text-ink-muted">{truncate(p.variant_b, 90)}</TableCell>
                <TableCell className="font-mono text-xs uppercase">{p.winner}</TableCell>
                <TableCell className="text-xs">{truncate(p.lift, 30)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
    </div>
  );
}
