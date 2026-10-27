/**
 * Step 1, research: the dossier, in three model calls across three invocations.
 *   collect 1  web search and fetch over post-purchase voice (review sites, competitor and client pages).
 *   collect 2  the same over pre-purchase voice (forums, Q&A, comments, social), continuing the table.
 *   synthesize no tools; builds every other dossier section from the merged checkpoint. Finalized, stored.
 * Each call is one invocation (a search-heavy call runs minutes; a retry in the same invocation would outlive
 * the function) and each is sized to fit the output budget: at most RESEARCH_VERBATIM_CAP verbatims a pass.
 * A truncated output checkpoints a retry flag and asks for another invocation, which runs the same pass or
 * phase again with tighter caps (and, for synthesis, one rung less effort); a second truncation fails the
 * attempt. Code enforces what code can: themes with fewer than three quotes are low confidence, objections
 * without a verbatim move to unsourced hypotheses, sources are merged.
 */
import { z } from "zod";
import { lowerEffort, MAX_TOKENS_PER_CALL, STEP_DEFAULTS } from "../config.ts";
import { callModel, TruncatedError } from "../llm.ts";
import researchPrompt from "../prompts/research.v6.ts";
import { resolvePrompt } from "../prompts/types.ts";
import { OfferBrief } from "../schemas/brief.ts";
import { Dossier, ResearchCollect, ResearchSynthesis } from "../schemas/research.ts";
import { answersFromDossier, ledgerRowsFromDossier, verbatimKey } from "../research/answers.ts";
import { remainingBudgetMs } from "./budget.ts";
import type { StepContext, StepFn, StepResult } from "./types.ts";

export const RESEARCH_VERBATIM_CAP = 30;
export const RESEARCH_RETRY_VERBATIM_CAP = 15;
export const COLLECT_PASSES = 2;

export const COLLECT_RETRY_REASON = "The verbatim table ran past the output budget; retrying with fewer verbatims";
export const SYNTHESIZE_RETRY_REASON = "The dossier ran past the output budget; retrying with tighter caps";

/** The checkpoint between invocations (generation_steps.output.partial). */
export const ResearchPartial = z.object({
  phase: z.enum(["collect", "synthesize"]),
  /** collect only: which pass runs next (1 or 2). */
  pass: z.number().int().min(1).max(COLLECT_PASSES).optional(),
  retry: z.boolean().optional(),
  /** What earlier passes collected (collect pass 2 and synthesize). */
  collect: ResearchCollect.optional(),
});
export type ResearchPartial = z.infer<typeof ResearchPartial>;

export function parseResearchPartial(p: unknown): ResearchPartial | null {
  const r = ResearchPartial.safeParse(p);
  return r.success ? r.data : null;
}

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

