# CLAUDE.md

Project conventions for Claude Code sessions working in this repo. Read `docs/` before changing architecture.

## What this is
A SaaS that writes direct response sales copy (sales pages, emails, webinars, VSLs, ads, social) from a saved offer. The product's edge is editorial judgment: pick the argument first, write within a claims ledger, review persuasion and facts separately, and prove quality with blind evals. Monetization is out of scope for now.

Docs:
- `docs/00-requirements.md` scope, functional and non-functional requirements, what the user supplies
- `docs/01-architecture.md` stack, repo layout, data model, pipeline steps, job orchestration, security, eval harness
- `docs/02-plan.md` phased checklist with gates; update checkboxes as work lands
- `docs/03-copy-research.md` the evidence: what makes DR copy convert, fact-checked, with the AI failure taxonomy
- `docs/04-copy-standard.md` the operational standard: writer rules, argument rubric, lead selection, copy chief gates, tell detector, claims taxonomy, per-format specs. Prompts and reviewers are built from this file, not from memory
- `research/` calibration data and scripts behind the standard (see its README)

## Stack
Next.js 15 (App Router, TS, Tailwind, shadcn/ui) on Vercel. Supabase for Postgres, Auth, Storage, Edge Functions (Deno), Queues (pgmq), pg_cron, pg_net, pgvector, Realtime, secrets. Anthropic SDK inside Edge Functions only.

## Hard rules
- All model calls go through `supabase/functions/_shared/engine/llm.ts`. No Anthropic calls from Next.js. Every call is logged to `llm_calls`.
- Secrets live in Supabase Edge Function secrets and `.env.local` (gitignored). Never commit keys. Frontend gets the anon key only.
- Every tenant table has `workspace_id` and RLS. New tables ship with policies in the same migration.
- Schema changes only via `supabase/migrations` using the Supabase CLI. No manual dashboard edits.
- Pipeline steps are pure, idempotent, zod-validated on input and output, and persisted in `generation_steps`. Usage is recorded once per completed `(generation_id, step, attempt)`.
- Prompts are versioned files under `supabase/functions/_shared/engine/prompts/` and mirrored in `prompt_versions`. Changing a prompt means a new version, not an edit in place.
- Format specs live in `supabase/functions/_shared/engine/formats/`. Adding a format never adds pipeline code.
- Teaching examples are studied, never reproduced in output. Customer drafts never enter the global library without admin curation.
- Keep Edge Function work within one model call per invocation (2s CPU, 400s wall clock). Chain steps through the queue.

## Claude API usage
- Default model `claude-opus-5-5`, `thinking: {type: "adaptive"}`, `output_config.effort` set per step (see architecture doc), structured outputs via `output_config.format`, `fallbacks: "default"` with the `server-side-fallback-2026-07-01` beta.
- Research uses server tools `web_search_20260209` and `web_fetch_20260209`.
- Never use `budget_tokens`, assistant prefill, or forced `tool_choice`; they error on current models.
- Cap `max_tokens` at 12K per call; draft long formats section by section.

## Copy standard (non-negotiable; details in docs/04-copy-standard.md)
- Decide in this order and never repair a higher failure lower down: market, awareness, sophistication, desire, mechanism, big idea, lead, structure, proof, offer, close. The offer is designed before the brief; the argument is chosen before any prose.
- Every number, study, name, credential, quote, price and deadline carries a ledger ID. Never generate a testimonial, a narrator, a study or a statistic. Precision matches the evidence.
- Claim never bigger than proof; proof within two sentences of its claim; no hedges on supported claims; compliance is handled by the factual review as `line → rule → rewritten line`, never by adding "may" or "results vary".
- Draft in the standard's order (offer block and order form, bullets and proof, body, three leads, headline last). The cold read runs on a different model than the drafter.
- The editorial reviewer runs gates in order and stops at the first failure, predicts beat/lose/unsure against a control, and never averages a score.
- The tell detector never penalizes caps, fragments, exclamation marks, ellipses or em dashes at human rates; bold-label-colon bullets, placeholders, assistant residue and unledgered authorities are hard rejects.
- Prompts carry parameters and exemplar paragraphs, never tone adjectives. Output only copy in the requested structure.

## Commands (to be kept current as the scaffold lands)
```
pnpm install                      # workspaces
pnpm -F web dev                   # Next.js
supabase start && supabase db reset
supabase functions serve
deno task -c supabase/functions engine run --brief <file> --format <format>
pnpm test && deno test supabase/tests
```

## Git
Work on the designated feature branch, small commits with descriptive messages, no PR unless asked.
