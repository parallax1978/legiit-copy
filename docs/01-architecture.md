# Architecture

Supabase is the backend of record: Postgres, Auth, Storage, Edge Functions, Queues, Realtime, and secrets. Next.js on Vercel is the UI. All model calls happen inside Edge Functions so there is exactly one place where keys live, spend is logged, and prompts are versioned.

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Web app | Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui, TipTap editor | Hosted on Vercel. Server components and server actions talk to Supabase with the user's session (RLS enforced). |
| Auth | Supabase Auth: email magic link only | Session cookies via `@supabase/ssr` |
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
| `offer_claims` | Claims ledger. Per row: claim text; claim type (the 19 types in the standard, Section 8.1); role in the argument; evidence grade A–F with endpoint, population, dose, duration and effect size; source ref and quote; precision; typical result; earnings context (dates, cohort, percentage achieving, time and effort, expenses); material-connection flag; guarantee terms and approver; former price and bonus value with basis; scarcity number with an enforced flag; deadline with mechanism; trial and continuity terms; story-claim rows; establishment-signal flag; status (verified/unverified/flagged) with the user's decision on each flag (keep/rewrite/drop); created_by |
| `offer_config` | Per-offer: vertical; business-opportunity and FTC Notice-recipient booleans; humor policy per format; greeting and edge tolerance; refund window; first-week experience |
| `offer_variants` | The offer options sheet and the chosen variant with reasons (step 2 output) |
| `offer_research` | Research dossier (jsonb) with sources; versioned, one active |
| `offer_questions` | Missing-info questions and answers |
| `voice_profiles` | Samples and derived style guide |
| `generations` | One job: offer_id, format, purpose, options, status, current_step, progress_message, selected_angle_id, cost, token totals, prompt_version_set |
| `generation_steps` | One row per step attempt: step, attempt, status, input_hash, output (jsonb), model, tokens, cost, duration, error |
| `angles` | All candidate arguments per generation with gate results and rubric scores; the three finalists, the winning thesis, and the two kept losers |
| `controls` | Documented controls sourced by the build from public records (split-test libraries, published and annotated promotions, award lists, archived emails and webinars): format, traffic, diagnosed awareness and sophistication, argument sentence, lead type, mechanism, proof placement, offer devices, results with dates and sample sizes, losing variants, rights status. Customers may add their own later; nothing depends on it |
| `generation_predictions` | The reviewer's beat/lose/unsure prediction against the control, and the reported result and refund rate when known |
| `drafts` | Versions of the copy: generation_id, version, origin (system/user/rewrite), blocks (jsonb) with inline ledger IDs, markdown, skim-path extract, created_by |
| `draft_flags` | Factual and editorial flags on a draft version: quote, issue, severity, suggested fix, resolved |
| `draft_feedback` | User thumbs/reason per draft |
| `usage_events` | Per-workspace meter: generation completed, tokens, cost (feeds limits later) |

### Internal / admin
| Table | Purpose |
|---|---|
| `app_admins` | user_ids with admin access |
| `examples` | Teaching library: format, market, selling situation, awareness state, sophistication stage, lead type, argument sentence, hook, mechanism type, proof placement, offer devices, voice profile, funnel position, documented result, loser flag, rights status, full text, annotations (jsonb), source, embedding |
| `example_sections` | Separately retrievable leads, mechanism sections, proof blocks, closes and order forms cut from examples |
| `critiques` | Brief, weak draft, strong revision, the chief's named defect, principle, test result, AI-failure mapping, tags, embedding (seeded from `research/critique_pairs_v0.json`) |
| `prompt_versions` | step, version, template, model, effort, max_tokens, active, notes |
| `eval_briefs` | Unseen offers used only for evaluation |
| `eval_runs`, `eval_outputs` | A prompt-version set run over all eval briefs |
| `eval_comparisons` | Blind pairwise judgments: output_a, output_b, winner, reason, judged_by (human or judge model) |
| `llm_calls` | Every model call: step, generation_id or eval_output_id, model, prompt_version, input/output/cache tokens, cost, latency, stop_reason, request_id |

## 4. The engine: pipeline steps

The pipeline follows `docs/04-copy-standard.md` (the operational standard) and `docs/03-copy-research.md` (the evidence). The order matters: a failure higher in the hierarchy cannot be repaired lower down, so the offer is designed before the argument, the argument before any prose, and claims are matched to the ledger before anyone judges the prose.

Each step is a pure function `(input) → output` with zod-validated JSON on both sides, persisted in `generation_steps`. A step reads the stored structured output of earlier steps, never the prompt history, so every step is re-runnable and "try another angle" restarts from step 3.

