# Execution plan

Build everything at once: phases below are work packages built in parallel, not release stages, and there is no beta. Gates stay as quality checks the engine must pass before launch. The teaching material, controls and calibration data are sourced by the build, not supplied by the user.

## Phase 0: Foundations (week 1)

Goal: a deployable skeleton with auth, tenancy, CI, and the logging that every later phase depends on.

- [x] 0.1 Scaffold `apps/web` (Next.js 15, TS, Tailwind, shadcn/ui), `supabase/` (CLI init), `tools/engine-cli`, root `package.json` workspaces, `.env.example`
- [x] 0.2 Supabase project: enable `pgvector`, `pgmq`, `pg_cron`, `pg_net`; link CLI; secrets set for `ANTHROPIC_API_KEY`
- [x] 0.3 Migration 001: `workspaces`, `workspace_members`, `profiles`, `app_admins`, RLS helpers, auto-create workspace on signup
- [x] 0.4 Auth: magic link only, `@supabase/ssr` middleware, protected `/app` routes, sign-out
- [x] 0.5 Migration 002: `llm_calls`, `prompt_versions`, `usage_events`
- [x] 0.6 `_shared/engine/llm.ts`: Anthropic wrapper (model, effort, structured output, logging to `llm_calls`, cost from a price table, retries, refusal fallback)
- [x] 0.7 GitHub Actions: lint, typecheck, Vitest, Deno tests, migrations validated against Postgres; deploy functions and migrations on `main` (Vercel previews come from the Vercel GitHub app)
- [ ] 0.8 Sentry wired into web and edge functions (needs the Sentry project; `llm_calls` and `audit_log` carry errors today)
- [x] 0.9 `CLAUDE.md` conventions verified against the scaffold

Gate: a user can sign up, land in a workspace, and an edge function can make one logged Claude call.

## Phase 1: Engine prototype and teaching set (weeks 2–4)

Goal: prove the pipeline beats a good single prompt on unseen offers, using the CLI only. The step contracts, rubric, tell detector, claims rules and format specs come from `docs/04-copy-standard.md`; do not reinvent them in prompts.

- [x] 1.0 Corpus acquisition, done by Claude Code sessions with no input from the user (first pass in `research/corpus/`: 188 controls, 134 split-test pairs, 75 critique pairs, 24 eval briefs; gaps listed in `research/README.md`). Targets: 60 or more documented controls across the v1 formats with recorded results or documented longevity; 150 or more split-test pairs with known winners (the ground truth for judge calibration); 100 or more human DR documents per format for tell calibration, including financial and info-product promotions and emails. Sources are listed in `03-copy-research.md` Section 12: public-domain texts (Hopkins, Caples-era ads), NextAfter's experiment library, Conversion Rate Experts and Copyhackers case studies and teardowns, Unbounce and VWO published tests, swiped.co annotations, Agora-family promotions posted publicly, Hatch's *Million Dollar Mailings* and the Axel Andersson award list, *Who's Mailing What*, publicly posted webinars and VSLs, archived practitioner emails. Every item gets a rights status; full text is stored only for public-domain or licensed items, otherwise structural annotations, brief excerpts and the URL. A counsel review of the storage policy is scheduled before beta

