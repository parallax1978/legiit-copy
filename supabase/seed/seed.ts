/**
 * Seeds a Supabase project with the research artifacts and the default prompt versions.
 * Run:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... deno run --allow-read --allow-env --allow-net supabase/seed/seed.ts [--admin you@example.com]
 * Idempotent: rows are upserted on external_id; prompt versions are inserted once per (step, version).
 */
import { createClient } from "jsr:@supabase/supabase-js@^2.58.0";
import { parseArgs } from "jsr:@std/cli@^1.0.0/parse-args";

const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const db = createClient(url, key, { auth: { persistSession: false } });
const args = parseArgs(Deno.args, { string: ["admin", "root"] });
const root = args.root ?? new URL("../../", import.meta.url).pathname;

async function readJson(path: string): Promise<unknown[] | null> {
  try {
    const t = await Deno.readTextFile(root + path);
    const j = JSON.parse(t);
    return Array.isArray(j) ? j : (j.pairs ?? j.records ?? j.items ?? Object.values(j).find(Array.isArray) ?? null);
  } catch (e) {
    console.warn(`skip ${path}: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

function clip(s: unknown, n = 400): string | null {
  if (typeof s !== "string") return null;
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// ---- critiques ----
for (const file of ["research/critique_pairs_v0.json", "research/corpus/critique_pairs_v1.json"]) {
  const rows = await readJson(file);
  if (!rows) continue;
  // deno-lint-ignore no-explicit-any
  const mapped = rows.map((r: any) => ({
    external_id: r.id,
    source: r.source ?? null,
    source_url: r.url ?? r.source_url ?? null,
    chief: r.chief ?? null,
    format: r.format ?? null,
    weak_draft: r.before ?? null,
    strong_revision: r.after ?? null,
    quote_status: r.quote_status ?? null,
    defect: r.defect ?? null,
    defect_named: r.defect_named ?? null,
    principle: r.principle ?? null,
    reason: r.reason ?? null,
    tested: r.tested ?? null,
    evidence: r.evidence ?? null,
    confidence: r.confidence ?? null,
    ai_failure_map: r.ai_failure_map ?? [],
    status: "curated",
  })).filter((r) => r.external_id);
  const { error } = await db.from("critiques").upsert(mapped, { onConflict: "external_id" });
  console.log(file, error ? `ERROR ${error.message}` : `${mapped.length} rows`);
}

// ---- controls ----
for (const file of ["controls_sales_letters", "controls_emails", "controls_webinar_vsl", "controls_ads_social", "controls_other_formats"]) {
  const rows = await readJson(`research/corpus/${file}.json`);
  if (!rows) continue;
  // deno-lint-ignore no-explicit-any
  const mapped = rows.map((r: any) => ({
    external_id: r.id,
    workspace_id: null,
    title: r.title ?? "untitled",
    author: r.author_or_company ?? r.author ?? null,
    format: r.format ?? "other",
    market: r.market ?? null,
    funnel_position: r.funnel_position ?? null,
    traffic: r.traffic ?? null,
    source_url: r.source_url ?? null,
    rights_status: r.rights_status ?? "unknown",
    excerpt: clip(r.excerpt),
    full_text: ["public_domain", "licensed"].includes(r.rights_status) ? (r.full_text ?? null) : null,
    structure: r.structure ?? {},
    results: r.results ?? {},
    losing_variants: r.losing_variants ?? [],
    lessons: r.lessons ?? [],
    notes: r.notes ?? null,
    verification: r.verification ?? r.results?.type ?? null,
  })).filter((r) => r.external_id);
  const { error } = await db.from("controls").upsert(mapped, { onConflict: "external_id" });
  console.log(file, error ? `ERROR ${error.message}` : `${mapped.length} rows`);
}

// ---- split-test pairs (ground truth for the judge); every 4th pair is held out ----
for (const file of ["split_tests_pages", "split_tests_email_ads_sms"]) {
  const rows = await readJson(`research/corpus/${file}.json`);
  if (!rows) continue;
  // deno-lint-ignore no-explicit-any
  const mapped = rows.map((r: any, i: number) => ({
    external_id: r.id,
    source: r.source ?? null,
    source_url: r.source_url ?? null,
    format: r.format ?? null,
    element_tested: r.element_tested ?? null,
    variant_a: clip(r.variant_a, 2000),
    variant_b: clip(r.variant_b, 2000),
    winner: r.winner === "a" || r.winner === "b" ? r.winner : null,
    lift: r.lift ?? null,
    metric: r.metric ?? null,
    sample_size: r.sample_size ?? null,
    confidence: r.confidence ?? null,
    why_it_won: r.why_it_won ?? null,
    principle: r.principle ?? null,
    contradicts_standard: !!r.contradicts_standard,
    verification: r.verification ?? null,
    holdout: i % 4 === 0,
  })).filter((r) => r.external_id && r.winner);
  const { error } = await db.from("split_test_pairs").upsert(mapped, { onConflict: "external_id" });
  console.log(file, error ? `ERROR ${error.message}` : `${mapped.length} rows`);
}

// ---- eval briefs ----
const FORMAT_ALIASES: Record<string, string> = { short_landing_page: "landing_page_short", landing_page: "landing_page_short", b2b_pricing_page: "pricing_page", webinar: "webinar_package", upsell_oto: "upsell", oto: "upsell", opt_in_page: "optin", opt_in: "optin", email: "email_single", sales_page: "sales_letter", vsl: "vsl_long", facebook_ad: "meta_ad", instagram_ad: "meta_ad", tiktok: "tiktok_reels", social_post: "organic_social" };
{
  const rows = await readJson("research/corpus/eval_briefs.json");
  if (rows) {
    // deno-lint-ignore no-explicit-any
    const mapped = rows.map((r: any) => ({
      external_id: r.id,
      name: r.offer_name ?? r.name ?? r.id,
      brief: r,
      market: r.market ?? null,
      formats: ((r.formats_to_test ?? ["email_single", "sales_letter"]) as string[]).map((f) => FORMAT_ALIASES[f] ?? f),
      notes: r.notes ?? null,
    })).filter((r) => r.external_id);
    const { error } = await db.from("eval_briefs").upsert(mapped, { onConflict: "external_id" });
    console.log("eval_briefs", error ? `ERROR ${error.message}` : `${mapped.length} rows`);
  }
}

// ---- default prompt versions (v1 from the engine's prompt modules), active if none active ----
try {
  const steps = ["intake", "research", "offer", "argument", "draft", "cold_read", "editorial", "factual", "revise"];
  for (const step of steps) {
    try {
      const mod = await import(`${root}supabase/functions/_shared/engine/prompts/${step}.v1.ts`);
      const p = mod.default;
      if (!p?.system) continue;
      const { data: existing } = await db.from("prompt_versions").select("id").eq("step", step).eq("version", p.version ?? 1).maybeSingle();
      if (existing) continue;
      const { data: anyActive } = await db.from("prompt_versions").select("id").eq("step", step).eq("active", true).maybeSingle();
      const { error } = await db.from("prompt_versions").insert({ step, version: p.version ?? 1, template: p.system, model: p.model ?? "claude-opus-5-5", effort: p.effort ?? "high", max_tokens: p.maxTokens ?? 12000, active: !anyActive, notes: "seeded from engine prompt module" });
      console.log(`prompt ${step} v${p.version ?? 1}`, error ? `ERROR ${error.message}` : "ok");
    } catch (e) {
      console.warn(`prompt module for ${step} not found (${e instanceof Error ? e.message.split("\n")[0] : e})`);
    }
  }
} catch (e) {
  console.warn("prompt seeding skipped", e);
}

// ---- first admin ----
if (args.admin) {
  const { data: prof } = await db.from("profiles").select("id").ilike("email", args.admin).maybeSingle();
  if (!prof) console.warn(`no profile for ${args.admin}; sign in once first, then re-run with --admin`);
  else {
    const { error } = await db.from("app_admins").upsert({ user_id: prof.id });
    console.log("admin", args.admin, error ? `ERROR ${error.message}` : "ok");
  }
}
console.log("seed complete");
