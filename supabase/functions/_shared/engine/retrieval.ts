import type { Db } from "../supabase.ts";
import { embed } from "./llm.ts";
import type { FormatId } from "./schemas/common.ts";

export interface RetrievedExample { id: string; title: string; format: string; lead_type: string | null; argument_sentence: string | null; excerpt: string | null; lessons: unknown; annotations: unknown; similarity: number }
export interface RetrievedCritique { id: string; chief: string | null; format: string | null; weak_draft: string | null; strong_revision: string | null; defect_named: string | null; principle: string | null; similarity: number }

/** Top-k curated examples and critiques for a step. Examples are annotated excerpts and lessons, never full text to imitate. */
export async function retrieve(db: Db, params: { format: FormatId; queryText: string; k?: number }) {
  const k = params.k ?? 3;
  const vec = await embed(params.queryText);
  if (!vec) return { examples: [] as RetrievedExample[], critiques: [] as RetrievedCritique[] };
  const [ex, cr] = await Promise.all([
    db.rpc("match_examples", { query_embedding: JSON.stringify(vec), match_format: params.format, match_count: k, exclude_losers: true }),
    db.rpc("match_critiques", { query_embedding: JSON.stringify(vec), match_format: params.format, match_count: k }),
  ]);
  if (ex.error) console.error("match_examples", ex.error.message);
  if (cr.error) console.error("match_critiques", cr.error.message);
  return { examples: (ex.data ?? []) as RetrievedExample[], critiques: (cr.data ?? []) as RetrievedCritique[] };
}

export function formatExamplesForPrompt(examples: RetrievedExample[], critiques: RetrievedCritique[]): string {
  const e = examples.map((x, i) => `EXAMPLE ${i + 1}: ${x.title}${x.lead_type ? ` (lead: ${x.lead_type})` : ""}\nArgument: ${x.argument_sentence ?? "n/a"}\nExcerpt: ${x.excerpt ?? "n/a"}\nLessons: ${JSON.stringify(x.lessons ?? [])}`).join("\n\n");
  const c = critiques.map((x, i) => `CRITIQUE ${i + 1} (${x.chief ?? "copy chief"}): defect: ${x.defect_named ?? ""}\nBEFORE: ${x.weak_draft ?? ""}\nAFTER: ${x.strong_revision ?? ""}\nPrinciple: ${x.principle ?? ""}`).join("\n\n");
  return [e && `Annotated examples (study the decisions; never reproduce the text):\n\n${e}`, c && `Copy chief critiques (what gets sent back and why):\n\n${c}`].filter(Boolean).join("\n\n");
}
