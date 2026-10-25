import type { StepName } from "../config.ts";
import type { StepContext } from "../steps/types.ts";

/**
 * A prompt module. `system` is stable across calls (cached); `user` carries the per-generation material.
 * prompt_versions.template, when active for the step, REPLACES `system` (the DB wins), so system text must
 * be self-contained and must not reference variables.
 */
export interface PromptModule<Args = Record<string, unknown>> {
  step: StepName | string;
  version: number;
  model?: string;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens?: number;
  system: string;
  user: (ctx: StepContext, args: Args) => string;
}

/**
 * Prompt caching is a prefix match, so every user message is built as [stable material][break][this call's
 * task]. The wrapper turns the text before the marker into a cached content block (1h TTL) and the rest into an
 * uncached one; calls of the same step in the same generation (retries, continuations, section groups,
 * scoring after candidates, review cycles) then read the material at a tenth of the price. Material must be
 * rendered identically every time: same order, same renderers, nothing that varies per call before the marker.
 */
export const CACHE_BREAK = "<<<cache-break>>>";

export function splitCached(user: string): { cached: string | null; task: string } {
  const i = user.indexOf(CACHE_BREAK);
  if (i < 0) return { cached: null, task: user };
  const cached = user.slice(0, i).trim();
  const task = user.slice(i + CACHE_BREAK.length).trim();
  if (!cached) return { cached: null, task };
  if (!task) return { cached: null, task: cached };
  return { cached, task };
}

export function resolvePrompt<A>(ctx: StepContext, mod: PromptModule<A>) {
  const pv = ctx.promptVersions[mod.step];
  return {
    system: pv?.template ?? mod.system,
    model: pv?.model ?? mod.model,
    effort: (pv?.effort as PromptModule["effort"]) ?? mod.effort,
    maxTokens: pv?.max_tokens ?? mod.maxTokens,
    promptVersionId: pv?.id ?? null,
    version: pv?.version ?? mod.version,
  };
}