- [x] 1.1 Format specs: `email_single`, `email_sequence`, `sales_page`, `order_form` (sections, length bands, musts, must-nots from the standard Section 9; zod output schema)
- [x] 1.2 Schemas for every step input/output; `generation_steps` output contracts
- [x] 1.3 Step 0 intake: sources → brief + typed, graded claims ledger + per-offer config + questions (structured output)
- [x] 1.4 Step 1 research with web search/fetch: tagged verbatims with sources, competitor table and logo-swap test, awareness and sophistication per segment, proof inventory graded A–F, objection map, story inventory
- [x] 1.4b Step 2 offer construction: options sheet, chosen variant, denominated guarantee, deadline mechanism, promise/delivery gap; terms become ledger rows pending approval
- [x] 1.5 Step 3 argument: twenty candidates by search, desire and proof gates, anchored rubric C1–C14 (port `research/rubric/magnitude.py` and `agree.py` to TypeScript), three finalists, thesis sentence, two losers kept
- [x] 1.6 Step 4 draft in the standard's order (offer block and order form, bullets and proof, body, three leads, headline last), per-section prompts, inline ledger IDs, pre-draft interrogation; section-by-section drafting for long formats
- [x] 1.7 Steps 5–9: cold read on a different model with skim-path readback; editorial gates A–D with control prediction and the critique format; mechanical tell detector and format hard gates ported from `research/tells/analyze.py`; ten-step factual review with `line → rule → rewrite` output and cross-asset consistency; revise under DO NOT TOUCH; loop control
- [x] 1.8 CLI: `deno task engine run --brief briefs/x.json --format sales_page` writes every step output to a folder; `engine baseline` runs a single-prompt generator for comparison
- [ ] 1.9 Teaching set v0: collect 30–50 examples across v1 formats; Claude Code drafts annotations (lesson, why the argument works, where proof lands, what keeps the reader moving); user validates in batches of 10
- [ ] 1.10 Critique pairs: load the 36 in `research/critique_pairs_v0.json` and grow the set from the acquisition sources toward 150 documented split-test pairs; the library gets a loser flag and separately retrievable sections
- [x] 1.11 Migration 003: `examples`, `critiques`, embeddings via `embed` function; retrieval implemented
- [ ] 1.12 Eval briefs: 15 unseen offers across markets; `eval_runs` tables; CLI `engine eval --prompt-set v1`
- [x] 1.13 Minimal admin page (behind `app_admins`): eval results table and the judge calibration report (accuracy at picking the documented winner on held-out split-test pairs); a blind pairwise screen for optional human spot-checks
- [ ] 1.14 Prompt tuning rounds against the rubric; record each round's win rate
- [ ] 1.15 Cost and latency per step measured; `max_tokens` and effort per step set from data
- [x] 1.16 Tell-threshold calibration (first pass: `research/tells/human_calibration_report.md`, 899 human documents; thresholds applied to the detector). Still to do: count every tell in the library examples against engine drafts; re-run `gen_ai_corpus.py` with at least one non-Claude model; set the Tier weights and the per-format cadence floor from that data
- [ ] 1.17 Reviewer prediction scorecard: every editorial verdict stores a beat/lose/unsure prediction against the control; results are logged as they come in

Gate: the judge first picks the documented winner on at least 70% of held-out split-test pairs; then engine output wins at least 70% of blind pairwise comparisons against the baseline across the eval briefs as adjudicated by that judge. Human spot-checks are optional and never block. Measured cost per sales page is within the budget in `00-requirements.md` § 7 or the budget is revised deliberately.

## Phase 2: Core product (weeks 4–6)

Goal: a customer completes the whole flow without help.

- [x] 2.1 Migration 004: `offers`, `offer_sources`, `offer_claims`, `offer_research`, `offer_questions`, `voice_profiles`
- [x] 2.2 `ingest-source` function: URL fetch, PDF/DOCX/TXT parsing, text stored; Storage bucket and signed uploads
- [x] 2.3 Offer screens: create (URL / upload / describe), extraction review, claims ledger editor (typed rows, evidence grade, approval), offer options sheet with approval, questions, research dossier view with refresh, voice profile (measured parameters, idiom bank, exemplar paragraphs, story inventory)
- [x] 2.4 Migration 005: `generations`, `generation_steps`, `angles`, `drafts`, `draft_flags`, `draft_feedback`; pgmq queue, cron schedule, `run-step` function wired to the engine
- [x] 2.5 Generation wizard (format → purpose → options → confirm with cost estimate)
- [x] 2.6 Progress page with Realtime timeline; resumable after reload; failure states with retry
- [x] 2.7 Draft view: structured blocks rendered per format; side panel (argument, sources, flags, alternatives); "try another angle"
- [x] 2.8 Editor: TipTap on markdown, user versions, compare versions, `rewrite-passage` function for targeted rewrites
- [x] 2.9 Exports: copy, Markdown, HTML, TXT, DOCX (`export` function); sequence export per email; order form and close exported together so the deal is stated identically
- [x] 2.10 Dashboard, offer list, generation list, workspace settings, members and invites, profile
- [ ] 2.11 Transactional email via Resend (auth SMTP, invites, draft-ready notification)
- [x] 2.12 Playwright config and smoke tests (landing, login redirect); the signed-in flow needs a live project

