/** Engine configuration. Model per step is overridable through prompt_versions; these are the defaults. */
// deno-lint-ignore no-explicit-any
const g = globalThis as any;
/** Reads an env var in Deno or Node without crashing in the browser. */
export function env(key: string): string | undefined {
  try {
    return g.Deno?.env?.get?.(key) ?? g.process?.env?.[key] ?? undefined;
  } catch {
    return undefined;
  }
}
export const DEFAULT_MODEL = env("ENGINE_DEFAULT_MODEL") ?? "claude-opus-5-5";
export const COLD_READ_MODEL = env("ENGINE_COLD_READ_MODEL") ?? "claude-sonnet-5-5";
export const CHEAP_MODEL = env("ENGINE_CHEAP_MODEL") ?? "claude-haiku-5-5";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";
export const EFFORT_ORDER: readonly Effort[] = ["low", "medium", "high", "xhigh", "max"];

/** One rung down the effort ladder ("low" stays "low"). A retry after a truncated output uses it: thinking and the answer share max_tokens. */
export function lowerEffort(e: Effort): Effort {
  const i = EFFORT_ORDER.indexOf(e);
  return EFFORT_ORDER[Math.max(0, i - 1)] ?? "low";
}

export const STEP_NAMES = [
  "intake",
  "research",
  "offer",
  "argument",
  "draft",
  "tell_edit",
  "cold_read",
  "editorial",
  "mechanical",
  "factual",
  "revise",
  "ship",
] as const;
export type StepName = (typeof STEP_NAMES)[number];

export const STEP_DEFAULTS: Record<StepName, { model: string; effort: Effort; maxTokens: number }> = {
  intake: { model: DEFAULT_MODEL, effort: "medium", maxTokens: 12000 }, // extraction, not reasoning; thinking shares max_tokens with the ledger
  research: { model: DEFAULT_MODEL, effort: "high", maxTokens: 12000 },
  offer: { model: DEFAULT_MODEL, effort: "medium", maxTokens: 12000 },
  argument: { model: DEFAULT_MODEL, effort: "xhigh", maxTokens: 12000 },
  draft: { model: DEFAULT_MODEL, effort: "high", maxTokens: 12000 },
  tell_edit: { model: DEFAULT_MODEL, effort: "high", maxTokens: 12000 }, // the owner's editor: line edits, not a rewrite; medium under-edited on live copy
  cold_read: { model: COLD_READ_MODEL, effort: "medium", maxTokens: 4000 },
  editorial: { model: DEFAULT_MODEL, effort: "high", maxTokens: 12000 }, // xhigh spent the whole budget thinking on the first live runs
  mechanical: { model: CHEAP_MODEL, effort: "low", maxTokens: 1000 }, // code path; model unused
  factual: { model: DEFAULT_MODEL, effort: "high", maxTokens: 12000 },
  revise: { model: DEFAULT_MODEL, effort: "high", maxTokens: 12000 },
  ship: { model: CHEAP_MODEL, effort: "low", maxTokens: 1000 }, // code path; model unused
};

/** Hard caps that keep one invocation inside the Edge Function wall clock. */
export const MAX_TOKENS_PER_CALL = 12000;
export const MAX_REVISION_CYCLES = 3; // the copy chief's objection is fixed by the engine, not handed to the user, up to three times
export const MAX_STEP_ATTEMPTS = 3;
export const REQUEST_TIMEOUT_MS = 380_000;
export const WEB_SEARCH_MAX_USES = 8;
export const WEB_FETCH_MAX_USES = 8;
/** The worker fails a generation whose model calls have cost this much; a runaway loop never bills past it. */
export const MAX_GENERATION_COST_USD = 25;
