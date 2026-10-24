/** List prices in USD per million tokens (Anthropic first-party API). Update here only. */
export const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
};
export const WEB_SEARCH_PRICE_PER_CALL = 0.01; // $10 per 1,000 searches

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  web_searches?: number;
}

export function costUsd(model: string, u: Usage): number {
  const p = PRICES[model] ?? PRICES["claude-opus-5-5"];
  const m = 1_000_000;
  return (
    (u.input_tokens / m) * p.input +
    (u.output_tokens / m) * p.output +
    ((u.cache_read_input_tokens ?? 0) / m) * p.cacheRead +
    ((u.cache_creation_input_tokens ?? 0) / m) * p.cacheWrite +
    (u.web_searches ?? 0) * WEB_SEARCH_PRICE_PER_CALL
  );
}
