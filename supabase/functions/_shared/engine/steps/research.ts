/**
 * Step 1, research: the dossier, with web search and web fetch. One structured-output call; one retry with a
 * lower verbatim cap when the output hits max_tokens. Code enforces what code can: themes with fewer than three
 * quotes are low confidence, objections without a verbatim move to unsourced hypotheses, sources are merged.
 */
import { MAX_TOKENS_PER_CALL, STEP_DEFAULTS } from "../config.ts";
import { callModel, TruncatedError } from "../llm.ts";
import researchPrompt from "../prompts/research.v1.ts";
import { resolvePrompt } from "../prompts/types.ts";
import { OfferBrief } from "../schemas/brief.ts";
import { Dossier } from "../schemas/research.ts";
import type { StepContext, StepFn, StepResult } from "./types.ts";

export const RESEARCH_VERBATIM_CAP = 120;
export const RESEARCH_RETRY_VERBATIM_CAP = 60;

export interface ResearchDeps {
  call: typeof callModel;
}

/** The intake brief, or the offer's stored brief when the context did not carry a parsed one. */
export function requireBrief(ctx: StepContext): OfferBrief {
  if (ctx.brief) return ctx.brief;
  const parsed = OfferBrief.safeParse(ctx.offer.brief);
  if (parsed.success) return parsed.data;
  throw new Error("this step needs the intake brief; run intake first");
}

const URL_RE = /^https?:\/\/\S+$/i;

/** The client's and competitors' pages the brief names, deduplicated, in brief order. */
export function fetchFirstUrls(brief: OfferBrief): string[] {
  const all = [...brief.urls, ...brief.competitors, ...brief.audience.verbatim_sources].map((s) => s.trim()).filter((s) => URL_RE.test(s));
  return [...new Set(all)];
}

/** Code-enforced rules on the dossier, applied before it is stored. */
export function finalizeDossier(d: Dossier, extraSources: { url: string; title?: string | null }[] = []): Dossier {
  // Verbatims: non-empty, unique ids (a duplicate id gets a suffix; references keep pointing at the first).
  const seen = new Map<string, number>();
  const verbatims = d.verbatims
    .filter((v) => v.text.trim().length > 0)
    .map((v) => {
      const id = v.id.trim();
      const n = (seen.get(id) ?? 0) + 1;
      seen.set(id, n);
      return { ...v, id: n === 1 ? id : `${id}-dup${n}`, text: v.text.trim() };
    });
  const ids = new Set(verbatims.map((v) => v.id));
  const known = (list: string[]) => [...new Set(list.map((x) => x.trim()).filter((x) => ids.has(x)))];

  const themes = d.themes.map((t) => {
    const verbatim_ids = known(t.verbatim_ids);
    return { ...t, verbatim_ids, count: verbatim_ids.length, confidence: verbatim_ids.length < 3 ? ("low" as const) : t.confidence };
  });

  const unsourced = [...d.unsourced_hypotheses];
  const objection_map: Dossier["objection_map"] = [];
  for (const o of d.objection_map) {
    const verbatim_ids = known(o.verbatim_ids);
    if (verbatim_ids.length) objection_map.push({ text: o.text, verbatim_ids });
    else unsourced.push(`objection without a verbatim: ${o.text}`);
  }

  const resident_emotion = { ...d.resident_emotion, verbatim_ids: known(d.resident_emotion.verbatim_ids) };

  const byUrl = new Map<string, Dossier["sources"][number]>();
  for (const s of d.sources) if (s.url && !byUrl.has(s.url)) byUrl.set(s.url, s);
  for (const s of extraSources) if (s.url && !byUrl.has(s.url)) byUrl.set(s.url, { url: s.url, title: s.title ?? null, kind: null });

  return Dossier.parse({ ...d, verbatims, themes, objection_map, resident_emotion, unsourced_hypotheses: [...new Set(unsourced)], sources: [...byUrl.values()] });
}

export function makeResearchStep(deps: Partial<ResearchDeps> = {}): StepFn {
  const call = deps.call ?? callModel;
  return async (ctx) => {
    const brief = requireBrief(ctx);
    const claims = ctx.claims.filter((c) => c.user_decision !== "drop");
    const fetchFirst = fetchFirstUrls(brief);
    const p = resolvePrompt(ctx, researchPrompt);
    const d = STEP_DEFAULTS.research;

    const run = (verbatimCap: number, retry: boolean) =>
      call({
        model: p.model ?? d.model,
        effort: p.effort ?? d.effort,
        maxTokens: Math.min(p.maxTokens ?? d.maxTokens, MAX_TOKENS_PER_CALL),
        system: p.system,
        user: researchPrompt.user(ctx, { brief, claims, config: ctx.config, fetchFirst, verbatimCap, retry }),
        schema: Dossier,
        webTools: true,
        log: {
          db: ctx.db,
          workspaceId: ctx.generation.workspace_id,
          generationId: ctx.generation.id,
          step: "research",
          attempt: ctx.attempt,
          purpose: retry ? "research.dossier.retry_fewer_verbatims" : "research.dossier",
          promptVersionId: p.promptVersionId,
        },
      });

    await ctx.progress(`Researching ${brief.product_name}: reviews, forums, competitors${fetchFirst.length ? `, ${fetchFirst.length} page${fetchFirst.length === 1 ? "" : "s"} from the brief` : ""}`);
    let res;
    try {
      res = await run(RESEARCH_VERBATIM_CAP, false);
    } catch (e) {
      if (!(e instanceof TruncatedError)) throw e;
      await ctx.progress("The dossier ran past the output budget; retrying with fewer verbatims");
      res = await run(RESEARCH_RETRY_VERBATIM_CAP, true);
    }

    const dossier = finalizeDossier(Dossier.parse(res.output), res.sources);
    const clusters = new Set(dossier.verbatims.map((v) => v.desire_cluster).filter((c): c is string => !!c)).size;
    const result: StepResult<Dossier> = {
      output: dossier,
      model: res.model,
      summary: `${dossier.verbatims.length} verbatims in ${clusters} clusters from ${dossier.sources.length} sources; ${dossier.themes.length} themes; ${dossier.competitor_table.length} competitors; sophistication stage ${dossier.sophistication.stage}; ${dossier.objection_map.length} objections`,
      effects: { research: { dossier, sources: dossier.sources } },
    };
    return result;
  };
}

export const researchStep: StepFn = makeResearchStep();
