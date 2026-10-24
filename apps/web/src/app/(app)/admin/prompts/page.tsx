import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionButton } from "@/components/admin/action-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { Section, TableCard } from "@/components/admin/stat-tile";
import { PromptVersionForm } from "@/components/admin/prompt-version-form";
import { DiffView } from "@/components/admin/diff-view";
import { TellsTable } from "@/components/admin/tells-table";
import { NativeSelect } from "@/components/admin/form-bits";
import { shortDate, int } from "@/components/admin/fmt";
import { listPromptVersions } from "@/lib/data/admin";
import { activatePromptVersion, deactivatePromptVersion } from "@/lib/actions/admin";
import { STEP_NAMES, STEP_DEFAULTS, type StepName } from "@engine/config.ts";
import { cn } from "@/lib/utils";

export const metadata = { title: "Prompts" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (sp: SP, k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

export default async function PromptsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const requested = one(sp, "step");
  const step: StepName = (STEP_NAMES as readonly string[]).includes(requested ?? "") ? (requested as StepName) : "draft";
  const all = await listPromptVersions();
  const versions = all.filter((v) => v.step === step);
  const active = versions.find((v) => v.active) ?? null;
  const latest = versions[0] ?? null;
  const base = active ?? latest;
  const defaults = STEP_DEFAULTS[step];
  const countByStep = new Map<string, { n: number; active: number | null }>();
  for (const v of all) {
    const cur = countByStep.get(v.step) ?? { n: 0, active: null };
    cur.n++;
    if (v.active) cur.active = v.version;
    countByStep.set(v.step, cur);
  }
  const aId = one(sp, "a");
  const bId = one(sp, "b");
  const a = versions.find((v) => v.id === aId) ?? (versions.length > 1 ? versions[1] : null);
  const b = versions.find((v) => v.id === bId) ?? versions[0] ?? null;
  const showDiff = one(sp, "diff") === "1" && a && b && a.id !== b.id;

  return (
    <>
      <PageHeader title="Prompts" description="One versioned system prompt per step. The active version replaces the step's file prompt; versions are immutable and prompt_versions mirrors the files under engine/prompts." />

      <nav className="mb-6 flex flex-wrap gap-1">
        {STEP_NAMES.map((s) => {
          const c = countByStep.get(s);
          return (
            <Link
              key={s}
              href={`/admin/prompts?step=${s}`}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", s === step ? "border-brand bg-brand-faint text-brand-strong" : "border-line text-ink-muted hover:text-ink")}
            >
              {s}
              {c && (
                <span className="ml-1 text-ink-soft">
                  {c.active ? `v${c.active}` : `${c.n} draft${c.n === 1 ? "" : "s"}`}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <Section
        title={`${step}: versions`}
        description={active ? `v${active.version} is active.` : `No active version; the step runs its file prompt (${defaults.model}, effort ${defaults.effort}, ${int(defaults.maxTokens)} tokens).`}
        actions={
          versions.length > 1 && (
            <form method="get" className="flex flex-wrap items-center gap-2 text-xs">
              <input type="hidden" name="step" value={step} />
              <input type="hidden" name="diff" value="1" />
              <NativeSelect name="a" defaultValue={a?.id} className="h-8 w-auto text-xs" aria-label="From version">
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    from v{v.version}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect name="b" defaultValue={b?.id} className="h-8 w-auto text-xs" aria-label="To version">
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    to v{v.version}
                  </option>
                ))}
              </NativeSelect>
              <Button type="submit" size="sm" variant="outline">
                Diff
              </Button>
            </form>
          )
        }
      >
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Effort</TableHead>
                <TableHead className="text-right">Max tokens</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-ink-soft">
                    No versions for {step} yet. Create one below.
                  </TableCell>
                </TableRow>
              )}
              {versions.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <span className="font-mono text-sm">v{v.version}</span> {v.active && <StatusBadge value="active" className="ml-2" />}
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">template ({int(v.template.length)} chars)</summary>
                      <pre className="mt-2 max-h-80 max-w-3xl overflow-auto whitespace-pre-wrap rounded-md bg-surface-sunken p-3 font-mono text-xs">{v.template}</pre>
                    </details>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{v.model}</TableCell>
                  <TableCell className="text-xs">{v.effort}</TableCell>
                  <TableCell className="text-right text-xs">{int(v.max_tokens)}</TableCell>
                  <TableCell className="max-w-xs text-xs text-ink-muted">{v.notes}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-ink-muted">{shortDate(v.created_at)}</TableCell>
                  <TableCell>
                    {v.active ? (
                      <ActionButton size="sm" variant="outline" action={deactivatePromptVersion.bind(null, v.id)} confirm={`Deactivate ${step} v${v.version}? The step falls back to its file prompt.`}>
                        Deactivate
                      </ActionButton>
                    ) : (
                      <ActionButton size="sm" action={activatePromptVersion.bind(null, v.id)}>
                        Activate
                      </ActionButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      </Section>

      {showDiff && a && b && (
        <Section title={`Diff: v${a.version} → v${b.version}`} description="Line diff of the templates.">
          <DiffView a={a.template} b={b.template} labelA={`v${a.version}`} labelB={`v${b.version}`} />
        </Section>
      )}

      <Section title="Create the next version" description={base ? `Prefilled from v${base.version}.` : "Paste the step's system prompt. Parameters and exemplar paragraphs, never tone adjectives."}>
        <PromptVersionForm
          steps={STEP_NAMES}
          step={step}
          nextVersion={(latest?.version ?? 0) + 1}
          defaults={{
            template: base?.template ?? "",
            model: base?.model ?? defaults.model,
            effort: base?.effort ?? defaults.effort,
            max_tokens: base?.max_tokens ?? defaults.maxTokens,
          }}
        />
      </Section>

      <Section title="Tell detector reference" description="docs/04-copy-standard.md Section 7. The mechanical step scores against this; prompts are built from the same file.">
        <details>
          <summary className="cursor-pointer text-sm text-brand hover:underline">Show the tell checklist</summary>
          <div className="mt-3">
            <TellsTable />
          </div>
        </details>
      </Section>
    </>
  );
}
