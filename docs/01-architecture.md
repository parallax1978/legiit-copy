# Architecture

Supabase is the backend of record: Postgres, Auth, Storage, Edge Functions, Queues, Realtime, and secrets. Next.js on Vercel is the UI. All model calls happen inside Edge Functions so there is exactly one place where keys live, spend is logged, and prompts are versioned.

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Web app | Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui, TipTap editor | Hosted on Vercel. Server components and server actions talk to Supabase with the user's session (RLS enforced). |
| Auth | Supabase Auth: magic link + Google | Session cookies via `@supabase/ssr` |
| Database | Supabase Postgres with `pgvector`, `pgmq`, `pg_cron`, `pg_net` | Migrations in `supabase/migrations`, managed by the Supabase CLI only |
| Files | Supabase Storage, private buckets | Uploaded offer sources; exports are generated on demand |
| Jobs | Supabase Queues (pgmq) + pg_cron + pg_net → Edge Function `run-step` | Same pattern Supabase documents for automatic embeddings; retries come free from visibility timeouts |
| AI | `@anthropic-ai/sdk` (npm specifier) inside Deno Edge Functions | Default model `claude-opus-5-5`, adaptive thinking, effort per step, structured outputs via `output_config.format`, server-side `web_search_20260209` and `web_fetch_20260209` for research. Server-side `fallbacks: "default"` enabled so a safety refusal reroutes instead of failing the job. |
| Embeddings | Supabase built-in `gte-small` in the edge runtime | Zero extra vendor for teaching-library retrieval. Swap to Voyage/OpenAI later if retrieval quality demands it. |
| Realtime | Supabase Realtime on `generations` rows | Progress timeline without polling |
| Email | Resend (also as Supabase Auth SMTP) | |
| Errors / analytics | Sentry; PostHog later | |
| CI | GitHub Actions | lint, typecheck, unit tests, `supabase db lint`, edge function deploy on `main` |

## 2. Repository layout

```
apps/web/                      Next.js app
supabase/
  config.toml
  migrations/                  SQL migrations (schema, RLS, triggers, cron)
  seed/                        dev seed: sample offer, a few examples, eval briefs
  functions/
    _shared/
      engine/                  THE ENGINE (Deno TS; runs in edge + local CLI)
        formats/               one spec per copy format (structure, schema, rubric notes)
        prompts/               versioned prompt templates per step
        schemas/               zod schemas for every step input/output
        steps/                 research, angle, draft, editorial, factual, revise
        retrieval.ts           teaching-library retrieval
        llm.ts                 Anthropic client wrapper: logging, cost, retries
      supabase.ts              service-role client factory
    run-step/                  queue consumer: executes one pipeline step
    ingest-source/             URL/file → text → extraction
    rewrite-passage/           targeted rewrite
    embed/                     embeddings for examples and research chunks
    judge/                     LLM-as-judge for eval runs
    export/                    DOCX/HTML rendering
  tests/                       Deno tests for engine
tools/
  engine-cli/                  `deno run` harness: run a brief through the pipeline locally
docs/                          these documents
```

The engine is written once in Deno-compatible TypeScript and imported by both the edge functions and the local CLI, so Phase 1 (engine prototype) does not need the web app at all. The web app imports only the zod schemas and format specs (plain TS, no Deno APIs) to render structured drafts.

## 3. Data model

All tenant tables carry `workspace_id` and are protected by RLS (`exists (select 1 from workspace_members where workspace_id = row.workspace_id and user_id = auth.uid())`). Admin tables are readable only by `app_admins`.

