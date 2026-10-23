# Execution plan

One developer with Claude Code, plus the user's judgment time. Weeks are planning estimates. Each phase has a gate; quality of the engine, not the calendar, decides when Phase 2 starts.

## Phase 0: Foundations (week 1)

Goal: a deployable skeleton with auth, tenancy, CI, and the logging that every later phase depends on.

- [ ] 0.1 Scaffold `apps/web` (Next.js 15, TS, Tailwind, shadcn/ui), `supabase/` (CLI init), `tools/engine-cli`, root `package.json` workspaces, `.env.example`
- [ ] 0.2 Supabase project: enable `pgvector`, `pgmq`, `pg_cron`, `pg_net`; link CLI; secrets set for `ANTHROPIC_API_KEY`
- [ ] 0.3 Migration 001: `workspaces`, `workspace_members`, `profiles`, `app_admins`, RLS helpers, auto-create workspace on signup
- [ ] 0.4 Auth: magic link + Google, `@supabase/ssr` middleware, protected `/app` routes, sign-out
- [ ] 0.5 Migration 002: `llm_calls`, `prompt_versions`, `usage_events`
- [ ] 0.6 `_shared/engine/llm.ts`: Anthropic wrapper (model, effort, structured output, logging to `llm_calls`, cost from a price table, retries, refusal fallback)
- [ ] 0.7 GitHub Actions: lint, typecheck, Vitest, Deno test, `supabase db lint`; deploy edge functions and migrations on `main`; Vercel preview per PR
- [ ] 0.8 Sentry wired into web and edge functions
- [ ] 0.9 `CLAUDE.md` conventions verified against the scaffold

Gate: a user can sign up, land in a workspace, and an edge function can make one logged Claude call.

## Phase 1: Engine prototype and teaching set (weeks 2–4)

Goal: prove the pipeline beats a good single prompt on unseen offers, using the CLI only.

- [ ] 1.1 Format specs: `email_single`, `email_sequence`, `sales_page` (structure, zod output schema, rubric notes, length bands)
- [ ] 1.2 Schemas for every step input/output; `generation_steps` output contracts
- [ ] 1.3 Step 0 intake: sources → brief + claims ledger + questions (structured output)
- [ ] 1.4 Step 1 research with web search/fetch; dossier schema with sources
- [ ] 1.5 Step 2 argument: three candidates, scoring, selection rationale
- [ ] 1.6 Step 3 draft, including section-by-section drafting for sales pages
- [ ] 1.7 Steps 4–6 editorial review, factual review, revise; loop control
- [ ] 1.8 CLI: `deno task engine run --brief briefs/x.json --format sales_page` writes every step output to a folder; `engine baseline` runs a single-prompt generator for comparison
- [ ] 1.9 Teaching set v0: collect 30–50 examples across v1 formats; Claude Code drafts annotations (lesson, why the argument works, where proof lands, what keeps the reader moving); user validates in batches of 10
- [ ] 1.10 Critique pairs v0: 15–20 (brief, weak draft, strong revision, reasons) seeded from published critiques and from the user's edits of prototype output
- [ ] 1.11 Migration 003: `examples`, `critiques`, embeddings via `embed` function; retrieval implemented
- [ ] 1.12 Eval briefs: 15 unseen offers across markets; `eval_runs` tables; CLI `engine eval --prompt-set v1`
- [ ] 1.13 Minimal admin page (behind `app_admins`): blind pairwise comparison and results table (this is the first UI built, because the gate needs it)
- [ ] 1.14 Prompt tuning rounds against the rubric; record each round's win rate
- [ ] 1.15 Cost and latency per step measured; `max_tokens` and effort per step set from data

Gate: engine output wins at least 70% of blind pairwise comparisons against the baseline across the eval briefs, judged by the user. Measured cost per sales page is within the budget in `00-requirements.md` § 7 or the budget is revised deliberately.

## Phase 2: Core product (weeks 4–6)

Goal: a customer completes the whole flow without help.

