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
