import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableCard } from "./stat-tile";

// TODO: replace with `import { TELLS } from "@engine/tells.ts"` once the engine's tell detector lands.
// Mirrors docs/04-copy-standard.md Section 7. Score = sum of weights per 300 words; review flag at 6; hard fail at 10 or any Tier 0 hit.
export const TELLS_FALLBACK = [
  { tier: 0, weight: "hard reject", tell: "Assistant residue", example: "Notes: swap in your product name.", fix: "Delete" },
  { tier: 0, weight: "hard reject", tell: "Bracket placeholder", example: "[Product Name] helps [target audience]", fix: "Fill from the ledger or stop" },
  { tier: 0, weight: "hard reject", tell: "Unledgered authority, study, number, name or credential", example: "A Harvard study found 73% of...", fix: "The ledger item, or cut the claim" },
  { tier: 0, weight: "hard reject", tell: "\"AI\" in copy for a non-AI product", example: "our AI-powered approach", fix: "Describe the mechanism" },
  { tier: 0, weight: "hard reject", tell: "Bold-label-colon bullets, markdown headings or emoji bullets in email, sales page or VSL", example: "**Speed:** get reports in minutes", fix: "A sentence with the claim and its carrier" },
  { tier: 1, weight: 4, tell: "designed to / built for / crafted / tailored", example: "designed to help busy founders", fix: "Say what it does" },
  { tier: 1, weight: 4, tell: "\"That's why we built\"", example: "That's why we built Reportly.", fix: "A reason-why turn: discovery, failed fixes, cause" },
  { tier: 1, weight: 4, tell: "cancel anytime / no contracts / no setup fees", example: "the triad", fix: "The denominated guarantee, once" },
  { tier: 1, weight: 4, tell: "\"You're not alone\" / \"If that sounds familiar\"", example: "If that sounds familiar, you're not alone.", fix: "A quoted verbatim from the research" },
  { tier: 1, weight: 4, tell: "less than a cup of coffee", example: "for less than your daily latte", fix: "A comparable comparison with the full price stated" },
  { tier: 1, weight: 4, tell: "\"In the next few minutes I'll show you exactly\" / \"Stay with me\"", example: "VSL opener", fix: "The interrupt tied to the promise" },
  { tier: 1, weight: 4, tell: "Summary closer", example: "In short, X gives you A, B and C.", fix: "The CTA and what happens after the click" },
  { tier: 1, weight: 4, tell: "Self-posed question header", example: "### Why only $49?", fix: "A crosshead that states the answer" },
  { tier: 2, weight: 2, tell: "Rule of three above 3 per 1,000 words", example: "faster, cheaper, better", fix: "Break the third item or add a fourth with a number" },
  { tier: 2, weight: 2, tell: "Trailing participles above 0.6 per 1,000", example: ", giving you...", fix: "A new sentence with a subject" },
  { tier: 2, weight: 2, tell: "Hedges in body copy above 1 per 1,000", example: "usually, often, may", fix: "State the claim at the ledger grade" },
  { tier: 2, weight: 2, tell: "actually / exactly / every single above 2 per 1,000", example: "exactly what you need", fix: "Cut" },
  { tier: 2, weight: 2, tell: "Anaphora triads and \"No X. No Y. Just Z.\"", example: "No fluff. No filler. Just results.", fix: "One plain sentence" },
  { tier: 2, weight: 2, tell: "\"rather than\" above 2 per 300 words", example: "rather than guessing", fix: "Cut or restate" },
  { tier: 2, weight: 2, tell: "Generic emotion words as the only emotional content", example: "frustrated, overwhelmed, juggling", fix: "Replace with the consequence scene" },
  { tier: 2, weight: 2, tell: "\"Imagine...\" or a question opener with no specific on the next line", example: "Imagine waking up...", fix: "Answer it or cut it" },
  { tier: 2, weight: 2, tell: "Negative parallelism above 1 per 1,000", example: "It's not X. It's Y.", fix: "Allowed only when it corrects a belief the reader holds" },
  { tier: 2, weight: 2, tell: "\"Most X don't ... because A. They ... because B.\"", example: "Most founders don't fail because...", fix: "A claim with a carrier" },
  { tier: 3, weight: 1, tell: "4o-era phrases", example: "game-changer, Picture this, Here's the kicker", fix: "Never alone; cut" },
  { tier: 3, weight: 1, tell: "Marketing vocabulary", example: "unlock, elevate, seamless, streamline, effortless, cutting-edge, journey, to the next level", fix: "Never alone; cut" },
] as const;

export const NOT_TELLS = ["exclamation marks", "ellipses", "ALL-CAPS words", "fragments", "Here's what / how / why", "Dear Friend", "P.S.", "not just X but Y at human rates", "em dashes at or below 1.6 per 1,000 words", "superlatives with proof"];

export function TellsTable() {
  return (
    <div className="space-y-3">
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Tier</TableHead>
              <TableHead className="w-24">Weight</TableHead>
              <TableHead>Tell</TableHead>
              <TableHead>Example</TableHead>
              <TableHead>Fix</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TELLS_FALLBACK.map((t, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">{t.tier}</TableCell>
                <TableCell className="text-xs">{t.weight}</TableCell>
                <TableCell className="text-sm font-medium">{t.tell}</TableCell>
                <TableCell className="text-xs text-ink-muted">{t.example}</TableCell>
                <TableCell className="text-xs text-ink-muted">{t.fix}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
      <p className="text-xs text-ink-muted">
        <span className="font-semibold text-ink">Never penalized:</span> {NOT_TELLS.join("; ")}. Thresholds were measured on Claude drafts and must be recalibrated on the human control corpus before enforcement.
      </p>
    </div>
  );
}
