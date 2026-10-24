/**
 * embed: computes embeddings (gte-small, 384 dims, via the edge runtime's built-in model) for library rows.
 *   POST { table: "examples" | "critiques" | "controls" | "example_sections", id?, limit? (default 50, max 200) }
 *   → { table, embedded, failed: [{id, error}], remaining }
 * Admin only. Without `id` it embeds rows whose embedding is null, one batch per call; the caller loops while
 * `remaining` > 0.
 */
import { z } from "zod";
import { type Db, HttpError, json, serviceClient } from "shared/supabase.ts";
import { errorMessage, parseBody, requireAdmin, serve } from "shared/http.ts";
import { embed } from "engine/llm.ts";

const TABLES = ["examples", "critiques", "controls", "example_sections"] as const;
type Table = (typeof TABLES)[number];
const Body = z.object({ table: z.enum(TABLES), id: z.uuid().optional(), limit: z.number().int().min(1).max(200).optional().default(50) });

serve(async (req) => {
  await requireAdmin(req);
  const body = await parseBody(req, Body);
  const db = serviceClient();

  const rows = await loadRows(db, body.table, body.id, body.limit);
  if (body.id && rows.length === 0) throw new HttpError(404, `${body.table} row not found`);

  let embedded = 0;
  const failed: { id: string; error: string }[] = [];
  for (const row of rows) {
    const text = textFor(body.table, row);
    if (!text.trim()) {
      failed.push({ id: row.id, error: "no text to embed" });
      continue;
    }
    let vec: number[] | null;
    try {
      vec = await embed(text);
    } catch (e) {
      failed.push({ id: row.id, error: errorMessage(e) });
      continue;
    }
    if (!vec) throw new HttpError(503, "embeddings are unavailable outside the Supabase edge runtime (Supabase.ai.Session missing)");
    const error = await writeEmbedding(db, body.table, row.id, vec);
    if (error) failed.push({ id: row.id, error });
    else embedded += 1;
  }

  const remaining = body.id ? 0 : await countMissing(db, body.table);
  return json({ table: body.table, embedded, failed, remaining });
});

type AnyRow = Record<string, unknown> & { id: string };

async function loadRows(db: Db, table: Table, id: string | undefined, limit: number): Promise<AnyRow[]> {
  const q = db.from(table).select("*");
  const scoped = id ? q.eq("id", id) : q.is("embedding", null).order("created_at", { ascending: true }).limit(limit);
  const { data, error } = await scoped;
  if (error) throw new HttpError(500, `${table} load failed: ${error.message}`);
  return (data ?? []) as unknown as AnyRow[];
}

async function countMissing(db: Db, table: Table): Promise<number> {
  const { count, error } = await db.from(table).select("id", { count: "exact", head: true }).is("embedding", null);
  if (error) throw new HttpError(500, `${table} count failed: ${error.message}`);
  return count ?? 0;
}

async function writeEmbedding(db: Db, table: Table, id: string, vec: number[]): Promise<string | null> {
  const embedding = JSON.stringify(vec); // pgvector accepts the "[...]" literal
  const { error } = await db.from(table).update({ embedding }).eq("id", id);
  return error ? error.message : null;
}

/** The text that represents a row for retrieval. Structural tags first, then the excerpt; never the full text alone. */
function textFor(table: Table, r: AnyRow): string {
  const s = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
  const j = (k: string) => (r[k] === null || r[k] === undefined ? "" : JSON.stringify(r[k]));
  const line = (label: string, v: string) => (v ? `${label}: ${v}` : "");
  switch (table) {
    case "examples":
      return [
        line("Title", s("title")),
        line("Author", s("author")),
        line("Format", s("format")),
        line("Market", s("market")),
        line("Selling situation", s("selling_situation")),
        line("Awareness", s("awareness")),
        line("Sophistication", s("sophistication")),
        line("Lead type", s("lead_type")),
        line("Argument", s("argument_sentence")),
        line("Hook", s("hook")),
        line("Mechanism type", s("mechanism_type")),
        line("Funnel position", s("funnel_position")),
        line("Offer devices", j("offer_devices")),
        line("Proof placement", j("proof_placement")),
        line("Lessons", j("lessons")),
        line("Excerpt", s("excerpt")),
      ].filter(Boolean).join("\n");
    case "critiques":
      return [
        line("Chief", s("chief")),
        line("Format", s("format")),
        line("Brief", s("brief")),
        line("Defect", s("defect_named") || s("defect")),
        line("Principle", s("principle")),
        line("Reason", s("reason")),
        line("Tags", j("tags")),
        line("Before", s("weak_draft").slice(0, 1500)),
        line("After", s("strong_revision").slice(0, 1500)),
      ].filter(Boolean).join("\n");
    case "controls":
      return [
        line("Title", s("title")),
        line("Author", s("author")),
        line("Format", s("format")),
        line("Market", s("market")),
        line("Funnel position", s("funnel_position")),
        line("Traffic", s("traffic")),
        line("Structure", j("structure")),
        line("Lessons", j("lessons")),
        line("Notes", s("notes")),
        line("Excerpt", s("excerpt")),
      ].filter(Boolean).join("\n");
    case "example_sections":
      return [line("Section", s("section_type")), line("Annotation", s("annotation")), line("Excerpt", s("excerpt") || s("text").slice(0, 1500))].filter(Boolean).join("\n");
  }
}