| # | Step | Output (stored) | Model / tools |
|---|---|---|---|
| 0 | Intake | Offer brief, initial claims ledger rows (typed, graded), open questions, per-offer config | Opus 5.5, structured output |
| 1 | Research | Dossier: tagged verbatim table with sources; ranked themes with three verbatims each; competitor table with the logo-swap result; awareness and sophistication per traffic segment; proof inventory graded A–F; objection map from VOC only; resident emotion; story inventory; first-week experience and refund history | Opus 5.5 + web search/fetch, effort high |
| 2 | Offer construction | Options sheet (hard, bill-me, trial, money-back, charter, premium-led, continuity, multi-unit), chosen variant with reasons, denominated guarantee, deadline with mechanism, promise/delivery gap note; every term becomes a ledger row pending user approval | Opus 5.5, effort xhigh; user confirms before drafting |
| 3 | Argument selection | Twenty candidates generated by search (the unused fact, the opposite idea, the mechanism in the process); desire gate and proof gate; anchored rubric C1–C14; three finalists with lead verbatim, belief to displace, mechanism mapped to ledger rows, proof asset; winning thesis sentence; two losers kept as body reasons and next lead tests | Opus 5.5, effort xhigh |
| 4 | Draft | In this order: offer block rendered as order form and close; bullets and proof blocks; body; three leads of different type cut from the top; headline and deck last. Per-format, per-section prompts from the format spec. Every claim carries an inline ledger ID. Drafting is blocked until missing mechanism, missing proof and unclear awareness are answered or marked unknown | Opus 5.5, effort high; long formats drafted section by section |
| 5 | Cold read | On a **different model** with no brief, memo or ledger: skim-path readback (headline, deck, crossheads, bold, P.S., order form) of what is sold, to whom, for how much, and why believe it; then one fast full read reporting where attention dropped and the one claim it disbelieves. Also used to pick among the three leads | Sonnet 5.5 when the drafter is Opus 5.5 |
| 6 | Editorial review | Gates A–D in order, stop at first failure (argument readback; belief and lead; claims against ledger; voice), sentence-job audit, verdict REJECT/REVISE/APPROVE, prediction beat/lose/unsure against the control, one fatal note and at most five secondary, DO NOT TOUCH list, testable disputes. No additive score | Opus 5.5, effort xhigh |
| 7 | Mechanical passes | Tiered AI-tell detector (Tier 0 hard rejects, weighted tiers scored per 300 words), FK grade flag with audience band, sentence-length cadence floor, "and then" beat test, format hard gates (SMS characters, cold-email words, first-125-characters standalone, first-5-seconds spoken) | Code, not a model; ported from `research/tells/analyze.py` |
| 8 | Factual and compliance review | Ten tests in order (ledger match, strength match to evidence grade, disease screen, testimonial pack, earnings screen, track-record screen, net impression on headline/lead/offer, cross-asset consistency with the offer block as source of truth, channel pass, fabrication guard). Output per flag: `line → rule (cited) → rewritten line`, severity, and the decision left to the user (keep, apply rewrite, drop). The reviewer never removes or softens a claim on its own and may not add "may", "results vary" or generic disclaimers. Only engine fabrications (a name, number, study or testimonial not in the ledger) are hard failures | Opus 5.5 (Sonnet 5.5 candidate) |
| 9 | Revise | Changes only referenced lines, honors DO NOT TOUCH; passes run separately (strategy, style, clarity, fewest words) | Opus 5.5, effort high |
| 10 | Ship and log | Control plus one challenger lead with the single variable named; the reviewer's prediction logged; result and refunds at 30 days logged when the user reports them | |

Steps 6, 7 and 8 run in parallel after the cold read. Steps 6–9 loop at most twice; the loop stops early when the gates pass and no Tier 0 or high-severity flag remains. Steps 0–2 run once per offer and are cached; a generation reuses the active dossier and offer block. Step 2 needs the user's approval because it changes what is sold, not just how.

### The copy chief rubric
The rubric is `docs/04-copy-standard.md` Section 6, used verbatim as the editorial reviewer's instruction: gates in order, stop at the first failure, predict against a control, never average. The seven observed dimensions (argument, proof, pacing, offer, specificity, reader focus, rhythm) are logged for calibration only and never decide the verdict.

### Teaching library and retrieval
- `examples` are tagged structurally: awareness state, sophistication stage, lead type, the one-sentence argument, hook, mechanism type, proof elements with placement, offer devices, voice profile, format, funnel position, documented result, and a **loser** flag. Leads, mechanism sections, proof blocks, closes and order forms are stored as separately retrievable sections.
- `critiques` hold (brief, weak draft, strong revision, the chief's named defect, the principle, test result). `research/critique_pairs_v0.json` seeds the first 36.
- Retrieval for a step: filter by format and selling situation, then rank by embedding similarity to the brief and argument; return the top 3 examples and top 3 critiques as annotated excerpts with the lesson stated. Examples are studied, never pasted as something to imitate verbatim.
- Only curated rows influence generation. Customer feedback adjusts that workspace's instructions, never the global library.

### Prompt principles
The numbered standard in `docs/04-copy-standard.md` Section 1 is the writer's rulebook and is pasted into the draft prompts. The rules the engine enforces mechanically rather than by instruction: speaker identified by word 150; one claim a skeptic would doubt in the lead; every claim's carrier within two sentences; objections only from the research map; one damaging admission from the brief; one CTA path; the turn written as a reason-why sentence; no tone adjectives in prompts (voice is parameters and exemplar paragraphs); no Word-Substitute rewriting; reasoning stays in structured fields, never in the customer-facing text.

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

Rules: usage is recorded only when a step completes, keyed by `(generation_id, step, attempt)`, so retries never double count. `max_tokens` per call is capped at 12K; formats longer than that are drafted section by section, grouped into call groups by word band.

Resumable steps: a step that makes several model calls (the draft step: up to seven for a sales letter) saves its partial state to the running attempt row after every call group (`ctx.savePartial`) and, when the invocation's time budget is spent, returns `continueLater`; the runner marks the attempt `continued`, re-enqueues the same step, and the next invocation resumes from the partial. A wall-clock kill therefore loses at most one call group.

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
6. The reviewer's prediction scorecard: every beat/lose/unsure prediction is stored and scored against reported results; this, not the blind score alone, is what calibrates the editorial reviewer over time.
7. Tell thresholds (`04-copy-standard.md` Section 7) are recalibrated by counting every tell in the assembled human control corpus and the library examples before they are enforced; the shipped numbers were measured on Claude-only drafts.
