"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { refreshResearch } from "@/lib/actions/offers";
import { cn } from "@/lib/utils";
import { titleCase } from "./constants";
import { GradeBadge } from "./badges";
import { Dl, SectionCard } from "./fields";
import { normalizeDossier, type OfferResearchRow, type DossierView } from "./normalize";

const POLL_MS = 6000;
const MAX_WAIT_MS = 8 * 60 * 1000;

export function ResearchDossier({ offerId, research, editable }: { offerId: string; research: OfferResearchRow[]; editable: boolean }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(research.find((r) => r.active)?.id ?? research[0]?.id ?? null);
  const [running, setRunning] = useState(false);
  const [pending, start] = useTransition();
  const startedAt = useRef<number | null>(null);
  const versionsAtStart = useRef<number>(research.length);
  const row = research.find((r) => r.id === selectedId) ?? research[0] ?? null;
  const dossier = row ? normalizeDossier(row.dossier) : null;

  // While a refresh runs, poll until a new version lands or the wait is up.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      if (startedAt.current && Date.now() - startedAt.current > MAX_WAIT_MS) {
        setRunning(false);
        toast.info("Still working. The new dossier appears here when it is done.");
        return;
      }
      router.refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [running, router]);
  useEffect(() => {
    if (running && research.length > versionsAtStart.current) {
      setRunning(false);
      const active = research.find((r) => r.active) ?? research[0];
      if (active) setSelectedId(active.id);
      toast.success(`Research v${research[0]?.version ?? ""} is ready.`);
    }
  }, [research, running]);

  function refresh() {
    start(async () => {
      const r = await refreshResearch(offerId);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      versionsAtStart.current = research.length;
      startedAt.current = Date.now();
      setRunning(true);
      toast.success("Research started. Verbatims are mined from reviews, forums and competitor pages; this takes a few minutes.");
    });
  }

  const refreshButton = editable && (
    <Button size="sm" onClick={refresh} disabled={pending || running}>
      {pending || running ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
      {running ? "Researching…" : research.length ? "Refresh research" : "Run research"}
    </Button>
  );

  if (!row || !dossier) {
    return (
      <SectionCard title="No research yet" description="The dossier collects what customers say in their own words, what competitors claim, where the market sits on awareness and sophistication, and what proof exists. It is generated once per offer and refreshable." actions={refreshButton}>
        <p className="text-sm text-ink-muted">{running ? "Running. This page updates itself when the dossier is ready." : "Research runs automatically the first time you write copy, or start it now."}</p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          {research.length > 1 ? (
            <Select value={row.id} onValueChange={setSelectedId}>
              <SelectTrigger size="sm" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {research.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    v{r.version} · {new Date(r.created_at).toLocaleDateString()}
                    {r.active ? " (active)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span>
              v{row.version} · {new Date(row.created_at).toLocaleString()}
            </span>
          )}
          <span className="text-xs text-ink-soft">
            {row.active ? "Active version, used by the writer" : "Older version"}
            {row.model ? ` · ${row.model}` : ""}
          </span>
        </div>
        {refreshButton}
      </div>

      <Tabs defaultValue="verbatims" className="gap-4">
        <TabsList variant="line" className="h-auto! w-full flex-wrap justify-start gap-0 rounded-none border-b border-line p-0">
          {[
            ["verbatims", `Verbatims ${dossier.verbatims.length}`],
            ["themes", `Themes ${dossier.themes.length}`],
            ["competitors", `Competitors ${dossier.competitor_table.length}`],
            ["awareness", "Awareness"],
            ["sophistication", "Sophistication"],
            ["proof", `Proof ${dossier.proof_inventory.length}`],
            ["objections", `Objections ${dossier.objection_map.length}`],
            ["emotion", "Emotion & forces"],
            ["stories", `Stories ${dossier.story_inventory.length}`],
            ["sources", `Sources ${dossier.sources.length}`],
          ].map(([k, label]) => (
            <TabsTrigger key={k} value={k} className="h-auto flex-none px-3 py-2 data-[state=active]:text-brand-strong after:bg-brand">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="verbatims">
          <Verbatims d={dossier} />
        </TabsContent>
        <TabsContent value="themes">
          <Themes d={dossier} />
        </TabsContent>
        <TabsContent value="competitors">
          <Competitors d={dossier} />
        </TabsContent>
        <TabsContent value="awareness">
          <SectionCard title="Awareness by segment" description="Where each traffic source already stands. The lead type depends on it.">
            {dossier.awareness_by_segment.length === 0 ? (
              <Empty />
            ) : (
              <ul className="divide-y divide-line">
                {dossier.awareness_by_segment.map((s, i) => (
                  <li key={i} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-6">
                    <div className="sm:w-56">
                      <p className="text-sm font-medium text-ink">{s.label}</p>
                      <p className="text-xs text-ink-soft">{titleCase(s.traffic)} traffic</p>
                    </div>
                    <div className="flex-1">
                      <span className="rounded-md bg-brand-faint px-2 py-0.5 text-xs font-medium text-brand-strong">{titleCase(s.awareness)}</span>
                      <p className="mt-1 text-sm text-ink-muted">{s.evidence}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>
        <TabsContent value="sophistication">
          <SectionCard title="Market sophistication" description="How many times this market has heard the promise. Stage 1 states it; stage 5 must identify with the reader.">
            {dossier.sophistication ? (
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-card bg-brand-faint text-2xl font-bold text-brand-strong">{dossier.sophistication.stage === "unknown" ? "?" : dossier.sophistication.stage}</div>
                <div>
                  <p className="text-sm font-medium text-ink">Stage {dossier.sophistication.stage}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">{dossier.sophistication.evidence}</p>
                </div>
              </div>
            ) : (
              <Empty />
            )}
          </SectionCard>
        </TabsContent>
        <TabsContent value="proof">
          <SectionCard title="Proof inventory" description="Every piece of evidence found, graded. A ledger ref means it is already a claims row.">
            {dossier.proof_inventory.length === 0 ? (
              <Empty />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dossier.proof_inventory.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="min-w-[220px] whitespace-normal align-top text-sm">
                          {p.claim}
                          {p.quote && <p className="mt-1 text-xs text-ink-muted">“{p.quote}”</p>}
                          {p.ledger_ref && <p className="mt-1 text-[11px] text-brand-strong">ledger {p.ledger_ref}</p>}
                        </TableCell>
                        <TableCell className="align-top text-xs text-ink-muted">{titleCase(p.evidence_type)}</TableCell>
                        <TableCell className="align-top text-center">
                          <GradeBadge grade={p.grade} />
                        </TableCell>
                        <TableCell className="max-w-[220px] whitespace-normal align-top text-xs">
                          <SourceLink s={p.source} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>
        </TabsContent>
        <TabsContent value="objections">
          <SectionCard title="Objection map" description="Reasons not to buy, in the order the copy must answer them. Each links to the verbatims it came from.">
            {dossier.objection_map.length === 0 ? (
              <Empty />
            ) : (
              <ol className="list-decimal space-y-2 pl-5">
                {dossier.objection_map.map((o, i) => (
                  <li key={i} className="text-sm text-ink">
                    {o.text}
                    {o.verbatim_ids.length > 0 && <span className="ml-2 text-xs text-ink-soft">{o.verbatim_ids.length} verbatim{o.verbatim_ids.length > 1 ? "s" : ""}</span>}
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </TabsContent>
        <TabsContent value="emotion">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Resident emotion" description="The feeling already in the reader before the copy starts. Copy channels it; it never has to create it.">
              {dossier.resident_emotion ? (
                <>
                  <p className="text-lg font-semibold text-ink">{dossier.resident_emotion.emotion}</p>
                  <p className="mt-1 text-sm text-ink-muted">{dossier.resident_emotion.evidence}</p>
                  <p className="mt-2 text-xs text-ink-soft">{dossier.resident_emotion.verbatim_ids.length} supporting verbatims</p>
                </>
              ) : (
                <Empty />
              )}
            </SectionCard>
            <SectionCard title="Forces" description="Push away from the present, pull toward the new, anxiety about switching, habit holding them back.">
              {dossier.forces ? (
                <Dl
                  items={[
                    { label: `Push${dossier.forces.dominant === "push" ? " (dominant)" : ""}`, value: dossier.forces.push },
                    { label: `Pull${dossier.forces.dominant === "pull" ? " (dominant)" : ""}`, value: dossier.forces.pull },
                    { label: `Anxiety${dossier.forces.dominant === "anxiety" ? " (dominant)" : ""}`, value: dossier.forces.anxiety },
                    { label: `Habit${dossier.forces.dominant === "habit" ? " (dominant)" : ""}`, value: dossier.forces.habit },
                  ]}
                  className="sm:grid-cols-1"
                />
              ) : (
                <Empty />
              )}
            </SectionCard>
            <SectionCard title="Speaker and experience" className="lg:col-span-2">
              <Dl
                items={[
                  { label: "Speaker", value: dossier.speaker ? [dossier.speaker.name, dossier.speaker.role].filter(Boolean).join(", ") || null : null },
                  { label: "Speaker's stake", value: dossier.speaker?.stake ?? null },
                  { label: "First week experience", value: dossier.first_week_experience },
                  { label: "Refund history", value: dossier.refund_history },
                ]}
              />
              {dossier.unsourced_hypotheses.length > 0 && (
                <div className="mt-4 rounded-md bg-warn-soft/60 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-warn">Unsourced hypotheses</p>
                  <p className="mb-1.5 text-xs text-ink-muted">Not backed by a verbatim. Any single quote outranks these.</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
                    {dossier.unsourced_hypotheses.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
            </SectionCard>
          </div>
        </TabsContent>
        <TabsContent value="stories">
          <SectionCard title="Story inventory" description="Events that actually happened, with dates, numbers and people. Only these may become narrative in the copy.">
            {dossier.story_inventory.length === 0 ? (
              <Empty />
            ) : (
              <ul className="divide-y divide-line">
                {dossier.story_inventory.map((s, i) => (
                  <li key={i} className="py-3">
                    <p className="text-sm text-ink">{s.event}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{[s.date, s.numbers, s.people].filter(Boolean).join(" · ")}</p>
                    {s.source && (
                      <p className="mt-0.5 text-xs">
                        <SourceLink s={s.source} />
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>
        <TabsContent value="sources">
          <SectionCard title="Sources" description="Everything the research read.">
            {dossier.sources.length === 0 ? (
              <Empty />
            ) : (
              <ul className="divide-y divide-line">
                {dossier.sources.map((s, i) => (
                  <li key={i} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-24 shrink-0 text-xs text-ink-soft">{s.kind ? titleCase(s.kind) : "page"}</span>
                    <a href={s.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-ink hover:text-brand">
                      {s.title ?? s.url}
                    </a>
                    <ExternalLink className="size-3.5 shrink-0 text-ink-soft" />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-ink-soft">Nothing recorded in this version.</p>;
}

function SourceLink({ s }: { s: string | null }) {
  if (!s) return <span className="text-ink-soft">—</span>;
  if (/^https?:\/\//.test(s))
    return (
      <a href={s} target="_blank" rel="noreferrer" className="break-all text-ink underline decoration-line-strong hover:text-brand">
        {s}
      </a>
    );
  return <span className="text-ink">{s}</span>;
}

function Verbatims({ d }: { d: DossierView }) {
  const [tag, setTag] = useState<string>("all");
  const [cluster, setCluster] = useState<string>("all");
  const tags = Array.from(new Set(d.verbatims.flatMap((v) => v.tags))).sort();
  const clusters = Array.from(new Set(d.verbatims.map((v) => v.desire_cluster).filter((c): c is string => !!c))).sort();
  const rows = d.verbatims.filter((v) => (tag === "all" || v.tags.includes(tag as (typeof v.tags)[number])) && (cluster === "all" || v.desire_cluster === cluster));
  return (
    <SectionCard
      title="Verbatims"
      description="Exact wording, never paraphrased. The argument and the lead are chosen from these."
      actions={
        <>
          {tags.length > 0 && (
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t} value={t}>
                    {titleCase(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {clusters.length > 0 && (
            <Select value={cluster} onValueChange={setCluster}>
              <SelectTrigger size="sm" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clusters</SelectItem>
                {clusters.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </>
      }
    >
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[320px]">Quote</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Cluster</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="whitespace-normal align-top text-sm text-ink">
                    {v.text}
                    <span className="mt-1 block text-[11px] text-ink-soft">
                      {v.id}
                      {v.speaker_role ? ` · ${v.speaker_role}` : ""}
                      {v.date ? ` · ${v.date}` : ""}
                      {v.intensity_marker ? " · intensity" : ""}
                      {v.duration_marker ? " · duration" : ""}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] whitespace-normal align-top text-xs">
                    <span className="text-ink-muted">{titleCase(v.source_type)}</span>
                    {v.source_url && (
                      <a href={v.source_url} target="_blank" rel="noreferrer" className="mt-0.5 block truncate text-ink underline decoration-line-strong hover:text-brand">
                        {v.source_url}
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex max-w-[180px] flex-wrap gap-1">
                      {v.tags.map((t) => (
                        <span key={t} className={cn("rounded-md px-1.5 py-px text-[11px]", t === "objection" ? "bg-bad-soft text-bad" : t === "desire" ? "bg-good-soft text-good" : "bg-surface-sunken text-ink-muted")}>
                          {titleCase(t)}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-xs text-ink-muted">{v.desire_cluster ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  );
}

function Themes({ d }: { d: DossierView }) {
  const byId = new Map(d.verbatims.map((v) => [v.id, v]));
  return (
    <SectionCard title="Themes" description="Clusters of verbatims. Confidence is low when fewer than three exact quotes support a theme.">
      {d.themes.length === 0 ? (
        <Empty />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {d.themes
            .slice()
            .sort((a, b) => b.count - a.count)
            .map((t, i) => (
              <li key={i} className="rounded-md border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{t.name}</p>
                  <span className={cn("rounded-full px-2 py-px text-[11px] font-medium", t.confidence === "high" ? "bg-good-soft text-good" : t.confidence === "medium" ? "bg-warn-soft text-warn" : "bg-surface-sunken text-ink-muted")}>{t.confidence} · {t.count}</span>
                </div>
                <p className="mt-0.5 text-xs text-ink-soft">{titleCase(t.tag)}</p>
                <ul className="mt-2 space-y-1">
                  {t.verbatim_ids.slice(0, 3).map((id) => {
                    const v = byId.get(id);
                    return v ? (
                      <li key={id} className="border-l-2 border-brand-soft pl-2 text-xs text-ink-muted">
                        {v.text}
                      </li>
                    ) : null;
                  })}
                </ul>
              </li>
            ))}
        </ul>
      )}
    </SectionCard>
  );
}

function Competitors({ d }: { d: DossierView }) {
  return (
    <SectionCard title="Competitors" description="What the alternatives claim and whether our hero copy would still read true under their logo.">
      {d.logo_swap_result && (
        <div className={cn("mb-4 rounded-md p-3 text-sm", d.competitor_table.some((c) => c.logo_swap_passes) ? "bg-bad-soft/50 text-ink" : "bg-good-soft/60 text-ink")}>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Logo-swap result</p>
          <p className="mt-0.5">{d.logo_swap_result}</p>
        </div>
      )}
      {d.competitor_table.length === 0 ? (
        <Empty />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competitor</TableHead>
                <TableHead>Category / audience</TableHead>
                <TableHead>Headline outcome</TableHead>
                <TableHead>Top claims</TableHead>
                <TableHead className="whitespace-nowrap">Mechanism</TableHead>
                <TableHead className="whitespace-nowrap">Logo swap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.competitor_table.map((c, i) => (
                <TableRow key={i}>
                  <TableCell className="align-top text-sm font-medium text-ink">
                    {c.url ? (
                      <a href={c.url} target="_blank" rel="noreferrer" className="hover:text-brand">
                        {c.name}
                      </a>
                    ) : (
                      c.name
                    )}
                  </TableCell>
                  <TableCell className="min-w-[160px] whitespace-normal align-top text-xs text-ink-muted">
                    {c.category_claimed}
                    {c.audience && <p className="text-ink-soft">{c.audience}</p>}
                  </TableCell>
                  <TableCell className="min-w-[180px] whitespace-normal align-top text-sm text-ink">{c.headline_outcome ?? "—"}</TableCell>
                  <TableCell className="min-w-[220px] whitespace-normal align-top text-xs">
                    <ul className="space-y-1">
                      {c.top_claims.map((tc, j) => (
                        <li key={j}>
                          <span className="text-ink">{tc.claim}</span>
                          {tc.proof && <span className="text-ink-soft"> — {tc.proof}</span>}
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className="align-top text-xs">{c.mechanism_named ? <span className="text-good">named</span> : <span className="text-ink-soft">none</span>}</TableCell>
                  <TableCell className="align-top text-xs">{c.logo_swap_passes ? <span className="font-medium text-bad">passes (bad)</span> : <span className="text-good">fails (good)</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  );
}