- [ ] 2.1 Migration 004: `offers`, `offer_sources`, `offer_claims`, `offer_research`, `offer_questions`, `voice_profiles`
- [ ] 2.2 `ingest-source` function: URL fetch, PDF/DOCX/TXT parsing, text stored; Storage bucket and signed uploads
- [ ] 2.3 Offer screens: create (URL / upload / describe), extraction review, claims ledger editor, questions, research dossier view with refresh, voice profile
- [ ] 2.4 Migration 005: `generations`, `generation_steps`, `angles`, `drafts`, `draft_flags`, `draft_feedback`; pgmq queue, cron schedule, `run-step` function wired to the engine
- [ ] 2.5 Generation wizard (format → purpose → options → confirm with cost estimate)
- [ ] 2.6 Progress page with Realtime timeline; resumable after reload; failure states with retry
- [ ] 2.7 Draft view: structured blocks rendered per format; side panel (argument, sources, flags, alternatives); "try another angle"
- [ ] 2.8 Editor: TipTap on markdown, user versions, compare versions, `rewrite-passage` function for targeted rewrites
- [ ] 2.9 Exports: copy, Markdown, HTML, TXT, DOCX (`export` function); sequence export per email
- [ ] 2.10 Dashboard, offer list, generation list, workspace settings, members and invites, profile
- [ ] 2.11 Transactional email via Resend (auth SMTP, invites, draft-ready notification)
- [ ] 2.12 Playwright smoke test: sign up → offer → email → export

Gate: five test users (not the builder) each produce a usable email and sales page without assistance; median time-to-draft recorded.

## Phase 3: Quality loop and admin (weeks 6–7)

- [ ] 3.1 Admin: teaching library CRUD with annotation editor and tag taxonomy
- [ ] 3.2 Admin: prompt versions (edit, diff, activate per step with model and effort); generations record the version set used
- [ ] 3.3 Admin: eval runs from the UI; `judge` function; human–judge agreement report
- [ ] 3.4 Admin: cost and latency dashboards from `llm_calls`; failed jobs with retry; support view with audit log
- [ ] 3.5 Draft feedback captured in the editor; "promote to critique" action for admins
- [ ] 3.6 Per-workspace instruction memory (learned preferences from edits), shown and editable by the user

Gate: a prompt change can be shipped and measured end to end from the admin UI without touching code.

## Phase 4: Format expansion (weeks 7–10)

For each format: spec, 8–10 examples, 3–5 eval briefs, prompt tuning, gate at the same 70% blind win rate against baseline.

- [ ] 4.1 VSL script
- [ ] 4.2 Webinar package (registration page, show-up sequence, script and slide outline, pitch)
- [ ] 4.3 Paid ads (Meta/IG, Google RSA, YouTube script) with per-platform constraints in the spec
- [ ] 4.4 Organic social posts (LinkedIn, X, Facebook, Instagram)
- [ ] 4.5 Opt-in page, upsell/OTO, order bump
- [ ] 4.6 Product description, SMS, advertorial, cold email
- [ ] 4.7 "Campaign" grouping: generate a coordinated set (e.g. launch: page + 5 emails + 3 ads) from one argument

## Phase 5: Hardening and private beta (weeks 10–12)

- [ ] 5.1 Usage metering and soft limits per workspace (no billing): counters, warnings, admin override
- [ ] 5.2 Rate limiting on generation creation; abuse controls on uploads and URL fetch (size, SSRF allowlist)
- [ ] 5.3 Job recovery drills: kill a step mid-run, verify retry and no double usage; dead-letter review in admin
- [ ] 5.4 Onboarding flow with a sample offer; empty states; help copy
- [ ] 5.5 Legal pages, privacy policy, data deletion (workspace export and delete)
- [ ] 5.6 Security review pass (RLS tests per table, secrets audit, dependency audit)
- [ ] 5.7 Backups verified; point-in-time recovery enabled
- [ ] 5.8 PostHog events for the funnel; beta cohort of 10–20 users; weekly eval round with their briefs (anonymized, with consent)

Gate: beta users reuse output with limited rewriting (self-reported and measured by edit distance between system draft and exported version).

## Later (explicitly out of scope now)
- Stripe subscriptions, plans, overage packs, customer portal
- Team-level approval workflows, API access, integrations (ESPs, page builders)
- Fine-tuning on preference pairs (DPO) once there are several hundred validated comparisons

## Order of work for the first sessions

1. Phase 0 end to end (one or two sessions).
2. Phase 1 items 1.1–1.8 with a single hand-written brief, iterating on the CLI until a sales page and an email read well.
3. Teaching set and eval briefs (1.9–1.12) in parallel with prompt tuning.
4. The blind comparison admin page (1.13) and the first scored eval round.

## Open decisions (user)

| Decision | Default if not decided |
|---|---|
| Product name and domain | Work under the repo name until chosen |
| First market for the beta (e.g. course creators, agencies, ecommerce, info products) | Info products and online courses |
| Sign-in methods | Magic link + Google |
| Where examples come from and any copyright constraints | Public swipe files and the user's own past promotions; study only, never reproduce |
| Prohibited claims policy | Income guarantees, medical cures, and fabricated testimonials are always prohibited |
| Who judges evals | The user, roughly one hour per round |
| Default model set | Opus 5.5 for every step; Sonnet 5.5 trial on research synthesis, extraction, and factual review after Phase 1 |
