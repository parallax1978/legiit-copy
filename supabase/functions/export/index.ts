/**
 * export: renders a draft version to DOCX, HTML, Markdown or plain text, stores it in the private `exports`
 * bucket at <workspace_id>/<generation_id>/<version>.<ext> and returns a 10-minute signed URL.
 *   POST { draft_id, kind: "docx" | "html" | "md" | "txt", section_ids?: string[] }
 *   → { url, path, filename, kind, content_type, expires_in: 600, draft_id, generation_id, version, section_ids }
 * With section_ids only those sections are rendered (one email of a sequence, one ad of a set) and the file is
 * stored under its own name so it never overwrites the full export.
 * Ledger tags are stripped; any workspace member may export.
 */
import { z } from "zod";
import { AlignmentType, Document, HeadingLevel, type IRunOptions, LevelFormat, Packer, Paragraph, TextRun } from "docx";
import { HttpError, json, requireUser, serviceClient } from "shared/supabase.ts";
import { parseBody, recordUsageSafe, serve } from "shared/http.ts";
import { Block, Section } from "engine/schemas/draft.ts";
import { renderMarkdown, stripLedger } from "engine/render.ts";

const Body = z.object({ draft_id: z.uuid(), kind: z.enum(["docx", "html", "md", "txt"]), section_ids: z.array(z.string().min(1)).min(1).max(50).optional() });

const LooseBlock = Block.extend({ items: Block.shape.items.optional(), meta: Block.shape.meta.optional() });
const LooseSection = Section.extend({ blocks: z.array(LooseBlock) });
type BlockT = z.infer<typeof Block>;
type SectionT = z.infer<typeof Section>;

const CONTENT_TYPES = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  html: "text/html; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  txt: "text/plain; charset=utf-8",
} as const;
const EXPIRES_IN = 600;

serve(async (req) => {
  const { client } = await requireUser(req);
  const { draft_id, kind, section_ids } = await parseBody(req, Body);

  const { data: visible, error } = await client.from("drafts").select("id, workspace_id, generation_id").eq("id", draft_id).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!visible) throw new HttpError(404, "draft not found");

  const db = serviceClient();
  const [{ data: draft }, { data: gen }] = await Promise.all([
    db.from("drafts").select("*").eq("id", draft_id).single(),
    db.from("generations").select("id, workspace_id, format, offer_id").eq("id", visible.generation_id).single(),
  ]);
  if (!draft || !gen) throw new HttpError(404, "draft or generation missing");
  const { data: offer } = await db.from("offers").select("name").eq("id", gen.offer_id).maybeSingle();

  const parsed = parseSections(draft.blocks);
  let sections = parsed ?? [{ section_id: "all", title: null, blocks: [{ id: "md", type: "paragraph" as const, text: draft.markdown, items: null, meta: null }] }];
  let suffix = "";
  if (section_ids) {
    if (!parsed) throw new HttpError(422, "this draft has no sections to select from");
    const wanted = new Set(section_ids);
    sections = parsed.filter((s) => wanted.has(s.section_id));
    if (!sections.length) throw new HttpError(422, `none of section_ids exist in this draft (have: ${parsed.map((s) => s.section_id).join(", ")})`);
    suffix = `-${slug(sections.map((s) => s.section_id).join("-")).slice(0, 40)}`;
  }
  const title = `${offer?.name ?? "Copy"} — ${gen.format}${draft.label ? ` — ${draft.label}` : ""}${sections.length === 1 && sections[0].title ? ` — ${sections[0].title}` : ""}`;

  let body: Blob;
  switch (kind) {
    case "md":
      body = new Blob([renderMarkdown({ sections }, { stripLedger: true })], { type: CONTENT_TYPES.md });
      break;
    case "txt":
      body = new Blob([toPlainText(sections)], { type: CONTENT_TYPES.txt });
      break;
    case "html":
      body = new Blob([toHtml(sections, title)], { type: CONTENT_TYPES.html });
      break;
    case "docx":
      body = await Packer.toBlob(toDocx(sections, title));
      break;
  }

  const path = `${gen.workspace_id}/${gen.id}/${draft.version}${suffix}.${kind}`;
  const filename = `${slug(offer?.name ?? "copy")}-${gen.format}-v${draft.version}${suffix}.${kind}`;
  const { error: upErr } = await db.storage.from("exports").upload(path, body, { contentType: CONTENT_TYPES[kind], upsert: true });
  if (upErr) throw new HttpError(500, `upload failed: ${upErr.message}`);
  const { data: signed, error: signErr } = await db.storage.from("exports").createSignedUrl(path, EXPIRES_IN, { download: filename });
  if (signErr || !signed) throw new HttpError(500, `signed url failed: ${signErr?.message ?? "no url"}`);

  await recordUsageSafe(db, { workspaceId: gen.workspace_id, generationId: gen.id, kind: "export", tokens: 0, cost: 0 });

  return json({ url: signed.signedUrl, path, filename, kind, content_type: CONTENT_TYPES[kind], expires_in: EXPIRES_IN, draft_id, generation_id: gen.id, version: draft.version, section_ids: sections.map((s) => s.section_id) });
});

