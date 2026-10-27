/**
 * rewrite-passage: a targeted rewrite of one selected passage inside a draft, as a new draft version.
 *   POST { draft_id, block_id?, selected_text, instruction }
 *   → { draft_id (new version's id), version, generation_id, replacement, ledger_refs, needs_source, block_id, replaced_in: "block" | "markdown" }
 * One model call: keep the winning thesis, cite ledger ids, obey the instruction, return only the replacement
 * for exactly the selected text. The caller must be an editor of the draft's workspace.
 */
import { z } from "zod";
import { HttpError, json, requireUser, serviceClient } from "shared/supabase.ts";
import { assertEditor, type JsonValue, loadPromptVersions, parseBody, recordUsageSafe, serve } from "shared/http.ts";
import { callModel } from "engine/llm.ts";
import { DEFAULT_MODEL } from "engine/config.ts";
import { OWNER_TELLS, PROOF_PLACEMENT, RULES } from "engine/prompts/standard.ts";
import { stripNeverTells } from "engine/draft/tell_edit.ts";
import { Block, Section } from "engine/schemas/draft.ts";
import { OfferBrief } from "engine/schemas/brief.ts";
import { draftWordCount, ledgerRefs, renderBlock, renderMarkdown, stripLedger, wordCount } from "engine/render.ts";

const Body = z.object({
  draft_id: z.uuid(),
  block_id: z.string().min(1).optional(),
  selected_text: z.string().min(1).max(20_000),
  instruction: z.string().min(1).max(4_000),
});

const Rewrite = z.object({
  replacement: z.string().describe("the replacement for exactly the selected text; ledger refs inline as [[L:<claim-id>]]"),
  ledger_refs: z.array(z.string()).describe("ledger ids the replacement relies on"),
  needs_source: z.array(z.string()).describe("claims the instruction asked for that no ledger row supports; written as [[NEEDS SOURCE]] in the replacement"),
  kept_thesis: z.boolean().describe("true when the replacement still argues the winning thesis"),
});

/** Stored blocks may omit the nullable keys; accept both shapes. */
const LooseBlock = Block.extend({ items: Block.shape.items.optional(), meta: Block.shape.meta.optional() });
const LooseSection = Section.extend({ blocks: z.array(LooseBlock) });
type BlockT = z.infer<typeof Block>;
type SectionT = z.infer<typeof Section>;

const SYSTEM = `You are a direct response copywriter revising one passage of a draft on request. You receive the brief, the winning argument (thesis), the claims ledger, the block the passage sits in, the selected passage and the editor's instruction.

Rules for the replacement:
- Return a replacement for exactly the selected passage and nothing else: no preface, no options, no notes. It will be pasted over the selection verbatim.
- Keep the thesis. If the instruction would break the thesis, make the smallest change that honors the instruction and set kept_thesis to false.
- Every number, name, study, credential, quote, price, deadline or result must come from the ledger and carry its id inline as [[L:<claim-id>]] at the ledger's precision. Never invent any of these. If the instruction asks for a claim the ledger cannot support, write [[NEEDS SOURCE]] in its place and list it in needs_source.
- Claim never bigger than its proof; proof within two sentences of the claim; no hedges on supported claims; no "may", "results vary" or generic disclaimers.
- Keep the passage's job, tense, person and roughly its length unless the instruction says otherwise. Match the voice parameters when given. Write in plain, concrete, read-aloud words, in the passage's own language. No assistant register, no bold-label-colon bullets, no placeholders.
- Fragments, caps, exclamation marks and ellipses are allowed at the rates the surrounding copy uses.
- Follow the owner's tells and words below, as patterns: no em dash, emoji or hashtag, none of the tells or words. If removing one would make the sentence worse, rewrite the sentence so it reads well and still loses the tell.

${RULES}

${PROOF_PLACEMENT}

${OWNER_TELLS}`;

