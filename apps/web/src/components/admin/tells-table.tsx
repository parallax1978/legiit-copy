import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableCard } from "./stat-tile";
import { NON_TELLS, TELLS } from "@engine/tells.ts";

const TIER_LABEL: Record<number, string> = { 0: "Tier 0 · hard reject", 1: "Tier 1 · weight 4", 2: "Tier 2 · density, weight 2", 3: "Tier 3 · weight 1, never alone" };

/** The live rule table the mechanical review runs (docs/04-copy-standard.md §7), read from the engine. */
export function TellsTable() {
  const tiers = [0, 1, 2, 3] as const;
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Score = sum of weights per 300 words. Review flag at 6; hard fail at 10 or any Tier 0 hit. Thresholds were measured on Claude drafts against a human direct response corpus and are recalibrated from the acquired controls.
      </p>
      {tiers.map((tier) => {
        const rows = TELLS.filter((t) => t.tier === tier);
        if (rows.length === 0) return null;
        return (
          <TableCard key={tier}>
            <div className="border-b border-line px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{TIER_LABEL[tier]}</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-56">Tell</TableHead>
                  <TableHead>Example</TableHead>
                  <TableHead>Fix</TableHead>
                  <TableHead className="w-28">Threshold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow key={t.name}>
                    <TableCell className="font-mono text-xs">{t.name}</TableCell>
                    <TableCell className="text-sm text-ink-muted">{t.example}</TableCell>
                    <TableCell className="text-sm">{t.fix}</TableCell>
                    <TableCell className="text-xs text-ink-muted">{t.density_per_1000 ? `> ${t.density_per_1000} / 1,000 words` : t.scope === "structural" ? "structural" : "any hit"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        );
      })}
      <TableCard>
        <div className="border-b border-line px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Never penalized</div>
        <ul className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-2">
          {NON_TELLS.map((n) => (
            <li key={n.name}><span className="font-mono text-xs">{n.name}</span> <span className="text-ink-muted">· {n.why}</span></li>
          ))}
        </ul>
      </TableCard>
    </div>
  );
}
