"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Save, X, Loader2, Eye, History, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DraftRow, GenerationDetail } from "@/lib/data/generations";
import { formatName, isMultiItem } from "@/lib/formats";
import { saveDraftVersion } from "@/lib/actions/generations";
import { LedgerProvider } from "@/components/editor/ledger-chip";
import { SectionList, BlockView } from "@/components/editor/block-renderer";
import { CopyEditor } from "@/components/editor/copy-editor";
import { SelectionToolbar } from "@/components/editor/selection-toolbar";
import { RewriteDialog, type RewriteTarget } from "@/components/editor/rewrite-dialog";
import { readDraftOutput, groupItems, draftToMarkdown, sectionsToMarkdown, ledgerIdsInDraft, type DraftItem } from "@/components/editor/markdown-blocks";
import { ArgumentPanel } from "./panel-argument";
import { ReviewPanel } from "./panel-review";
import { FlagsPanel, flagsForDraft } from "./panel-flags";
import { SourcesPanel } from "./panel-sources";
import { VersionsPanel } from "./panel-versions";
import { AttentionPanel, collectAttention, attentionCount } from "./panel-attention";
import { ExportMenu } from "./export-menu";
import { FeedbackButtons } from "./feedback-buttons";
import { ReportResultDialog } from "./report-result-dialog";
import { StepTimeline } from "./step-timeline";

const ORIGIN_LABEL: Record<string, string> = { system: "engine draft", revise: "revision", rewrite: "rewrite", user: "your edit", challenger: "challenger" };

