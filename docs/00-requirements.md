# Requirements

What has to exist for this product to work, and what the user has to supply. Monetization is deliberately out of scope for now; everything else a normal SaaS needs is in.

## 1. What we are building

A SaaS that writes effective, persuasive direct response copy from a saved offer. The customer describes a product once; the app researches the market, picks the strongest sales argument, writes the piece, reviews it editorially and factually, and hands back something they can use with light editing.

The core thesis (from the design conversation) is that general AI output fails at copy for four reasons, and the product exists to fix each one:

| Failure | Product answer |
|---|---|
| Picks an unimportant benefit or promise | A separate **argument-selection step** that develops three arguments and selects one before any prose is written |
| Explains everything, kills curiosity and pacing | Editorial review scored on a rubric that penalizes over-explanation and invented objections |
| Hedges supported claims, over-cautious about compliance | A **claims ledger** per offer: factual review flags specific unsupported claims instead of softening the whole piece |
| Polished sentences that do not move the sale | A **teaching library** of annotated promotions and before/after critiques, retrieved per assignment, plus a blind evaluation harness that proves the engine beats a plain prompt |

## 2. Copy formats (full scope)

Everything the user asked for, delivered in phases (see `02-plan.md`):

| Phase | Formats |
|---|---|
| v1 | Sales / landing page (long and short), promotional email (single), email sequence (launch, nurture, cart close, abandoned cart, re-engagement) |
| v2 | VSL script, webinar package (registration page, show-up emails, script and slide outline, pitch and close), paid ads (Meta/IG, Google RSA, YouTube script), organic social posts (LinkedIn, X, Facebook, Instagram caption) |
| v3 | Opt-in / lead magnet page, upsell / OTO page, order bump, product description, SMS, advertorial, cold outreach email |

Each format is defined by a **format spec**: structure, length band, required sub-parts, output JSON schema, and format-specific rubric notes. Adding a format means adding a spec, examples, and eval briefs, not new pipeline code.

## 3. Functional requirements

### Accounts and workspaces
- Email magic link and Google sign-in (Supabase Auth)
- Workspaces with members and roles (owner, editor, viewer); every record belongs to a workspace
- Profile settings, workspace settings, member invites
- Admin role (internal) for the teaching library, evals, prompts, costs, failed jobs

### Offers
- Create an offer from a URL, uploaded documents (PDF, DOCX, TXT, MD), or a typed description
- Automatic extraction into a structured brief: product, deliverables, price, terms, guarantee, audience, proof, positioning
- Claims ledger: each claim with type, evidence source, and status (verified / unverified / prohibited); user can edit, add, allow, or forbid claims
- Research dossier generated once per offer and refreshable: customer language (verbatim quotes), desires, frustrations, objections, competing options, awareness and sophistication level, proof inventory
- Voice profile: paste samples; the app derives a style guide the writer follows
- Missing-info questions: the app asks only for consequential facts it cannot find (unpublished offer terms, numbers it needs)