serve(async (req) => {
  const { user, client } = await requireUser(req);
  const body = await parseBody(req, Body);

  const { data: visible, error } = await client.from("drafts").select("id, workspace_id, generation_id").eq("id", body.draft_id).maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!visible) throw new HttpError(404, "draft not found");
  await assertEditor(client, visible.workspace_id);

  const db = serviceClient();
  const [{ data: draft }, { data: gen }] = await Promise.all([
    db.from("drafts").select("*").eq("id", body.draft_id).single(),
    db.from("generations").select("*").eq("id", visible.generation_id).single(),
  ]);
  if (!draft || !gen) throw new HttpError(404, "draft or generation missing");

  const [{ data: offer }, { data: claims }, { data: angles }, voiceRes] = await Promise.all([
    db.from("offers").select("brief, name").eq("id", gen.offer_id).single(),
    db.from("offer_claims").select("id, claim_text, claim_type, evidence_grade, precision, status, user_decision").eq("offer_id", gen.offer_id).order("created_at"),
    db.from("angles").select("thesis, candidate, is_winner").eq("generation_id", gen.id).eq("is_winner", true).limit(1),
    gen.voice_profile_id ? db.from("voice_profiles").select("parameters, idiom_bank, dead_words").eq("id", gen.voice_profile_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const winner = angles?.[0] ?? null;
  const thesis = winner?.thesis ?? (asRecord(winner?.candidate)?.big_idea as string | undefined) ?? null;
  const brief = OfferBrief.safeParse(offer?.brief);

  // locate the passage
  const parsed = parseBlocks(draft.blocks);
  const located = parsed ? locate(parsed, body.block_id, body.selected_text) : null;
  if (!located && !draft.markdown.includes(body.selected_text) && !normalize(draft.markdown).includes(normalize(body.selected_text))) {
    throw new HttpError(422, "selected_text was not found in the draft (send the text as stored, ideally with its block_id)");
  }

  const usable = (claims ?? []).filter((c) => c.user_decision !== "drop");
  const ledger = usable.length
    ? usable.map((c) => `- [[L:${c.id}]] (${c.claim_type}${c.evidence_grade ? `, grade ${c.evidence_grade}` : ""}${c.status === "flagged" && c.user_decision !== "keep" ? ", flagged" : ""}) ${c.claim_text}${c.precision ? `; precision: ${c.precision}` : ""}`).join("\n")
    : "(empty: nothing may be asserted beyond what the selection already says)";

  const contextBlock = located ? renderBlock(located.block) : excerptAround(draft.markdown, body.selected_text);
  const voice = voiceRes.data;
  const userMsg = [
    `FORMAT: ${gen.format}`,
    `OFFER: ${offer?.name ?? ""}${brief.success ? `: ${brief.data.one_line}` : ""}`,
    `THESIS (keep it): ${thesis ?? "(no argument memo on file; keep the passage's existing argument)"}`,
    `\nCLAIMS LEDGER:\n${ledger}`,
    voice ? `\nVOICE PARAMETERS (match, never imitate adjectives):\n${JSON.stringify({ parameters: voice.parameters, idiom_bank: voice.idiom_bank, dead_words: voice.dead_words })}` : "",
    `\nBLOCK THE PASSAGE SITS IN${located ? ` (type: ${located.block.type}${located.sectionId ? `, section: ${located.sectionId}` : ""})` : ""}:\n<<<\n${contextBlock}\n>>>`,
    `\nSELECTED PASSAGE (replace exactly this):\n<<<\n${body.selected_text}\n>>>`,
    `\nEDITOR'S INSTRUCTION:\n${body.instruction}`,
  ].filter(Boolean).join("\n");

  const pv = (await loadPromptVersions(db))["rewrite_passage"]; // an active prompt_versions row for this step replaces the inline prompt
  const call = await callModel({
    model: pv?.model ?? DEFAULT_MODEL,
    effort: (pv?.effort as "low" | "medium" | "high" | "xhigh" | "max" | undefined) ?? "high",
    maxTokens: pv?.max_tokens ?? 4000,
    system: pv?.template ?? SYSTEM,
    user: userMsg,
    schema: Rewrite,
    log: { db, workspaceId: gen.workspace_id, generationId: gen.id, purpose: "rewrite_passage", promptVersionId: pv?.id ?? null },
  });
  // the owner's never-rules hold for a rewritten passage too (docs/04 §7.1): no em dash, emoji or hashtag ships
  const replacement = stripNeverTells(call.output.replacement.trim());
  if (!replacement) throw new HttpError(502, "model returned an empty replacement");

  // apply
  let blocks: JsonValue = draft.blocks as JsonValue;
  let markdown = draft.markdown;
  let replacedIn: "block" | "markdown" = "markdown";
  let sectionsForCount: SectionT[] | null = null;
  if (parsed && located) {
    const applied = applyToBlock(located.block, body.selected_text, replacement);
    if (applied) {
      const newBlock = applied;
      if (parsed.kind === "sections") {
        const sections = parsed.sections.map((s) => ({ ...s, blocks: s.blocks.map((b) => (b.id === newBlock.id ? newBlock : b)) }));
        // keep the DraftOutput wrapper (format, leads, chosen_lead_id, skim_path) the editor and the engine read
        blocks = (parsed.container ? { ...parsed.container, sections } : sections) as unknown as JsonValue;
        markdown = renderMarkdown({ sections });
        sectionsForCount = sections;
      } else {
        const flat = parsed.blocks.map((b) => (b.id === newBlock.id ? newBlock : b));
        blocks = flat as unknown as JsonValue;
        markdown = flat.map((b) => renderBlock(b)).filter(Boolean).join("\n\n").trim() + "\n";
        sectionsForCount = [{ section_id: "all", title: null, blocks: flat }];
      }
      replacedIn = "block";
    }
  }
  if (replacedIn === "markdown") {
    const r = replaceOnce(markdown, body.selected_text, replacement) ?? replaceOnce(normalize(markdown), normalize(body.selected_text), replacement);
    if (r === null) throw new HttpError(422, "selected_text was not found in the draft");
    markdown = r;
  }

  const allText = sectionsForCount ? sectionsForCount.flatMap((s) => s.blocks.flatMap((b) => [b.text, ...(b.items ?? [])])).join("\n") : markdown;
  const refs = Array.from(new Set(ledgerRefs(allText)));
  const words = sectionsForCount ? draftWordCount({ sections: sectionsForCount }) : wordCount(markdown);
  if (replacedIn === "block" && parsed?.kind === "sections" && parsed.container) {
    blocks = { ...(blocks as Record<string, unknown>), ledger_refs_used: refs, word_count: words } as unknown as JsonValue;
  }

  const { data: latest } = await db.from("drafts").select("version").eq("generation_id", gen.id).order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (latest?.version ?? draft.version) + 1;
  const { data: created, error: insErr } = await db
    .from("drafts")
    .insert({
      generation_id: gen.id,
      workspace_id: gen.workspace_id,
      version,
      origin: "rewrite",
      label: `Rewrite: ${body.instruction.replace(/\s+/g, " ").slice(0, 80)}`,
      blocks,
      markdown,
      skim_path: draft.skim_path,
      ledger_refs: refs as unknown as JsonValue,
      word_count: words,
      created_by: user.id,
    })
    .select("id, version")
    .single();
  if (insErr || !created) throw new HttpError(500, `draft insert failed: ${insErr?.message ?? "no row"}`);

  await recordUsageSafe(db, { workspaceId: gen.workspace_id, generationId: gen.id, kind: "rewrite", tokens: call.usage.input_tokens + call.usage.output_tokens, cost: call.costUsd });

  return json({
    draft_id: created.id,
    version: created.version,
    generation_id: gen.id,
    previous_draft_id: draft.id,
    replacement,
    ledger_refs: call.output.ledger_refs,
    needs_source: call.output.needs_source,
    kept_thesis: call.output.kept_thesis,
    block_id: located?.block.id ?? null,
    replaced_in: replacedIn,
    cost_usd: call.costUsd,
  });
});

// ---------- blocks ----------

/** `container` is the DraftOutput wrapper around the sections when the row holds one, so the new version keeps it. */
type Parsed = { kind: "sections"; sections: SectionT[]; container: Record<string, unknown> | null } | { kind: "blocks"; blocks: BlockT[] };

/** drafts.blocks holds a whole DraftOutput ({ sections, leads, ... }, see engine/draft/assemble.ts toDraftEffect); older rows may hold Section[] or Block[]. */
function parseBlocks(raw: unknown): Parsed | null {
  const container = raw && typeof raw === "object" && !Array.isArray(raw) && Array.isArray((raw as { sections?: unknown }).sections) ? (raw as Record<string, unknown>) : null;
  const s = z.array(LooseSection).safeParse(container ? container.sections : raw);
  if (s.success && s.data.length) return { kind: "sections", sections: s.data.map((sec) => ({ ...sec, blocks: sec.blocks.map(fill) })), container };
  const b = z.array(LooseBlock).safeParse(raw);
  if (b.success && b.data.length) return { kind: "blocks", blocks: b.data.map(fill) };
  return null;
}
function fill(b: z.infer<typeof LooseBlock>): BlockT {
  return { ...b, items: b.items ?? null, meta: b.meta ?? null };
}
function allBlocks(p: Parsed): { block: BlockT; sectionId: string | null }[] {
  return p.kind === "sections" ? p.sections.flatMap((s) => s.blocks.map((block) => ({ block, sectionId: s.section_id }))) : p.blocks.map((block) => ({ block, sectionId: null }));
}

function locate(p: Parsed, blockId: string | undefined, selected: string): { block: BlockT; sectionId: string | null } | null {
  const all = allBlocks(p);
  if (blockId) {
    const hit = all.find((x) => x.block.id === blockId);
    if (hit) return hit;
  }
  return all.find((x) => blockContains(x.block, selected)) ?? null;
}

function blockContains(b: BlockT, selected: string): boolean {
  const hay = [b.text, ...(b.items ?? [])];
  return hay.some((t) => t.includes(selected) || stripLedger(t).includes(selected) || normalize(t).includes(normalize(selected)));
}

function applyToBlock(b: BlockT, selected: string, replacement: string): BlockT | null {
  const t = replaceTolerant(b.text, selected, replacement);
  if (t !== null) return { ...b, text: t };
  if (b.items) {
    for (let i = 0; i < b.items.length; i++) {
      const r = replaceTolerant(b.items[i], selected, replacement);
      if (r !== null) {
        const items = [...b.items];
        items[i] = r;
        return { ...b, items };
      }
    }
  }
  return null;
}

/** Exact match first; then the same text with ledger tags stripped; then whitespace-normalized. */
function replaceTolerant(text: string, selected: string, replacement: string): string | null {
  return replaceOnce(text, selected, replacement) ??
    replaceOnce(stripLedger(text), selected, replacement) ??
    replaceOnce(normalize(text), normalize(selected), replacement);
}
function replaceOnce(text: string, needle: string, replacement: string): string | null {
  const i = text.indexOf(needle);
  if (i < 0) return null;
  return text.slice(0, i) + replacement + text.slice(i + needle.length);
}
function normalize(s: string): string {
  return stripLedger(s).replace(/\s+/g, " ").trim();
}
function excerptAround(markdown: string, selected: string): string {
  const i = markdown.indexOf(selected);
  if (i < 0) return markdown.slice(0, 2000);
  return markdown.slice(Math.max(0, i - 800), Math.min(markdown.length, i + selected.length + 800));
}
function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
