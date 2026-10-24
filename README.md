# Legiit Copy

A Legiit product that writes effective direct response sales copy from a saved offer: sales pages, emails and sequences, webinars, VSLs, ads, and social posts.

The product is built around the idea that AI writes the language of selling without the judgment behind it. The engine fixes that by choosing the sales argument before writing, writing within a per-offer claims ledger, reviewing persuasion and facts as separate steps, and measuring itself with blind evaluations against a plain prompt.

Backend is Supabase (Postgres, Auth, Storage, Edge Functions, Queues). Frontend is Next.js on Vercel. Model calls use the Anthropic API from Edge Functions only.

## Read first
- `docs/00-requirements.md` what the product must do and what the user supplies
- `docs/01-architecture.md` stack, data model, pipeline, job orchestration
- `docs/02-plan.md` phased execution plan with gates and open decisions
- `docs/03-copy-research.md` what makes direct response copy convert, fact-checked, and why AI copy does not
- `docs/04-copy-standard.md` the operational standard the engine's prompts, rubric and reviewers are built from
- `research/` calibration data and scripts behind the standard
- `CLAUDE.md` conventions for Claude Code sessions

## Status
Built end to end: schema and migrations, the engine (all eleven steps, 23 format specs, tell detector, prompts from the standard), the eleven Edge Functions, the web app (offers, copy generation and editor, dashboard and settings, admin), CI, seeds and the deploy guide. Not yet deployed to a live Supabase project; see `docs/05-deploy.md`. Monetization is intentionally out of scope for now.