### Tenant
| Table | Purpose |
|---|---|
| `workspaces`, `workspace_members(role)` | Tenancy |
| `profiles` | Display name, onboarding state |
| `offers` | Name, status, structured brief (jsonb), audience, price, guarantee, positioning |
| `offer_sources` | URL or storage path, extracted text, extraction status |
| `offer_claims` | Claims ledger: text, type, evidence (source ref + quote), status (verified/unverified/prohibited), created_by (system/user) |
| `offer_research` | Research dossier (jsonb) with sources; versioned, one active |
| `offer_questions` | Missing-info questions and answers |
| `voice_profiles` | Samples and derived style guide |
| `generations` | One job: offer_id, format, purpose, options, status, current_step, progress_message, selected_angle_id, cost, token totals, prompt_version_set |
| `generation_steps` | One row per step attempt: step, attempt, status, input_hash, output (jsonb), model, tokens, cost, duration, error |
| `angles` | The three candidate arguments per generation with scores and the selection rationale |
| `drafts` | Versions of the copy: generation_id, version, origin (system/user/rewrite), blocks (jsonb), markdown, created_by |
| `draft_flags` | Factual and editorial flags on a draft version: quote, issue, severity, suggested fix, resolved |
| `draft_feedback` | User thumbs/reason per draft |
| `usage_events` | Per-workspace meter: generation completed, tokens, cost (feeds limits later) |

### Internal / admin
| Table | Purpose |
|---|---|
| `app_admins` | user_ids with admin access |
| `examples` | Teaching library: format, market, selling situation tags, awareness level, full text, annotations (jsonb), results notes, source, embedding |
| `critiques` | Brief, weak draft, strong revision, reasons (jsonb), tags, embedding |
| `prompt_versions` | step, version, template, model, effort, max_tokens, active, notes |
| `eval_briefs` | Unseen offers used only for evaluation |
| `eval_runs`, `eval_outputs` | A prompt-version set run over all eval briefs |
| `eval_comparisons` | Blind pairwise judgments: output_a, output_b, winner, reason, judged_by (human or judge model) |
| `llm_calls` | Every model call: step, generation_id or eval_output_id, model, prompt_version, input/output/cache tokens, cost, latency, stop_reason, request_id |

## 4. The engine: pipeline steps

Each step is a pure function `(input) → output` with zod-validated JSON on both sides, persisted in `generation_steps`. A step never reads the previous step's prose from the prompt history; it reads the stored structured output. That keeps every step re-runnable and lets "try another angle" restart from step 2.

| # | Step | Inputs | Output (stored) | Model / tools |
|---|---|---|---|---|
| 0 | Intake | Sources text | Offer brief, claims ledger, open questions | Opus 5.5, structured output |
| 1 | Research | Brief, claims | Dossier: verbatim customer language with sources, desires, frustrations, objections, competing options, awareness and sophistication level, proof inventory | Opus 5.5 + web search/fetch, effort high |
| 2 | Argument | Brief, dossier, claims, retrieved examples | Three candidate arguments (core desire, promise, mechanism, proof path, why-now, big idea / hook), scored on the rubric, one selected with rationale | Opus 5.5, effort xhigh |
| 3 | Draft | Selected argument, format spec, voice profile, retrieved examples | Structured draft (blocks) + markdown | Opus 5.5, effort high, max_tokens sized per format; long formats are drafted in sections |
| 4 | Editorial review | Draft, argument, rubric | Scores per rubric item and at most 8 specific revision instructions (quote → instruction) | Opus 5.5, effort xhigh |
| 5 | Factual review | Draft, claims ledger, prohibited-claims policy | Flags: quote, issue, severity, suggested fix. Nothing else. | Opus 5.5 (Sonnet 5.5 candidate) |
| 6 | Revise | Draft + instructions + flags | Revised draft; unresolved questions for the user | Opus 5.5, effort high |

Steps 4 and 5 run in parallel. Steps 4–6 loop at most twice; the loop stops early when editorial scores clear the threshold and no high-severity flags remain. Step 0 and 1 run once per offer and are cached; a generation reuses the active dossier.

### Editorial rubric (the judgment the product sells)
1. **Argument**: the piece leads with the desire that actually keeps the prospect stuck, and the promise connects to a believable mechanism.
2. **Belief**: proof appears where skepticism would arise, not in a pile at the end.
3. **Curiosity and pacing**: the reader is pulled forward; nothing is explained before it needs to be.
4. **No invented objections**: objections handled are ones the research shows; none are introduced to be answered.
5. **Specificity**: concrete numbers, names, scenes; no generic adjectives doing the work.
6. **Confidence on supported claims**: no hedging of claims the ledger supports.
7. **Offer and action**: the offer is framed as the obvious next step; the CTA is one clear action.
8. **Voice**: matches the voice profile; reads like a person selling, not an assistant advising.