### Generation
- Wizard: pick format, purpose (e.g. launch email #3, cart-close), options (length, tone constraints, CTA, deadline), optional one-off instructions
- Automatic angle selection with alternatives visible; "try another angle" reruns from the argument step
- Live progress with step timeline (research → argument → draft → editorial → factual → final), survives page reload
- Structured output (blocks) so pages render with headline, subheads, body, CTA, bullets, PS, etc.
- Bounded revision loop (max 2 cycles) so cost and time stay predictable

### Editor
- Rich text editor on the final draft with version history (system versions and user versions)
- Targeted rewrite: select a passage, give an instruction, get a replacement that respects the argument and claims ledger
- Side panel: selected argument and why, research sources, factual flags and open questions, alternative angles
- Compare two versions side by side
- Export: copy, Markdown, HTML, DOCX, plain text; email sequences export as one file or per email
- User feedback on drafts (thumbs, reason) stored for later preference tuning (per-workspace only; never changes global behavior without review)

### Dashboard and housekeeping
- Offers list, recent generations, in-progress jobs
- Usage view per workspace (generations, tokens, cost) so limits can be added later without re-plumbing
- Transactional email: magic links, invites, "your draft is ready" (optional)
- Onboarding: first-offer walkthrough with a sample offer

### Admin (internal)
- Teaching library: add/edit examples, annotations, tags; add critique pairs (brief, weak draft, strong revision, reasons)
- Prompt versions per step with model and effort; activate/deactivate; diff
- Eval briefs (unseen offers) and eval runs: run a prompt version against all briefs
- Blind pairwise comparison screen; record winner and reason; judge-agreement report
- Cost and latency per step and per generation; failed jobs with retry
- Any user's generation viewable for support (logged)

## 4. Non-functional requirements

| Area | Requirement |
|---|---|
| Security | API keys live only in Supabase Edge Function secrets. Frontend holds the anon key only. RLS on every table keyed by workspace. Service role used only inside edge functions. Uploads in private Storage buckets with signed URLs. |
| Isolation | No customer data in prompts for other customers. Teaching examples are curated, never auto-ingested from customer drafts. |
| Reliability | Every pipeline step is idempotent and retried at most 3 times. A crashed step never double-charges usage. Jobs resume after reload; a step that dies is visible as failed with a reason. |
| Cost control | Every model call logged with step, prompt version, model, tokens, cost, duration. Revision loop capped. Per-workspace usage counters from day one. |
| Latency | Target: email under 2 minutes, sales page under 6 minutes end to end. Steps run in parallel where independent. |
| Traceability | Each generation records prompt versions and models used so quality changes can be attributed. |
| Compliance posture | The writer is not throttled by compliance prompts. The claims ledger and factual review carry that responsibility and flag specific lines. |
| Observability | Sentry for app and edge errors; a `llm_calls` table as the source of truth for spend; PostHog (or similar) for product analytics. |
| Testing | Unit tests for format specs, schemas, cost accounting; integration test for the pipeline against a recorded brief; Playwright smoke test for the core flow; eval harness as the quality test. |

## 5. External accounts and keys (user supplies)

| Item | Needed for | Phase |
|---|---|---|
| Supabase project (paid plan, for 400s edge function wall clock and pg_cron sub-minute schedules) | Everything | 0 |
| Anthropic API key with sufficient spend limit | Engine | 0 |
| Vercel project | Hosting the Next.js app | 0 |
| Domain and DNS | App URL, auth redirect, email sending | 0 |
| Google Cloud OAuth client | Google sign-in | 0 |
| Resend account (or other SMTP) | Magic links, invites, notifications | 2 |
| Sentry project | Error tracking | 2 |
| PostHog project (optional) | Product analytics | 5 |
| GitHub Actions enabled on this repo | CI and deploys | 0 |

## 6. Inputs only the user can provide

- **Product name, domain, and first target market** (which kind of seller the beta is for; the first teaching set and eval briefs are chosen to match)
- **Swipe file access**: 30 to 50 strong promotions across the v1 formats, plus any documented critiques or before/after edits. Claude Code can collect public material and draft annotations; the user validates the annotations and the standard. Examples are studied, never reproduced.
- **Judgment time**: roughly 20 blind pairwise comparisons per eval round during Phase 1 and after each major prompt change (about an hour per round). This is the human dependency identified in the design conversation; it is concentrated here and nowhere else.
- **Claims policy**: what claim types are always prohibited in generated copy (e.g. income guarantees, medical cures) regardless of what an offer's documents say
- **Decisions** listed in `02-plan.md` § Open decisions

## 7. Estimated run cost (to be measured in Phase 1)

Prices are the Anthropic list prices for Claude Opus 5.5 ($4 per million input tokens, $20 per million output tokens) plus web search. Thinking tokens bill as output, so real numbers will be higher than the arithmetic below; the plan treats these as the budget to beat, not a promise.

| Piece | Rough cost per run |
|---|---|
| Offer intake + research dossier (once per offer, refreshable) | $0.50 to $1.50 |
| Single email | $0.30 to $0.80 |
| Sales page (full pipeline, 1 revision cycle) | $1.50 to $4.00 |
| Webinar package | $4.00 to $10.00 |

Model per step is configurable. Research synthesis, extraction, and factual review are candidates for Claude Sonnet 5.5 once evals show no quality loss.
