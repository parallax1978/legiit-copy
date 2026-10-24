import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { ExampleForm } from "@/components/admin/example-form";
import { SectionEditor } from "@/components/admin/section-editor";
import { ActionButton } from "@/components/admin/action-button";
import { StatusBadge, YesNo } from "@/components/admin/status-badge";
import { Section } from "@/components/admin/stat-tile";
import { getExample, allowsFullText } from "@/lib/data/admin";
import { deleteExample, embedRows, setExampleStatus } from "@/lib/actions/admin";
import { FORMAT_IDS } from "@/lib/formats";

export const metadata = { title: "Example" };
export const dynamic = "force-dynamic";

export default async function ExamplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { example, sections } = await getExample(id);
  if (!example) notFound();
  const formats = (FORMAT_IDS as readonly string[]).includes(example.format) ? FORMAT_IDS : [...FORMAT_IDS, example.format];

  return (
    <>
      <PageHeader
        title={example.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge value={example.status} />
            <StatusBadge value={example.rights_status} />
            <span className="text-xs">Embedded:</span> <YesNo value={!!example.embedding} />
            <span className="font-mono text-xs text-ink-soft">{example.id}</span>
          </span>
        }
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/library">Back</Link>
            </Button>
            {example.status !== "curated" && (
              <ActionButton size="sm" variant="outline" action={setExampleStatus.bind(null, example.id, "curated")}>
                Curate
              </ActionButton>
            )}
            {example.status !== "retired" && (
              <ActionButton size="sm" variant="outline" action={setExampleStatus.bind(null, example.id, "retired")}>
                Retire
              </ActionButton>
            )}
            {example.status === "retired" && (
              <ActionButton size="sm" variant="outline" action={setExampleStatus.bind(null, example.id, "draft")}>
                Back to draft
              </ActionButton>
            )}
            <ActionButton size="sm" action={embedRows.bind(null, "examples", example.id)} pendingLabel="Embedding…">
              <Sparkles className="h-4 w-4" /> {example.embedding ? "Re-embed" : "Embed"}
            </ActionButton>
            <ActionButton size="sm" variant="destructive" action={deleteExample.bind(null, example.id)} confirm="Delete this example and its sections?">
              <Trash2 className="h-4 w-4" />
            </ActionButton>
          </>
        }
      />

      <ExampleForm example={example} formats={formats} />

      <Section title="Sections" description="One row per structural block with a description in our words; each is embedded for section-level retrieval." className="mt-10">
        <SectionEditor exampleId={example.id} sections={sections} fullTextAllowed={allowsFullText(example.rights_status)} />
        {sections.some((s) => !s.embedding) && (
          <div className="mt-3 flex justify-end">
            <ActionButton size="sm" variant="outline" action={embedRows.bind(null, "example_sections", undefined)} pendingLabel="Embedding…">
              <Sparkles className="h-4 w-4" /> Embed sections missing an embedding
            </ActionButton>
          </div>
        )}
      </Section>
    </>
  );
}
