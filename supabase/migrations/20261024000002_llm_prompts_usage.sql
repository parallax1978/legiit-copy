-- Model call log (source of truth for spend), prompt versions, usage meter, app settings.
create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  step text not null,
  version int not null,
  template text not null,
  model text not null default 'claude-opus-5-5',
  effort text not null default 'high' check (effort in ('low','medium','high','xhigh','max')),
  max_tokens int not null default 12000,
  active boolean not null default false,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (step, version)
);
create unique index if not exists prompt_versions_one_active_per_step on public.prompt_versions(step) where active;

create table if not exists public.llm_calls (
  id bigint generated always as identity primary key,
  workspace_id uuid,
  generation_id uuid,
  eval_output_id uuid,
  step text,
  attempt int,
  purpose text,
  model text not null,
  prompt_version_id uuid references public.prompt_versions(id) on delete set null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cache_write_tokens int not null default 0,
  web_searches int not null default 0,
  cost_usd numeric(12,6) not null default 0,
  latency_ms int,
  stop_reason text,
  request_id text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists llm_calls_generation_idx on public.llm_calls(generation_id);
create index if not exists llm_calls_workspace_created_idx on public.llm_calls(workspace_id, created_at desc);
create index if not exists llm_calls_created_idx on public.llm_calls(created_at desc);

create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null,
  generation_id uuid,
  step text,
  attempt int,
  kind text not null, -- generation_completed | step_completed | ingest | rewrite | export
  tokens int not null default 0,
  cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);
-- a retried step never double counts
create unique index if not exists usage_events_once_per_step on public.usage_events(generation_id, step, attempt) where generation_id is not null and step is not null;
create index if not exists usage_events_workspace_idx on public.usage_events(workspace_id, created_at desc);

-- settings the dispatcher needs (functions base url). Secrets live in Vault / function secrets, never here.
create table if not exists app.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
revoke all on app.settings from public, anon, authenticated;

alter table public.prompt_versions enable row level security;
alter table public.llm_calls enable row level security;
alter table public.usage_events enable row level security;

create policy "prompt_versions: admin all" on public.prompt_versions for all using (app.is_admin()) with check (app.is_admin());
create policy "prompt_versions: authenticated read active" on public.prompt_versions for select using (active or app.is_admin());
create policy "llm_calls: member read own workspace" on public.llm_calls for select using (app.is_admin() or (workspace_id is not null and app.is_workspace_member(workspace_id)));
create policy "usage: member read" on public.usage_events for select using (app.is_admin() or app.is_workspace_member(workspace_id));

-- usage rollup for the dashboard
create or replace view public.workspace_usage_monthly with (security_invoker = true) as
select workspace_id, date_trunc('month', created_at) as month,
       count(*) filter (where kind = 'generation_completed') as generations,
       sum(tokens) as tokens, sum(cost_usd) as cost_usd
from public.usage_events group by 1,2;