export function EditorPage({ detail, canEdit, notice }: { detail: GenerationDetail; canEdit: boolean; notice?: React.ReactNode }) {
  const router = useRouter();
  const { generation, drafts } = detail;
  const latest = useMemo(() => (drafts.length ? drafts.reduce((a, b) => (b.version > a.version ? b : a)) : null), [drafts]);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const current: DraftRow | null = (pinnedId ? drafts.find((d) => d.id === pinnedId) : null) ?? latest;
  const draft = useMemo(() => (current ? readDraftOutput(current.blocks) : null), [current]);
  const fullMarkdown = useMemo(() => (current ? (current.markdown?.trim() ? current.markdown : draft ? draftToMarkdown(draft) : "") : ""), [current, draft]);

  const items: DraftItem[] = useMemo(() => (draft && isMultiItem(generation.format) ? groupItems(draft) : []), [draft, generation.format]);
  const multi = items.length > 1;
  const [itemKey, setItemKey] = useState<string>("all");
  useEffect(() => {
    if (itemKey !== "all" && !items.some((i) => i.key === itemKey)) setItemKey("all");
  }, [items, itemKey]);
  const activeItem = itemKey === "all" ? null : items.find((i) => i.key === itemKey) ?? null;
  const visibleSections = activeItem ? activeItem.sections : draft?.sections ?? [];

  const ledgerIds = useMemo(() => (draft ? ledgerIdsInDraft(draft) : []), [draft]);
  const [showLedger, setShowLedger] = useState(true);
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState(fullMarkdown);
  const [saving, startSave] = useTransition();
  const [rewrite, setRewrite] = useState<RewriteTarget | null>(null);
  const readRef = useRef<HTMLDivElement>(null);

  const attention = useMemo(() => collectAttention(detail, current), [detail, current]);
  const nAttention = attentionCount(attention);
  const openFlags = flagsForDraft(detail.flags, drafts, current).flags.filter((f) => f.decision === "pending");
  const pendingFlags = openFlags.length;
  // only an engine fabrication counts in red; every other flag is the user's call, not a defect
  const pendingFab = openFlags.some((f) => f.kind === "fabrication");
  const [tab, setTab] = useState<string>(nAttention > 0 ? "attention" : "argument");
  const prediction = detail.predictions[detail.predictions.length - 1] ?? null;

  const startEditing = () => {
    setEdited(fullMarkdown);
    setEditing(true);
  };
  const save = () =>
    startSave(async () => {
      const res = await saveDraftVersion(generation.id, edited, "Edited in the editor");
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Saved as version ${res.version}`);
      setPinnedId(null);
      setEditing(false);
      router.refresh();
    });

  if (!current || !draft) {
    return <div className="rounded-card border border-dashed border-line-strong bg-surface p-10 text-center text-sm text-ink-muted">No draft has been written yet.</div>;
  }

  const wordCount = current.word_count ?? draft.word_count;
  const isLatest = current.id === latest?.id;
  const fileBase = `${detail.offer?.name ?? "copy"} ${formatName(generation.format)} v${current.version}`;

  return (
    <TooltipProvider>
      <LedgerProvider claims={detail.claims} orderedIds={ledgerIds} offerId={detail.offer?.id ?? null} show={showLedger}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            {notice}
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface px-3 py-2 shadow-card">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                <span className="font-semibold text-ink">v{current.version}</span>
                <span className="text-ink-muted">{ORIGIN_LABEL[current.origin] ?? current.origin}{current.label ? ` · ${current.label}` : ""}</span>
                {wordCount ? <span className="text-xs text-ink-soft">· {wordCount.toLocaleString()} words</span> : null}
                {!isLatest && latest && (
                  <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-brand-strong hover:underline" onClick={() => setPinnedId(null)}>
                    <History className="h-3 w-3" /> Back to latest (v{latest.version})
                  </button>
                )}
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {!editing && (
                  <div className="flex items-center gap-1.5">
                    <Switch id="ledger-toggle" checked={showLedger} onCheckedChange={setShowLedger} aria-label="Show ledger references" />
                    <Label htmlFor="ledger-toggle" className="text-xs text-ink-muted">Show evidence</Label>
                  </div>
                )}
                {canEdit && !editing && (
                  <Button size="sm" variant="outline" onClick={startEditing}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                )}
                {editing && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}><X className="h-3.5 w-3.5" /> Cancel</Button>
                    <Button size="sm" onClick={save} disabled={saving || edited.trim() === fullMarkdown.trim()}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save as new version</Button>
                  </>
                )}
                {!editing && (
                  <ExportMenu
                    draftId={current.id}
                    fileBase={fileBase}
                    all={{ label: "all", markdown: fullMarkdown }}
                    item={activeItem ? { label: activeItem.label, markdown: sectionsToMarkdown(activeItem.sections), sectionIds: activeItem.sections.map((s) => s.section_id) } : null}
                  />
                )}
                {!editing && <FeedbackButtons draftId={current.id} existing={detail.feedback} canEdit={canEdit} />}
                {!editing && <ReportResultDialog generationId={generation.id} prediction={prediction} canEdit={canEdit} />}
              </div>
            </div>

            {multi && !editing && (
              <div className="mb-3 flex flex-wrap gap-1 border-b border-line">
                {[{ key: "all", label: `All ${items.length}` }, ...items.map((i) => ({ key: i.key, label: i.label }))].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setItemKey(t.key)}
                    className={cn("-mb-px max-w-[220px] truncate border-b-2 px-3 py-1.5 text-sm", itemKey === t.key ? "border-brand font-medium text-brand-strong" : "border-transparent text-ink-muted hover:text-ink")}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-8">
              {editing ? (
                <>
                  {multi && <p className="mb-3 rounded bg-surface-alt px-3 py-1.5 text-xs text-ink-muted">Editing the whole draft. Items are separated by their section markers.</p>}
                  <CopyEditor
                    key={current.id}
                    initialMarkdown={fullMarkdown}
                    onChange={setEdited}
                    onRewriteSelection={canEdit ? (text) => setRewrite({ draftId: current.id, selectedText: text, blockId: null }) : undefined}
                  />
                </>
              ) : (
                <div ref={readRef} className="relative">
                  <SectionList sections={visibleSections} showSectionTitles={!multi || !!activeItem} />
                  {canEdit && isLatest && <SelectionToolbar containerRef={readRef} enabled={!editing} onRewrite={(sel) => setRewrite({ draftId: current.id, selectedText: sel.text, blockId: sel.blockId })} />}
                </div>
              )}
            </div>

            {!editing && draft.leads && draft.leads.length > 0 && (
              <details className="mt-4 rounded-card border border-line bg-surface shadow-card">
                <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-ink">
                  Alternative leads ({draft.leads.length}){draft.chosen_lead_id ? <span className="ml-2 text-xs font-normal text-ink-muted">chosen: {draft.chosen_lead_id}</span> : null}
                </summary>
                <div className="grid gap-4 border-t border-line p-5 md:grid-cols-3">
                  {draft.leads.map((l) => (
                    <div key={l.id} className={cn("rounded-lg border p-3", l.id === draft.chosen_lead_id ? "border-brand bg-brand-faint/30" : "border-line")}>
                      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                        <span>{l.lead_type.replace(/_/g, " ")} lead</span>
                        {l.id === draft.chosen_lead_id && <span className="text-brand-strong">chosen</span>}
                      </div>
                      <p className="mb-2 text-xs italic text-ink-muted">{l.reader_hypothesis}</p>
                      <div className="copy-prose text-sm">{l.blocks.map((b) => <BlockView key={b.id} block={b} />)}</div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {!editing && draft.skim_path.length > 0 && (
              <details className="mt-4 rounded-card border border-line bg-surface shadow-card">
                <summary className="flex cursor-pointer items-center gap-2 px-5 py-3 text-sm font-medium text-ink"><Eye className="h-4 w-4 text-ink-muted" /> Skim path <span className="text-xs font-normal text-ink-muted">what a skimmer reads: headline, deck, crossheads, P.S., order form</span></summary>
                <ol className="space-y-1.5 border-t border-line p-5 text-sm">
                  {draft.skim_path.map((line, i) => (
                    <li key={i} className="flex gap-2"><span className="w-5 shrink-0 text-right text-xs text-ink-soft">{i + 1}</span><span className="text-ink">{line}</span></li>
                  ))}
                </ol>
              </details>
            )}
          </div>

          <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
            <Tabs value={tab} onValueChange={setTab} className="rounded-card border border-line bg-surface shadow-card">
              <TabsList variant="line" className="flex h-auto w-full flex-wrap justify-start gap-0 border-b border-line px-2 pt-1">
                <PanelTab value="attention" count={nAttention} tone="warn">Attention</PanelTab>
                <PanelTab value="argument">Argument</PanelTab>
                <PanelTab value="review">Review</PanelTab>
                <PanelTab value="flags" count={pendingFlags} tone={pendingFab ? "bad" : undefined}>Flags</PanelTab>
                <PanelTab value="sources">Sources</PanelTab>
                <PanelTab value="versions" count={drafts.length}>Versions</PanelTab>
                <PanelTab value="run">Run</PanelTab>
              </TabsList>
              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-4">
                <TabsContent value="attention"><AttentionPanel items={attention} offerId={detail.offer?.id ?? null} /></TabsContent>
                <TabsContent value="argument"><ArgumentPanel detail={detail} canEdit={canEdit} /></TabsContent>
                <TabsContent value="review"><ReviewPanel detail={detail} /></TabsContent>
                <TabsContent value="flags"><FlagsPanel detail={detail} current={current} canEdit={canEdit && isLatest} onApplied={() => setPinnedId(null)} /></TabsContent>
                <TabsContent value="sources"><SourcesPanel detail={detail} ledgerIds={ledgerIds} /></TabsContent>
                <TabsContent value="versions"><VersionsPanel drafts={drafts} currentId={current.id} onOpen={(id) => { setPinnedId(id === latest?.id ? null : id); setEditing(false); }} /></TabsContent>
                <TabsContent value="run">
                  <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted"><ListChecks className="h-3 w-3" /> Pipeline steps</div>
                  <StepTimeline generation={generation} steps={detail.steps} />
                </TabsContent>
              </div>
            </Tabs>
          </aside>
        </div>
        <RewriteDialog target={rewrite} onClose={() => setRewrite(null)} onDone={() => { setPinnedId(null); setEditing(false); }} />
      </LedgerProvider>
    </TooltipProvider>
  );
}

function PanelTab({ value, count, tone, children }: { value: string; count?: number; tone?: "warn" | "bad"; children: React.ReactNode }) {
  return (
    <TabsTrigger value={value} className="h-8 rounded-none border-b-2 border-transparent px-2 text-xs data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-brand-strong data-[state=active]:shadow-none">
      {children}
      {count ? <span className={cn("ml-1 rounded-full px-1.5 py-px text-[10px] font-semibold", tone === "warn" ? "bg-warn-soft text-warn" : tone === "bad" ? "bg-bad-soft text-bad" : "bg-surface-sunken text-ink-muted")}>{count}</span> : null}
    </TabsTrigger>
  );
}
