/**
 * Wall-clock arithmetic for steps that make long model calls. A call that outlives the invocation is pure
 * waste (the worker is shut down, the call is billed, nothing is persisted), so a step hands the model client a
 * timeout equal to what is left of its budget, with a reserve for persisting the result.
 */
import { REQUEST_TIMEOUT_MS } from "../config.ts";
import type { StepContext } from "./types.ts";

export const PERSIST_RESERVE_MS = 15_000;
export const MIN_CALL_TIMEOUT_MS = 30_000;

/** Milliseconds a model call started now may take; never below MIN_CALL_TIMEOUT_MS, never above the client default. */
export function remainingBudgetMs(ctx: Pick<StepContext, "timeBudgetMs" | "startedAt">, now: number = Date.now()): number {
  const left = ctx.timeBudgetMs - (now - ctx.startedAt) - PERSIST_RESERVE_MS;
  if (!Number.isFinite(left)) return REQUEST_TIMEOUT_MS;
  return Math.min(REQUEST_TIMEOUT_MS, Math.max(MIN_CALL_TIMEOUT_MS, Math.floor(left)));
}
