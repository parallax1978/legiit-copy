-- Offers, sources, claims ledger (flag, never prohibit), per-offer config, offer variants, research, questions, voice profiles.
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft','extracting','needs_review','ready','archived')),
  brief jsonb not null default '{}'::jsonb,       -- structured brief (product, deliverables, price, terms, guarantee, audience, proof, positioning)
  audience text,
  price text,
  guarantee text,
  positioning text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists offers_workspace_idx on public.offers(workspace_id, updated_at desc);
create trigger offers_updated_at before update on public.offers for each row execute function app.set_updated_at();

create table if not exists public.offer_sources (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('url','file','text')),
  url text,
  storage_path text,
  title text,
  mime_type text,
  extracted_text text,
  extraction_status text not null default 'pending' check (extraction_status in ('pending','processing','done','failed')),
  error text,
  created_at timestamptz not null default now()
);
create index if not exists offer_sources_offer_idx on public.offer_sources(offer_id);

create table if not exists public.offer_claims (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  claim_text text not null,
  claim_type text not null default 'other', -- the 19 types in docs/04-copy-standard.md §8.1
  role text,                                 -- role in the argument: promise | mechanism | proof | offer_term | credential | story
  evidence_grade text check (evidence_grade in ('A','B','C','D','E','F')),
  evidence jsonb not null default '{}'::jsonb, -- {source_ref, quote, endpoint, population, dose, duration, effect_size}
  precision text,
  typical_result text,
  earnings_context jsonb,
  material_connection boolean not null default false,
  guarantee_terms jsonb,
  former_price jsonb,
  scarcity jsonb,                            -- {number, enforced:boolean}
  deadline jsonb,                            -- {date, mechanism}
  trial_terms jsonb,
  story_claim boolean not null default false,
  establishment_signal boolean not null default false,
  status text not null default 'unverified' check (status in ('verified','unverified','flagged')),
  flag jsonb,                                -- {rule, severity, issue, suggested_rewrite}
  user_decision text check (user_decision in ('keep','rewrite','drop')),
  created_by text not null default 'system' check (created_by in ('system','user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists offer_claims_offer_idx on public.offer_claims(offer_id);
create trigger offer_claims_updated_at before update on public.offer_claims for each row execute function app.set_updated_at();

create table if not exists public.offer_config (
  offer_id uuid primary key references public.offers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  vertical text,
  business_opportunity boolean not null default false,
  notice_recipient boolean not null default false,
  humor_policy jsonb not null default '{}'::jsonb,
  greeting text,
  edge_tolerance text,
  refund_window_days int,
  first_week_experience text,
  updated_at timestamptz not null default now()
);
create trigger offer_config_updated_at before update on public.offer_config for each row execute function app.set_updated_at();

create table if not exists public.offer_variants (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  options_sheet jsonb not null default '[]'::jsonb,
  chosen jsonb,
  reasons text,
  guarantee jsonb,
  deadline jsonb,
  gap_note text,
  status text not null default 'proposed' check (status in ('proposed','approved','rejected')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists offer_variants_offer_idx on public.offer_variants(offer_id, created_at desc);

create table if not exists public.offer_research (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  version int not null default 1,
  dossier jsonb not null default '{}'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  model text,
  cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists offer_research_one_active on public.offer_research(offer_id) where active;

create table if not exists public.offer_questions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  question text not null,
  why text,
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.voice_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  offer_id uuid references public.offers(id) on delete set null,
  name text not null,
  samples jsonb not null default '[]'::jsonb,
  parameters jsonb not null default '{}'::jsonb,          -- measured: sentence length mean/sd, fragment rate, FK grade, paragraph habits, pronoun ratio...
  idiom_bank jsonb not null default '[]'::jsonb,
  dead_words jsonb not null default '[]'::jsonb,
  exemplar_paragraphs jsonb not null default '[]'::jsonb,  -- lead, proof passage, close
  story_inventory jsonb not null default '[]'::jsonb,
  readability_band text,
  greeting text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger voice_profiles_updated_at before update on public.voice_profiles for each row execute function app.set_updated_at();

-- RLS: members read; owner/editor write
do $$
declare t text;
begin
  foreach t in array array['offers','offer_sources','offer_claims','offer_config','offer_variants','offer_research','offer_questions','voice_profiles'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s: member read" on public.%I for select using (app.is_workspace_member(workspace_id) or app.is_admin())', t, t);
    execute format('create policy "%s: editor insert" on public.%I for insert with check (app.can_edit_workspace(workspace_id))', t, t);
    execute format('create policy "%s: editor update" on public.%I for update using (app.can_edit_workspace(workspace_id)) with check (app.can_edit_workspace(workspace_id))', t, t);
    execute format('create policy "%s: editor delete" on public.%I for delete using (app.can_edit_workspace(workspace_id))', t, t);
  end loop;
end $$;