// ---------- blocks ----------

/** drafts.blocks holds a whole DraftOutput ({ sections, leads, ... }, see engine/draft/assemble.ts toDraftEffect); older rows may hold Section[] or Block[]. */
function parseSections(raw: unknown): SectionT[] | null {
  const nested = raw && typeof raw === "object" && !Array.isArray(raw) && Array.isArray((raw as { sections?: unknown }).sections) ? (raw as { sections: unknown }).sections : raw;
  const s = z.array(LooseSection).safeParse(nested);
  if (s.success && s.data.length) return s.data.map((sec) => ({ ...sec, blocks: sec.blocks.map(fill) }));
  const b = z.array(LooseBlock).safeParse(raw);
  if (b.success && b.data.length) return [{ section_id: "all", title: null, blocks: b.data.map(fill) }];
  return null;
}
function fill(b: z.infer<typeof LooseBlock>): BlockT {
  return { ...b, items: b.items ?? null, meta: b.meta ?? null };
}
const clean = (t: string) => stripLedger(t);
function prefix(b: BlockT): string {
  const parts: string[] = [];
  if (b.meta?.timestamp) parts.push(`(${b.meta.timestamp})`);
  if (b.meta?.speaker) parts.push(`${b.meta.speaker}:`);
  return parts.length ? parts.join(" ") + " " : "";
}
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "copy";
}

// ---------- plain text ----------

function toPlainText(sections: SectionT[]): string {
  const out: string[] = [];
  for (const s of sections) {
    for (const b of s.blocks) {
      const t = unmark(clean(b.text));
      switch (b.type) {
        case "bullets":
          out.push((b.items ?? []).map((i) => `- ${unmark(clean(i))}`).join("\n"));
          break;
        case "numbered":
          out.push((b.items ?? []).map((i, n) => `${n + 1}. ${unmark(clean(i))}`).join("\n"));
          break;
        case "subject":
          out.push(`Subject: ${t}`);
          break;
        case "preview":
          out.push(`Preview: ${t}`);
          break;
        case "button":
          out.push(`[ ${t} ]`);
          break;
        case "ps":
          out.push(t.startsWith("P.S.") ? t : `P.S. ${t}`);
          break;
        case "headline":
          out.push(t.toUpperCase() === t ? t : t);
          break;
        default:
          out.push(prefix(b) + t);
      }
    }
  }
  return out.filter(Boolean).join("\n\n").trim() + "\n";
}
/** Drops markdown emphasis markers from copy text. */
function unmark(t: string): string {
  return t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,;:!?]|$)/g, "$1$2").replace(/(^|[\s(])_(?!\s)(.+?)_(?=[\s).,;:!?]|$)/g, "$1$2");
}

// ---------- HTML ----------

