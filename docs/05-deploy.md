# Deploying Legiit Copy

Everything runs on one Supabase project plus one Vercel project. Nothing in this guide needs the user's own copy; the seed loader fills the library from `research/`.

## 0. Status of the first project

Project `vcxldzuowhktamltlnla` ("Legiit Copy", us-east-1) has all 17 migrations applied, all 12 functions deployed, the dispatcher settings and Vault secret set, email confirmation on, the library seeded and embedded, the admin user and Evals workspace created, and the `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `SITE_URL` and `INVITE_FROM_EMAIL` secrets set. The app runs at **https://legiitcopy.com** (registered at Namecheap, DNS at Cloudflare with every record set to DNS only, because Vercel issues its own certificate): `@` has A records 216.150.1.1 and 216.150.16.1, `www` is a CNAME to Vercel and redirects to the apex, and the Resend records (`resend._domainkey` TXT, `send` MX and TXT, `rsend` CNAME) plus `_dmarc` let sign-in and invite emails send from `no-reply@legiitcopy.com`. Auth's Site URL is `https://legiitcopy.com`; the redirect list also keeps `https://legiit-copy.vercel.app/**`, which still serves the app. The Vercel project `legiit-copy` (root `apps/web`, production branch `claude/vibrant-wozniak-k19u2i`) carries `NEXT_PUBLIC_SITE_URL=https://legiitcopy.com`; changing a `NEXT_PUBLIC_` variable needs a production rebuild.

## 1. Supabase project (paid plan)

1. Create the project. In **Database → Extensions** enable `vector`, `pgmq`, `pg_cron`, `pg_net`. Enable **Queues** in Integrations if the dashboard asks.
2. `supabase link --project-ref <ref>` then `supabase db push` (applies `supabase/migrations/*` in order). The queue `pipeline`, the 5-second dispatcher job and the stuck-job sweeper are created by migration 006.
3. **Auth**: Email provider on and **"Confirm email" ON** (required: it prevents someone registering another person's address through the API and picking up their workspace invites; magic links confirm the address as part of signing in). Set Site URL to the Vercel URL and add `https://<your-domain>/auth/callback` (and the localhost callback for dev) to Redirect URLs. Under **Auth → SMTP** use Resend's SMTP so magic links come from your domain. Templates: the magic-link template should link to `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink`.
4. **Edge Function secrets**:
   ```
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-... PIPELINE_SHARED_SECRET=<at least 16 random chars; run-step refuses every request otherwise> RESEND_API_KEY=re_... SITE_URL=https://<your-domain> INVITE_FROM_EMAIL="Legiit Copy <no-reply@your-domain>"
   ```
   Optional: `ENGINE_DEFAULT_MODEL`, `ENGINE_COLD_READ_MODEL`.
5. **Deploy functions**: `supabase functions deploy --no-verify-jwt --import-map supabase/functions/deno.json run-step` then `supabase functions deploy --import-map supabase/functions/deno.json <name>` for every other folder in `supabase/functions/`. The import map flag is required: the remote bundler does not read `supabase/functions/deno.json` on its own. CI does this on `main`.
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

## 6. Security notes

- Every child row (claims, generations, drafts, flags, research, variants, voice profiles) is pinned to its parent's workspace by a database trigger, so a crafted insert cannot point one workspace's job at another workspace's offer. `supabase/tests/rls.test.sql` asserts the tenant boundaries and runs in CI.
- `run-step` is the only function deployed without JWT verification; it accepts requests only with the shared secret (compared by digest) and refuses everything when the secret is unset or short.
- URL ingestion blocks private, link-local and metadata addresses, non-http schemes and redirects to private hosts; DNS rebinding between the check and the fetch is the one residual risk (documented in the function).
- The web app never holds the service-role key; admin screens rely on RLS plus `app_admins`.

## 7. Local development

Docker is required for `supabase start`. Without it, validate migrations against plain Postgres with `supabase/tests/local_stubs.sql` (what CI does) and run the engine's unit tests with `deno test`. The CLI (`tools/engine-cli`) runs the real pipeline against a linked project.