### Teaching library and retrieval
- `examples` and `critiques` are tagged by format, market, selling situation (launch, evergreen, cart close, reactivation), awareness level, and the lesson they demonstrate.
- Retrieval for a step: filter by format and situation, then rank by embedding similarity to the brief + argument, return the top 3 examples and top 3 critiques. Examples go into the prompt as annotated excerpts with the lesson stated; they are never pasted as something to imitate verbatim.
- Only curated rows influence generation. Customer feedback is stored per workspace and can adjust that workspace's instructions, never the global library.

### Prompt principles (encoded in every writer-side prompt)
- Decide the argument before writing; do not write to cover every feature.
- Write within the claims ledger; do not add disclaimers, do not soften supported claims.
- Leave things unresolved until the next paragraph; do not explain everything.
- Do not raise objections the research did not surface.
- Output only the copy in the requested structure; reasoning stays in the structured fields, never in the customer-facing text.

## 5. Job orchestration on Supabase

Edge Function limits that shape this: 2s CPU time per request (async I/O excluded), 150s wall clock on free / 400s on paid, 256MB memory. One model call per invocation fits; a whole pipeline does not.

```
insert generations (status=queued)
  └─ trigger: pgmq.send('pipeline', {generation_id, step: 'research'|'argument'})
pg_cron every 5s: read batch from 'pipeline' with visibility timeout 450s
  └─ pg_net POST → edge fn run-step (service key)
run-step:
  1. ack immediately; continue in EdgeRuntime.waitUntil
  2. load generation + prior step outputs; if this step attempt already completed, exit (idempotent)
  3. insert generation_steps(attempt), update generations.current_step/progress_message (Realtime pushes to UI)
  4. call the engine step (one or two model calls, each logged to llm_calls)
  5. store output, mark step complete, pgmq.delete(msg), pgmq.send(next step(s))
  6. on error: mark attempt failed with reason; message becomes visible again after timeout; attempts > 3 → generation failed
  beforeunload handler: mark the attempt interrupted so the retry is explainable
```

Rules: usage is recorded only when a step completes, keyed by `(generation_id, step, attempt)`, so retries never double count. `max_tokens` per call is capped at 12K; formats longer than that are drafted section by section with a shared outline, each section its own call within the same step.

Escape hatch if a step cannot fit the 400s window after tuning: a small long-running worker (Fly.io or Railway) consumes the same pgmq queue with the same engine code. Nothing else changes. This is a documented risk, not the plan.

## 6. Security

- `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, and the service role key are Edge Function secrets (`supabase secrets set`). They never reach Next.js.
- Next.js uses the anon key with the user session; every query passes RLS. Admin screens check `app_admins` server-side and are additionally gated by RLS on admin tables.
- `run-step` accepts only requests signed with the service key header set by pg_net; it is not callable from the browser.
- Storage buckets are private; the app issues short-lived signed URLs.
- Uploaded documents and fetched pages are untrusted text: they are passed to the model as data inside delimited document blocks, never as instructions, and extraction prompts state that.
- Every admin view of customer data writes an audit row.

## 7. Evaluation harness

The engine is only "done" when it wins blind. The harness lives in admin screens plus the `judge` function:

1. `eval_briefs`: 15–20 offers the teaching library has never seen, across markets and formats.
2. `eval_runs`: run a prompt-version set (and optionally a baseline single-prompt generator) across all briefs; outputs stored.
3. Blind pairwise screen: the user sees two outputs for the same brief, unlabeled, picks the stronger, writes one line why.
4. `judge`: Opus 5.5 with the rubric scores the same pairs; the report shows human–judge agreement. The judge pre-screens drafts in production only once agreement is at least 75% on the latest 40 comparisons.
5. Every correction the user records becomes a critique candidate for the library.