/** Pages the search and fetch tools reported, added to the sources the model listed (first listing wins). */
export function mergeSources(listed: Dossier["sources"], extra: { url: string; title?: string | null }[]): Dossier["sources"] {
  const byUrl = new Map<string, Dossier["sources"][number]>();
  for (const s of listed) if (s.url && !byUrl.has(s.url)) byUrl.set(s.url, s);
  for (const s of extra) if (s.url && !byUrl.has(s.url)) byUrl.set(s.url, { url: s.url, title: s.title ?? null, kind: null });
  return [...byUrl.values()];
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

  return Dossier.parse({ ...d, verbatims, themes, objection_map, resident_emotion, unsourced_hypotheses: [...new Set(unsourced)], sources: mergeSources(d.sources, extraSources) });
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Pass 2 continues pass 1: ids keep counting, vocabulary is the union, sources and findings are appended. */
export function mergeCollects(a: ResearchCollect | undefined, b: ResearchCollect): ResearchCollect {
  if (!a) return b;
  return {
    cluster_vocabulary: [...new Set([...a.cluster_vocabulary, ...b.cluster_vocabulary].map((t) => t.trim()).filter(Boolean))],
    verbatims: [...a.verbatims, ...b.verbatims],
    findings: [...a.findings, ...b.findings],
    sources: mergeSources(a.sources, b.sources),
  };
}

/**
 * A refresh builds on what earlier research found: the active dossier's verbatims that this run did not collect
 * again are carried into the collect (ids prefixed P so they never collide with the new V ids), with their
 * sources, before synthesis. The first run of an offer has no prior dossier and is unchanged.
 */
export function carryPriorResearch(collect: ResearchCollect, prior: Dossier | null | undefined): ResearchCollect {
  if (!prior || prior.verbatims.length === 0) return collect;
  const seen = new Set(collect.verbatims.map((v) => verbatimKey(v.text)));
  const carried: ResearchCollect["verbatims"] = [];
  for (const v of prior.verbatims) {
    const key = verbatimKey(v.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    carried.push({ ...v, id: `P${carried.length + 1}` });
  }
  if (carried.length === 0) return collect;
  return { ...collect, verbatims: [...collect.verbatims, ...carried], sources: mergeSources(collect.sources, prior.sources.map((x) => ({ url: x.url, title: x.title }))) };
}

export function makeResearchStep(deps: Partial<ResearchDeps> = {}): StepFn {
  const call = deps.call ?? callModel;
  return async (ctx) => {
    const brief = requireBrief(ctx);
    const claims = ctx.claims.filter((c) => c.user_decision !== "drop");
    const fetchFirst = fetchFirstUrls(brief);
    const p = resolvePrompt(ctx, researchPrompt);
    const d = STEP_DEFAULTS.research;
    const effort = p.effort ?? d.effort;
    const maxTokens = Math.min(p.maxTokens ?? d.maxTokens, MAX_TOKENS_PER_CALL);
    const partial: ResearchPartial = parseResearchPartial(ctx.partial) ?? { phase: "collect" };
    const retry = !!partial.retry;
    const common = { brief, claims, config: ctx.config, fetchFirst };
    const log = (purpose: string) => ({
      db: ctx.db,
      workspaceId: ctx.generation.workspace_id,
      generationId: ctx.generation.id,
      step: "research" as const,
      attempt: ctx.attempt,
      purpose,
      promptVersionId: p.promptVersionId,
    });

    if (partial.phase === "collect") {
      const pass = partial.pass ?? 1;
      const prior = partial.collect;
      const verbatimCap = retry ? RESEARCH_RETRY_VERBATIM_CAP : RESEARCH_VERBATIM_CAP;
      // Searching is reading, not reasoning: two rungs less thinking leaves the budget to the table and keeps a
      // call with eight searches and eight fetches inside the invocation.
      const collectEffort = lowerEffort(lowerEffort(effort));
      const where = pass === 1 ? "what people want to buy (forums, Q&A, comments)" : "what they got (reviews, competitor pages)";
      await ctx.progress(
        `Researching ${brief.product_name} (${pass} of ${COLLECT_PASSES}): ${where}${pass === 2 && fetchFirst.length ? `, ${plural(fetchFirst.length, "page")} from the brief` : ""}${retry ? ` (retry, at most ${verbatimCap} verbatims)` : ""}`,
      );
      let res;
      try {
        res = await call({
          model: p.model ?? d.model,
          effort: collectEffort,
          maxTokens,
          timeoutMs: remainingBudgetMs(ctx),
          system: p.system,
          user: researchPrompt.user(ctx, { ...common, phase: "collect", pass, prior, verbatimCap, retry }),
          schema: ResearchCollect,
          webTools: true,
          log: log(`research.collect${pass}${retry ? ".retry_fewer_verbatims" : ""}`),
        });
      } catch (e) {
        if (!(e instanceof TruncatedError) || retry) throw e;
        const next: ResearchPartial = { phase: "collect", pass, retry: true, ...(prior ? { collect: prior } : {}) };
        await ctx.savePartial(next);
        return { output: next, summary: `collection pass ${pass} ran past the output budget; retrying with fewer verbatims`, continueLater: { reason: COLLECT_RETRY_REASON } };
      }
      const parsed = ResearchCollect.parse(res.output);
      const collect = mergeCollects(prior, { ...parsed, sources: mergeSources(parsed.sources, res.sources) });
      const got = `${plural(parsed.verbatims.length, "verbatim")} from ${plural(parsed.sources.length, "source")}`;
      if (pass < COLLECT_PASSES) {
        const next: ResearchPartial = { phase: "collect", pass: pass + 1, collect };
        await ctx.savePartial(next);
        return { output: next, model: res.model, summary: `pass ${pass}: ${got}; pass ${pass + 1} next`, continueLater: { reason: `Collected ${got} on ${where}; now what they got (reviews, competitor pages)` } };
      }
      const carried = carryPriorResearch(collect, ctx.dossier);
      const next: ResearchPartial = { phase: "synthesize", collect: carried };
      await ctx.savePartial(next);
      const kept = carried.verbatims.length - collect.verbatims.length;
      const summary = `${plural(collect.verbatims.length, "verbatim")} and ${plural(collect.findings.length, "finding")} from ${plural(collect.sources.length, "source")} over ${COLLECT_PASSES} passes${kept ? `, ${plural(kept, "verbatim")} kept from the previous dossier` : ""}; synthesizing next`;
      return { output: next, model: res.model, summary, continueLater: { reason: `Collected ${plural(collect.verbatims.length, "verbatim")} from ${plural(collect.sources.length, "source")}; building the dossier` } };
    }

    const collect = partial.collect;
    if (!collect) throw new Error("research checkpoint has no collected material; requeue the step from research");
    await ctx.progress(`Building the dossier from ${plural(collect.verbatims.length, "verbatim")}${retry ? " (retry with tighter caps)" : ""}`);
    let res;
    try {
      res = await call({
        model: p.model ?? d.model,
        effort: retry ? lowerEffort(effort) : effort,
        maxTokens,
        timeoutMs: remainingBudgetMs(ctx),
        system: p.system,
        user: researchPrompt.user(ctx, { ...common, phase: "synthesize", verbatimCap: collect.verbatims.length, retry, collect }),
        schema: ResearchSynthesis,
        log: log(retry ? "research.synthesize.retry_tighter_caps" : "research.synthesize"),
      });
    } catch (e) {
      if (!(e instanceof TruncatedError) || retry) throw e;
      const next: ResearchPartial = { ...partial, retry: true };
      await ctx.savePartial(next);
      return { output: next, summary: "synthesis ran past the output budget; retrying with tighter caps", continueLater: { reason: SYNTHESIZE_RETRY_REASON } };
    }

    const synthesis = ResearchSynthesis.parse(res.output);
    const dossier = finalizeDossier(Dossier.parse({ ...synthesis, verbatims: collect.verbatims, sources: collect.sources }));
    const clusters = new Set(dossier.verbatims.map((v) => v.desire_cluster).filter((c): c is string => !!c)).size;
    const result: StepResult<Dossier> = {
      output: dossier,
      model: res.model,
      summary: `${plural(dossier.verbatims.length, "verbatim")} in ${plural(clusters, "cluster")} from ${plural(dossier.sources.length, "source")}; ${plural(dossier.themes.length, "theme")}; ${plural(dossier.competitor_table.length, "competitor")}; sophistication stage ${dossier.sophistication.stage}; ${plural(dossier.objection_map.length, "objection")}`,
      effects: { research: { dossier, sources: dossier.sources } },
    };
    // What research settled is not asked of the user again, and the writer can cite it.
    const answers = answersFromDossier(dossier, ctx.questions);
    const rows = ledgerRowsFromDossier(dossier, ctx.claims);
    if (answers.length) result.effects!.answers = answers;
    if (rows.length) result.effects!.claimsToAdd = rows;
    if (answers.length || rows.length) result.summary += `; settled ${answers.length} open question${answers.length === 1 ? "" : "s"} and added ${rows.length} ledger row${rows.length === 1 ? "" : "s"}`;
    return result;
  };
}

export const researchStep: StepFn = makeResearchStep();
