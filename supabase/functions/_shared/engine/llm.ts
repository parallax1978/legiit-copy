/**
 * The only place the engine talks to Anthropic. Every call is logged to llm_calls with tokens and cost.
 * - adaptive thinking (default on current models), effort per step
 * - structured outputs through output_config.format (zod), validated again client-side
 * - server-side refusal fallbacks ("default" mode)
 * - optional server tools: web_search / web_fetch
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Db } from "../supabase.ts";
import { costUsd } from "./cost.ts";
import { MAX_TOKENS_PER_CALL, REQUEST_TIMEOUT_MS, WEB_FETCH_MAX_USES, WEB_SEARCH_MAX_USES, type Effort } from "./config.ts";
import { splitCached } from "./prompts/types.ts";

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
  /** Hard deadline for this call. Set it from the invocation's remaining budget; the SDK then makes no retries. */
  timeoutMs?: number;
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

  // Cache TTL: the pipeline's calls on one generation are minutes apart (a queue redelivery is 7.5 minutes), so
  // the default 5-minute cache would rarely be hit; an hour covers a whole generation at 2x write, 0.1x read.
  const cacheControl = { type: "ephemeral" as const, ttl: "1h" as const };
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: opts.system, ...(opts.cacheSystem !== false ? { cache_control: cacheControl } : {}) },
  ];
  // User message: [stable material, cached][this call's task]; see CACHE_BREAK in prompts/types.ts.
  const userContent: Anthropic.Beta.BetaContentBlockParam[] = typeof opts.user === "string"
    ? (() => {
      const { cached, task } = splitCached(opts.user);
      return cached ? [{ type: "text", text: cached, cache_control: cacheControl }, { type: "text", text: task }] : [{ type: "text", text: task }];
    })()
    : opts.user;

  // Structured outputs: the API compiles the schema into a grammar and rejects schemas with more than
  // MAX_UNION_PARAMS nullable/union-typed fields. Large schemas fall back to prompt-described JSON that we
  // validate client-side with the same zod schema (the model sees the JSON Schema in the system prompt).
  const fmt = opts.schema ? zodOutputFormat(opts.schema) : undefined;
  const fmtSchema = fmt ? (fmt as unknown as { schema?: unknown }).schema ?? fmt : undefined;
  let nativeFormat = !!fmt && countUnionParams(fmtSchema) <= MAX_UNION_PARAMS;
  const promptSchema = opts.schema && !nativeFormat ? promptJsonSchema(opts.schema) : undefined;

  const buildParams = (useNative: boolean) => {
    // The JSON-format instruction (schema included) goes at the end of the user message, never in the system
    // block: two calls of one step with different schemas then share the cached system and material blocks.
    const systemBlocks: Anthropic.Beta.BetaTextBlockParam[] = system;
    const content: Anthropic.Beta.BetaContentBlockParam[] = useNative || !opts.schema
      ? userContent
      : [...userContent, { type: "text", text: jsonOnlyInstruction(promptSchema ?? promptJsonSchema(opts.schema!)) }];
    // deno-lint-ignore no-explicit-any
    const p: any = {
      model: opts.model,
      max_tokens: maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: systemBlocks,
      messages: [{ role: "user", content }],
      output_config: { effort: opts.effort, ...(useNative && fmt ? { format: fmt } : {}) },
      ...(tools ? { tools } : {}),
    };
    return p;
  };

  const reqOpts = opts.timeoutMs ? { timeout: opts.timeoutMs, maxRetries: 0 } : undefined;
  let response: Anthropic.Beta.BetaMessage;
  let error: string | null = null;
  try {
    try {
      response = await client.beta.messages.create(buildParams(nativeFormat), reqOpts);
    } catch (e) {
      // The union-count heuristic can be off; if the API rejects the schema, retry once with the prompt-described form.
      if (nativeFormat && e instanceof Anthropic.BadRequestError && /union types|output_config|format/i.test(e.message)) {
        nativeFormat = false;
        response = await client.beta.messages.create(buildParams(false), reqOpts);
      } else {
        throw e;
      }
    }
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

/** The API's limit on nullable/union-typed parameters in a structured-output schema. */
export const MAX_UNION_PARAMS = 16;

/** Counts schema properties typed as a union (anyOf, oneOf, or a type array such as ["string","null"]). */
export function countUnionParams(schema: unknown): number {
  let n = 0;
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const x of node) walk(x);
      return;
    }
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    if (Array.isArray(o.type) && o.type.length > 1) n += 1;
    if (Array.isArray(o.anyOf) || Array.isArray(o.oneOf)) n += 1;
    for (const [k, v] of Object.entries(o)) {
      if (k === "type") continue;
      walk(v);
    }
  };
  walk(schema);
  return n;
}

/**
 * The JSON Schema a model is shown when a schema cannot use native structured outputs. Built from the zod
 * input side, so fields with defaults are optional in `required` and carry their `default`: the model can
 * omit them, and zod fills them in on parse. (The SDK's output-format schema marks every field required.)
 */
export function promptJsonSchema(schema: z.ZodTypeAny): unknown {
  const js = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  delete js.$schema;
  return js;
}

export function jsonOnlyInstruction(schema: unknown): string {
  return [
    "OUTPUT FORMAT: respond with exactly one JSON object and nothing else: no prose before or after it, no code fences, no comments.",
    "Write compact JSON: no indentation and no line breaks between tokens. Strings must be valid JSON strings.",
    "Every key named in an object's `required` list must be present; use null where the schema allows null and you have nothing to put. A key not named in `required` has a `default`: leave it out entirely when its value would be that default (null, false or an empty object) and write it only when you have a real value.",
    "The object must validate against this JSON Schema:",
    JSON.stringify(schema),
  ].join("\n");
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
