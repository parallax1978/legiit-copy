# Deploying Legiit Copy

Everything runs on one Supabase project plus one Vercel project. Nothing in this guide needs the user's own copy; the seed loader fills the library from `research/`.

## 1. Supabase project (paid plan)

1. Create the project. In **Database → Extensions** enable `vector`, `pgmq`, `pg_cron`, `pg_net`. Enable **Queues** in Integrations if the dashboard asks.
2. `supabase link --project-ref <ref>` then `supabase db push` (applies `supabase/migrations/*` in order). The queue `pipeline`, the 5-second dispatcher job and the stuck-job sweeper are created by migration 006.
3. **Auth**: Email provider on, "Confirm email" off is fine (magic links sign in and create the user). Set Site URL to the Vercel URL and add `https://<your-domain>/auth/callback` (and the localhost callback for dev) to Redirect URLs. Under **Auth → SMTP** use Resend's SMTP so magic links come from your domain. Templates: the magic-link template should link to `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink`.
4. **Edge Function secrets**:
   ```
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-... PIPELINE_SHARED_SECRET=<long random> RESEND_API_KEY=re_... SITE_URL=https://<your-domain> INVITE_FROM_EMAIL="Legiit Copy <no-reply@your-domain>"
   ```
   Optional: `ENGINE_DEFAULT_MODEL`, `ENGINE_COLD_READ_MODEL`.
5. **Deploy functions**: `supabase functions deploy --no-verify-jwt run-step` then `supabase functions deploy <name>` for every other folder in `supabase/functions/` (CI does this on `main`).
6. **Dispatcher settings** (SQL editor, once):
   ```sql
   select public.set_setting('functions_url', 'https://<ref>.supabase.co/functions/v1');
   select vault.create_secret('<same value as PIPELINE_SHARED_SECRET>', 'pipeline_shared_secret');
   ```
   `app.dispatch_pipeline()` reads both. Check it runs: `select * from cron.job;` and `select * from cron.job_run_details order by start_time desc limit 5;`.
7. **Storage**: buckets `offer-sources` and `exports` are created by migration 006 (private).

## 2. Seed the library and make yourself admin

Sign in once at the deployed app so a profile exists, then:
```
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service key> \
deno run --allow-read --allow-env --allow-net supabase/seed/seed.ts --admin you@example.com
```
This loads critique pairs, controls, split-test pairs (every fourth pair held out for judge calibration), eval briefs, and the v1 prompt versions, and adds you to `app_admins`. Then in **Admin → Settings** set `eval_workspace_id` (create a workspace named "Evals" and paste its id) and run **Embed all missing** in Library, Critiques and Controls.

## 3. Vercel

Project root `apps/web`, framework Next.js, install command `pnpm install --frozen-lockfile`, build `pnpm -F web build` from the repo root (set Root Directory to the repo root and Build Command `pnpm -F web build`, Output `apps/web/.next`), environment:
```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_SITE_URL=https://<your-domain>
```
No service-role key is ever set on Vercel.

## 4. GitHub Actions

Secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`. On push to `main` CI lints, type-checks, tests, validates migrations against Postgres, then pushes migrations and deploys functions.

## 5. First run checklist

1. Add an offer from a URL; watch sources extract and the ledger fill.
2. Open the Offer tab; the first generation will propose an offer construction and pause for approval.
3. Write an email; the timeline should show research → offer → argument → draft → cold read → editorial / mechanical / factual → revise → ship.
4. Admin → Costs: every step has `llm_calls` rows with cost.
5. Admin → Evals: run the judge on holdout split-test pairs; accuracy must reach 70% before the judge adjudicates engine vs baseline.

## 6. Local development

Docker is required for `supabase start`. Without it, validate migrations against plain Postgres with `supabase/tests/local_stubs.sql` (what CI does) and run the engine's unit tests with `deno test`. The CLI (`tools/engine-cli`) runs the real pipeline against a linked project.
