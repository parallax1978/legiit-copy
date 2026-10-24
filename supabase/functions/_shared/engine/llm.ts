/**
 * The only place the engine talks to Anthropic. Every call is logged to llm_calls with tokens and cost.
 * - adaptive thinking (default on current models), effort per step
 * - structured outputs through output_config.format (zod), validated again client-side
 * - server-side refusal fallbacks ("default" mode)
 * - optional server tools: web_search / web_fetch
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import type { Db } from "../supabase.ts";
import { costUsd } from "./cost.ts";
import { MAX_TOKENS_PER_CALL, REQUEST_TIMEOUT_MS, WEB_FETCH_MAX_USES, WEB_SEARCH_MAX_USES, type Effort } from "./config.ts";

export interface CallLog {
  db?: Db;
  workspaceId?: string | null;
  generationId?: string | null;
  evalOutputId?: string | null;
  step?: string;
  attempt?: number;
  purpose: string;
  promptVersionId?: string | null;
}

export interface CallOptions<T extends z.ZodTypeAny | undefined> {
  model: string;
  effort: Effort;
  maxTokens?: number;
  system: string;
  user: string | Anthropic.Beta.BetaContentBlockParam[];
  schema?: T;
  webTools?: boolean;
  allowedDomains?: string[];
  cacheSystem?: boolean;
  log: CallLog;
}

export interface CallResult<T> {
  output: T;
  text: string;
  model: string;
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number; web_searches: number };
  costUsd: number;
  latencyMs: number;
  stopReason: string | null;
  requestId: string | null;
  sources: { url: string; title?: string }[];
}

export class RefusalError extends Error {
  constructor(public category: string | null, public explanation: string | null) {
    super(`model refused: ${category ?? "unknown"} ${explanation ?? ""}`.trim());
  }
}
export class TruncatedError extends Error {
  constructor(public partialText: string) {
    super("output hit max_tokens");
  }
}

let _client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (_client) return _client;
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");
  _client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 2 });
  return _client;
}

type Infer<T> = T extends z.ZodTypeAny ? z.infer<T> : string;

export async function callModel<T extends z.ZodTypeAny | undefined = undefined>(opts: CallOptions<T>): Promise<CallResult<Infer<T>>> {
  const client = anthropic();
  const started = Date.now();
  const maxTokens = Math.min(opts.maxTokens ?? MAX_TOKENS_PER_CALL, MAX_TOKENS_PER_CALL);

  const tools = opts.webTools
    ? [
        { type: "web_search_20260209" as const, name: "web_search" as const, max_uses: WEB_SEARCH_MAX_USES, ...(opts.allowedDomains ? { allowed_domains: opts.allowedDomains } : {}) },
        { type: "web_fetch_20260209" as const, name: "web_fetch" as const, max_uses: WEB_FETCH_MAX_USES },
      ]
    : undefined;

  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: opts.system, ...(opts.cacheSystem !== false ? { cache_control: { type: "ephemeral" as const } } : {}) },
  ];

  // deno-lint-ignore no-explicit-any
  const params: any = {
    model: opts.model,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    messages: [{ role: "user", content: typeof opts.user === "string" ? [{ type: "text", text: opts.user }] : opts.user }],
    output_config: { effort: opts.effort, ...(opts.schema ? { format: zodOutputFormat(opts.schema) } : {}) },
    ...(tools ? { tools } : {}),
  };

  let response: Anthropic.Beta.BetaMessage;
  let error: string | null = null;
  try {
    response = await client.beta.messages.create(params);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    await logCall(opts, { model: opts.model, usage: null, costUsd: 0, latencyMs: Date.now() - started, stopReason: null, requestId: null, error });
    throw e;
  }

  const text = response.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n");
  const sources: { url: string; title?: string }[] = [];
  let webSearches = 0;
  for (const b of response.content) {
    // deno-lint-ignore no-explicit-any
    const anyB = b as any;
    if (anyB.type === "server_tool_use" && anyB.name === "web_search") webSearches += 1;
    if (anyB.type === "web_search_tool_result" && Array.isArray(anyB.content)) {
      for (const r of anyB.content) if (r?.url) sources.push({ url: r.url, title: r.title });
    }
    if (anyB.type === "web_fetch_tool_result" && anyB.content?.url) sources.push({ url: anyB.content.url });
  }
  const usage = {
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
    cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
    web_searches: webSearches,
  };
  const cost = costUsd(response.model, usage);
  const latencyMs = Date.now() - started;
  const requestId = (response as unknown as { _request_id?: string })._request_id ?? null;

  await logCall(opts, { model: response.model, usage, costUsd: cost, latencyMs, stopReason: response.stop_reason, requestId, error: null });

  if (response.stop_reason === "refusal") {
    const sd = (response as unknown as { stop_details?: { category?: string | null; explanation?: string | null } }).stop_details;
    throw new RefusalError(sd?.category ?? null, sd?.explanation ?? null);
  }
  if (response.stop_reason === "max_tokens") throw new TruncatedError(text);

  let output: unknown = text;
  if (opts.schema) {
    const parsed = safeJson(text);
    const result = opts.schema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`structured output failed validation: ${result.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    }
    output = result.data;
  }
  return { output: output as Infer<T>, text, model: response.model, usage, costUsd: cost, latencyMs, stopReason: response.stop_reason, requestId, sources: dedupeSources(sources) };
}

function safeJson(text: string): unknown {
  const t = text.trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1));
    throw new Error("model did not return JSON");
  }
}

function dedupeSources(s: { url: string; title?: string }[]) {
  const seen = new Set<string>();
  return s.filter((x) => (seen.has(x.url) ? false : (seen.add(x.url), true)));
}

async function logCall(
  opts: CallOptions<z.ZodTypeAny | undefined>,
  r: { model: string; usage: CallResult<unknown>["usage"] | null; costUsd: number; latencyMs: number; stopReason: string | null; requestId: string | null; error: string | null },
) {
  const db = opts.log.db;
  if (!db) return;
  try {
    await db.from("llm_calls").insert({
      workspace_id: opts.log.workspaceId ?? null,
      generation_id: opts.log.generationId ?? null,
      eval_output_id: opts.log.evalOutputId ?? null,
      step: opts.log.step ?? null,
      attempt: opts.log.attempt ?? null,
      purpose: opts.log.purpose,
      model: r.model,
      prompt_version_id: opts.log.promptVersionId ?? null,
      input_tokens: r.usage?.input_tokens ?? 0,
      output_tokens: r.usage?.output_tokens ?? 0,
      cache_read_tokens: r.usage?.cache_read_input_tokens ?? 0,
      cache_write_tokens: r.usage?.cache_creation_input_tokens ?? 0,
      web_searches: r.usage?.web_searches ?? 0,
      cost_usd: r.costUsd,
      latency_ms: r.latencyMs,
      stop_reason: r.stopReason,
      request_id: r.requestId,
      error: r.error,
    });
  } catch (e) {
    console.error("llm_calls insert failed", e);
  }
}

/** Embeddings through the Supabase edge runtime's built-in model (384 dims). Falls back to null outside the runtime. */
export async function embed(text: string): Promise<number[] | null> {
  // deno-lint-ignore no-explicit-any
  const g = globalThis as any;
  if (!g.Supabase?.ai?.Session) return null;
  const session = new g.Supabase.ai.Session("gte-small");
  const out = await session.run(text.slice(0, 8000), { mean_pool: true, normalize: true });
  return Array.from(out as number[]);
}