function toHtml(sections: SectionT[], title: string): string {
  const parts: string[] = [];
  for (const s of sections) {
    parts.push(`<section data-section="${esc(s.section_id)}">`);
    for (const b of s.blocks) parts.push(blockHtml(b));
    parts.push("</section>");
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  body { max-width: 680px; margin: 40px auto; padding: 0 20px; font: 18px/1.55 Georgia, "Times New Roman", serif; color: #111; background: #fff; }
  h1 { font-size: 2em; line-height: 1.15; margin: 0 0 .5em; }
  h2 { font-size: 1.35em; line-height: 1.25; font-weight: normal; margin: 0 0 1em; }
  h3 { font-size: 1.1em; margin: 1.6em 0 .5em; }
  p { margin: 0 0 1em; }
  .preheadline { font-style: italic; }
  .meta { font-family: ui-sans-serif, system-ui, sans-serif; font-size: .9em; color: #444; }
  .cta, .button { font-weight: bold; }
  .button { display: inline-block; padding: .6em 1.2em; border: 2px solid #111; border-radius: 6px; margin: .5em 0 1.2em; }
  blockquote { margin: 0 0 1em; padding-left: 1em; border-left: 3px solid #ccc; font-style: italic; }
  .disclosure { font-size: .8em; color: #555; }
  .beat { white-space: pre-wrap; }
  ul, ol { margin: 0 0 1em 1.4em; padding: 0; }
  li { margin-bottom: .4em; }
</style>
</head>
<body>
${parts.join("\n")}
</body>
</html>
`;
}

function blockHtml(b: BlockT): string {
  const t = inlineHtml(clean(b.text));
  switch (b.type) {
    case "preheadline":
      return `<p class="preheadline">${t}</p>`;
    case "headline":
      return `<h1>${t}</h1>`;
    case "deck":
      return `<h2>${t}</h2>`;
    case "crosshead":
      return `<h3>${t}</h3>`;
    case "subject":
      return `<p class="meta"><strong>Subject:</strong> ${t}</p>`;
    case "preview":
      return `<p class="meta"><strong>Preview:</strong> ${t}</p>`;
    case "bullets":
      return `<ul>${(b.items ?? []).map((i) => `<li>${inlineHtml(clean(i))}</li>`).join("")}</ul>`;
    case "numbered":
      return `<ol>${(b.items ?? []).map((i) => `<li>${inlineHtml(clean(i))}</li>`).join("")}</ol>`;
    case "testimonial":
      return `<blockquote>${t}</blockquote>`;
    case "button":
      return `<p><span class="button">${t}</span></p>`;
    case "cta":
      return `<p class="cta">${t}</p>`;
    case "ps": {
      const raw = clean(b.text);
      return `<p class="ps">${inlineHtml(raw.startsWith("P.S.") ? raw : `P.S. ${raw}`)}</p>`;
    }
    case "label":
      return `<p><strong>${t}</strong></p>`;
    case "disclosure":
      return `<p class="disclosure">${t}</p>`;
    case "beat":
    case "slide":
      return `<p class="beat">${esc(prefix(b))}${t}</p>`;
    default:
      return `<p class="${esc(b.type)}">${t}</p>`;
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
/** Escapes, then turns **bold** and *italic* into tags and line breaks into <br>. */
function inlineHtml(s: string): string {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>")
    .replace(/\n/g, "<br>");
}

// ---------- DOCX ----------

function toDocx(sections: SectionT[], title: string): Document {
  const children: Paragraph[] = [];
  const numbering: { reference: string; levels: { level: number; format: (typeof LevelFormat)[keyof typeof LevelFormat]; text: string; alignment: (typeof AlignmentType)[keyof typeof AlignmentType]; style: { paragraph: { indent: { left: number; hanging: number } } } }[] }[] = [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ];
  let numberedLists = 0;
  for (const s of sections) {
    for (const b of s.blocks) {
      if (b.type === "numbered") {
        const reference = `numbers-${++numberedLists}`;
        numbering.push({ reference, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] });
        for (const i of b.items ?? []) children.push(new Paragraph({ numbering: { reference, level: 0 }, children: runs(clean(i)) }));
        continue;
      }
      children.push(...blockDocx(b));
    }
  }
  return new Document({
    creator: "Legiit Copy",
    title,
    styles: { default: { document: { run: { font: "Georgia", size: 24 } } } },
    numbering: { config: numbering },
    sections: [{ children }],
  });
}

function blockDocx(b: BlockT): Paragraph[] {
  const t = clean(b.text);
  const spaced = { spacing: { after: 200 } };
  switch (b.type) {
    case "preheadline":
      return [new Paragraph({ ...spaced, children: runs(t, { italics: true }) })];
    case "headline":
      return [new Paragraph({ heading: HeadingLevel.HEADING_1, children: runs(t) })];
    case "deck":
      return [new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs(t) })];
    case "crosshead":
      return [new Paragraph({ heading: HeadingLevel.HEADING_3, children: runs(t) })];
    case "subject":
      return [new Paragraph({ ...spaced, children: [new TextRun({ text: "Subject: ", bold: true }), ...runs(t)] })];
    case "preview":
      return [new Paragraph({ ...spaced, children: [new TextRun({ text: "Preview: ", bold: true }), ...runs(t)] })];
    case "bullets":
      return (b.items ?? []).map((i) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: runs(clean(i)) }));
    case "testimonial":
      return [new Paragraph({ ...spaced, indent: { left: 720 }, children: runs(t, { italics: true }) })];
    case "button":
      return [new Paragraph({ ...spaced, alignment: AlignmentType.CENTER, children: runs(`[ ${t} ]`, { bold: true }) })];
    case "cta":
    case "label":
      return [new Paragraph({ ...spaced, children: runs(t, { bold: true }) })];
    case "ps":
      return [new Paragraph({ ...spaced, children: runs(t.startsWith("P.S.") ? t : `P.S. ${t}`) })];
    case "disclosure":
      return [new Paragraph({ ...spaced, children: runs(t, { size: 18, color: "555555" }) })];
    case "beat":
    case "slide":
      return [new Paragraph({ ...spaced, children: runs(prefix(b) + t) })];
    default:
      return [new Paragraph({ ...spaced, children: runs(t) })];
  }
}

/** Splits copy text into runs: **bold**, *italic*, line breaks. */
function runs(text: string, base: Partial<IRunOptions> = {}): TextRun[] {
  const out: TextRun[] = [];
  const lines = text.split("\n");
  lines.forEach((line, li) => {
    const re = /\*\*(.+?)\*\*|(?:^|(?<=[\s(]))\*(?!\s)(.+?)\*(?=[\s).,;:!?]|$)/g;
    let last = 0;
    for (const m of line.matchAll(re)) {
      if (m.index! > last) out.push(new TextRun({ ...base, text: line.slice(last, m.index), break: li > 0 && last === 0 ? 1 : undefined }));
      if (m[1] !== undefined) out.push(new TextRun({ ...base, text: m[1], bold: true, break: li > 0 && last === 0 && m.index === 0 ? 1 : undefined }));
      else out.push(new TextRun({ ...base, text: m[2], italics: true, break: li > 0 && last === 0 && m.index === 0 ? 1 : undefined }));
      last = m.index! + m[0].length;
    }
    if (last < line.length || line.length === 0) out.push(new TextRun({ ...base, text: line.slice(last), break: li > 0 && last === 0 ? 1 : undefined }));
  });
  return out;
}