Gate: five test users (not the builder) each produce a usable email and sales page without assistance; median time-to-draft recorded.

## Phase 3: Quality loop and admin (weeks 6–7)

- [x] 3.1 Admin: teaching library CRUD with annotation editor and tag taxonomy
- [x] 3.2 Admin: prompt versions (edit, diff, activate per step with model and effort); generations record the version set used
- [x] 3.3 Admin: eval runs from the UI; `judge` function; human–judge agreement report
- [x] 3.4 Admin: cost and latency dashboards from `llm_calls`; failed jobs with retry; support view with audit log
- [x] 3.5 Draft feedback captured in the editor; "promote to critique" action for admins
- [x] 3.6 Per-workspace instruction memory (learned preferences from edits), shown and editable by the user

Gate: a prompt change can be shipped and measured end to end from the admin UI without touching code.

## Phase 4: Format expansion (weeks 7–10)

For each format: spec, 8–10 examples, 3–5 eval briefs, prompt tuning, gate at the same 70% blind win rate against baseline.

- [x] 4.1 VSL script
- [x] 4.2 Webinar package (registration page, show-up sequence, script and slide outline, pitch)
- [x] 4.3 Paid ads (Meta/IG, Google RSA, YouTube script) with per-platform constraints in the spec
- [x] 4.4 Organic social posts (LinkedIn, X, Facebook, Instagram)
- [x] 4.5 Opt-in page, upsell/OTO, order bump
- [x] 4.6 Product description, SMS, advertorial, cold email
- [x] 4.7 "Campaign" (funnel) object: one argument carried across ad, opt-in, email, page, order form and upsell, with the cross-asset consistency check and a reviewer pass that reads only the first screen of each asset
- [ ] 4.8 Formats still without a spec: downsell, application and call-booking page, quiz funnel, webinar invitation emails, cancellation flow, UGC video script, X thread, replay page

## Phase 5: Hardening and launch

- [x] 5.1 Usage metering per workspace (counters and usage page); soft limits and warnings not yet enforced
- [x] 5.2 Rate limiting on generation creation; abuse controls on uploads and URL fetch (size, SSRF allowlist)
- [ ] 5.3 Job recovery drills: kill a step mid-run, verify retry and no double usage; dead-letter review in admin
- [ ] 5.4 Onboarding flow with a sample offer; empty states; help copy
- [x] 5.5 Legal page placeholders, workspace delete; privacy text and data export still to write
- [ ] 5.6 Security review pass (RLS tests per table, secrets audit, dependency audit)
- [ ] 5.7 Backups verified; point-in-time recovery enabled
- [ ] 5.8 PostHog events for the funnel; weekly eval round on new eval briefs
- [ ] 5.9 First three one-variable A/B tests against real controls (engine lead, email and ad), sample sizes computed in advance; results and 30-day refunds logged against the reviewer's predictions

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
| Product name and domain | Decided: Legiit Copy; branding shared with Legiit Leads and Legiit Keywords |
| First market for the beta (e.g. course creators, agencies, ecommerce, info products) | Info products and online courses |
| Sign-in methods | Decided: magic link only |
| Storage policy for copyrighted examples | Full text only for public-domain or licensed items; otherwise structural annotations, brief excerpts and the URL; study only, never reproduce; counsel review before beta |
| Claims policy | Decided: nothing prohibited; risky claims flagged for the user's decision with rule and rewrite; engine fabrications are the only hard stop |
| Who judges evals | A judge model calibrated on documented split-test pairs; human spot-checks optional |
| Default model set | Opus 5.5 for every step; Sonnet 5.5 trial on research synthesis, extraction, and factual review after Phase 1 |
