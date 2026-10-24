-- Generations (jobs), step attempts, angles, drafts, flags, feedback, predictions.
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete cascade,
  campaign_id uuid,
  format text not null,
  purpose text,
  options jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','needs_input','completed','failed','cancelled')),
  current_step text,
  progress_message text,
  step_order jsonb not null default '[]'::jsonb,
  research_id uuid references public.offer_research(id) on delete set null,
  variant_id uuid references public.offer_variants(id) on delete set null,
  voice_profile_id uuid references public.voice_profiles(id) on delete set null,
  selected_angle_id uuid,
  prompt_version_set jsonb not null default '{}'::jsonb,
  model_set jsonb not null default '{}'::jsonb,
  cost_usd numeric(12,6) not null default 0,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists generations_workspace_idx on public.generations(workspace_id, created_at desc);
create index if not exists generations_offer_idx on public.generations(offer_id, created_at desc);
create index if not exists generations_status_idx on public.generations(status) where status in ('queued','running');
create trigger generations_updated_at before update on public.generations for each row execute function app.set_updated_at();

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete cascade,
  name text not null,
  argument jsonb,            -- the one argument carried across assets
  asset_plan jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.generations add constraint generations_campaign_fk foreign key (campaign_id) references public.campaigns(id) on delete set null;

create table if not exists public.generation_steps (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  step text not null,
  attempt int not null default 1,
  status text not null default 'pending' check (status in ('pending','running','completed','failed','interrupted','skipped')),
  input_hash text,
  output jsonb,
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(12,6) not null default 0,
  duration_ms int,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (generation_id, step, attempt)
);
create index if not exists generation_steps_generation_idx on public.generation_steps(generation_id, created_at);

create table if not exists public.angles (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  rank int,
  candidate jsonb not null,      -- {core_desire, cluster, k, promise, mechanism, big_idea, lead_verbatim, belief_to_displace, proof_asset, ledger_refs}
  gates jsonb not null default '{}'::jsonb,   -- {desire: pass|fail|provisional, proof: pass|fail}
  scores jsonb not null default '{}'::jsonb,  -- C1..C14
  total numeric(6,2),
  is_finalist boolean not null default false,
  is_winner boolean not null default false,
  kept_as_loser boolean not null default false,
  thesis text,
  created_at timestamptz not null default now()
);
create index if not exists angles_generation_idx on public.angles(generation_id);
alter table public.generations add constraint generations_selected_angle_fk foreign key (selected_angle_id) references public.angles(id) on delete set null;

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  version int not null,
  origin text not null check (origin in ('system','revise','rewrite','user','challenger')),
  label text,
  blocks jsonb not null default '[]'::jsonb,   -- structured sections with inline ledger ids
  markdown text not null default '',
  skim_path jsonb,
  ledger_refs jsonb not null default '[]'::jsonb,
  word_count int,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (generation_id, version)
);
create index if not exists drafts_generation_idx on public.drafts(generation_id, version desc);

create table if not exists public.draft_flags (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  generation_id uuid not null references public.generations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source text not null check (source in ('editorial','factual','mechanical','cold_read')),
  kind text not null,
  severity text not null default 'medium' check (severity in ('info','low','medium','high','fatal')),
  quote text,
  rule text,
  issue text,
  suggested_rewrite text,
  claim_id uuid references public.offer_claims(id) on delete set null,
  decision text not null default 'pending' check (decision in ('pending','keep','rewrite','drop','dismissed')),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists draft_flags_draft_idx on public.draft_flags(draft_id);

create table if not exists public.draft_feedback (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  rating int check (rating between -1 and 1),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.generation_predictions (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  draft_id uuid references public.drafts(id) on delete set null,
  prediction text not null check (prediction in ('beat','lose','unsure')),
  reason text,
  control_ref text,
  reported_result jsonb,
  refund_rate numeric(6,3),
  reported_at timestamptz,
  created_at timestamptz not null default now()
);

-- RLS
do $$
declare t text;
begin
  foreach t in array array['generations','campaigns','generation_steps','angles','drafts','draft_flags','draft_feedback','generation_predictions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s: member read" on public.%I for select using (app.is_workspace_member(workspace_id) or app.is_admin())', t, t);
    execute format('create policy "%s: editor insert" on public.%I for insert with check (app.can_edit_workspace(workspace_id))', t, t);
    execute format('create policy "%s: editor update" on public.%I for update using (app.can_edit_workspace(workspace_id)) with check (app.can_edit_workspace(workspace_id))', t, t);
    execute format('create policy "%s: editor delete" on public.%I for delete using (app.can_edit_workspace(workspace_id))', t, t);
  end loop;
end $$;

-- a user may cancel; only the service role moves a job through steps. Guard status transitions from clients.
create or replace function app.guard_generation_update() returns trigger
language plpgsql as $$
begin
  if current_setting('request.jwt.claim.role', true) = 'service_role' or auth.uid() is null then
    return new; -- service role / internal
  end if;
  -- clients may only cancel, retry (queued) or change options/purpose labels
  if new.status is distinct from old.status and new.status not in ('cancelled','queued') then
    raise exception 'clients may only cancel or re-queue a generation';
  end if;
  new.cost_usd := old.cost_usd; new.input_tokens := old.input_tokens; new.output_tokens := old.output_tokens;
  return new;
end $$;
create trigger generations_guard before update on public.generations for each row execute function app.guard_generation_update();
