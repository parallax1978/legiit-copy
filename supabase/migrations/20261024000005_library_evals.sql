-- Teaching library, critiques, controls, split-test pairs, eval harness, judge calibration.
create table if not exists public.examples (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  format text not null,
  market text,
  selling_situation text,              -- launch | evergreen | cart_close | reactivation | cold | retargeting
  awareness text,
  sophistication text,
  lead_type text,
  argument_sentence text,
  hook text,
  mechanism_type text,
  proof_placement jsonb not null default '[]'::jsonb,
  offer_devices jsonb not null default '[]'::jsonb,
  voice_profile text,
  funnel_position text,
  documented_result text,
  is_loser boolean not null default false,
  rights_status text not null default 'unknown' check (rights_status in ('public_domain','publicly_posted_copyrighted','licensed','unknown')),
  source_url text,
  excerpt text check (excerpt is null or length(excerpt) <= 400),
  full_text text,                      -- only when rights_status allows
  annotations jsonb not null default '{}'::jsonb,
  lessons jsonb not null default '[]'::jsonb,
  embedding vector(384),
  status text not null default 'draft' check (status in ('draft','curated','retired')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint examples_full_text_rights check (full_text is null or rights_status in ('public_domain','licensed'))
);
create index if not exists examples_format_idx on public.examples(format, status);
create index if not exists examples_embedding_idx on public.examples using hnsw (embedding vector_cosine_ops);
create trigger examples_updated_at before update on public.examples for each row execute function app.set_updated_at();

create table if not exists public.example_sections (
  id uuid primary key default gen_random_uuid(),
  example_id uuid not null references public.examples(id) on delete cascade,
  section_type text not null check (section_type in ('headline','lead','mechanism','bullets','proof','offer','close','order_form','ps','other')),
  annotation text not null,            -- structural description in our words
  excerpt text check (excerpt is null or length(excerpt) <= 400),
  text text,                           -- only when rights allow
  embedding vector(384),
  created_at timestamptz not null default now()
);
create index if not exists example_sections_example_idx on public.example_sections(example_id);
create index if not exists example_sections_embedding_idx on public.example_sections using hnsw (embedding vector_cosine_ops);

create table if not exists public.critiques (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text,
  source_url text,
  chief text,
  format text,
  brief text,
  weak_draft text,                     -- "before"
  strong_revision text,                -- "after"
  quote_status text,
  defect text,
  defect_named text,
  principle text,
  reason text,
  tested jsonb,
  evidence text,
  confidence text,
  ai_failure_map jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  embedding vector(384),
  status text not null default 'curated' check (status in ('draft','curated','retired')),
  created_at timestamptz not null default now()
);
create index if not exists critiques_embedding_idx on public.critiques using hnsw (embedding vector_cosine_ops);

create table if not exists public.controls (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  workspace_id uuid references public.workspaces(id) on delete cascade,   -- null = global, sourced by the build
  title text not null,
  author text,
  format text not null,
  market text,
  funnel_position text,
  traffic text,
  source_url text,
  rights_status text not null default 'unknown',
  excerpt text check (excerpt is null or length(excerpt) <= 400),
  full_text text,
  structure jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  losing_variants jsonb not null default '[]'::jsonb,
  lessons jsonb not null default '[]'::jsonb,
  notes text,
  verification text,
  embedding vector(384),
  created_at timestamptz not null default now(),
  constraint controls_full_text_rights check (full_text is null or rights_status in ('public_domain','licensed'))
);
create index if not exists controls_format_idx on public.controls(format);
create index if not exists controls_embedding_idx on public.controls using hnsw (embedding vector_cosine_ops);

create table if not exists public.split_test_pairs (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text,
  source_url text,
  format text,
  element_tested text,
  variant_a text,
  variant_b text,
  winner text check (winner in ('a','b')),
  lift text,
  metric text,
  sample_size text,
  confidence text,
  why_it_won text,
  principle text,
  contradicts_standard boolean not null default false,
  verification text,
  holdout boolean not null default false,   -- reserved for judge calibration, never shown to prompts
  created_at timestamptz not null default now()
);

-- eval harness
create table if not exists public.eval_briefs (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  brief jsonb not null,
  market text,
  formats jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.eval_runs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  prompt_version_set jsonb not null default '{}'::jsonb,
  model_set jsonb not null default '{}'::jsonb,
  baseline boolean not null default false,  -- single-prompt generator for comparison
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  cost_usd numeric(12,6) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create table if not exists public.eval_outputs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.eval_runs(id) on delete cascade,
  brief_id uuid not null references public.eval_briefs(id) on delete cascade,
  format text not null,
  output jsonb,
  markdown text,
  steps jsonb,
  cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists eval_outputs_run_idx on public.eval_outputs(run_id);

create table if not exists public.eval_comparisons (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('engine_vs_baseline','engine_vs_engine','split_test_pair')),
  brief_id uuid references public.eval_briefs(id) on delete cascade,
  split_test_pair_id uuid references public.split_test_pairs(id) on delete cascade,
  output_a uuid references public.eval_outputs(id) on delete cascade,
  output_b uuid references public.eval_outputs(id) on delete cascade,
  winner text not null check (winner in ('a','b','tie')),
  reason text,
  judged_by text not null check (judged_by in ('human','judge')),
  judge_model text,
  judge_prompt_version_id uuid references public.prompt_versions(id) on delete set null,
  judge_user uuid references auth.users(id) on delete set null,
  ground_truth text check (ground_truth in ('a','b')),
  correct boolean generated always as (case when ground_truth is null then null else winner = ground_truth end) stored,
  created_at timestamptz not null default now()
);
create index if not exists eval_comparisons_kind_idx on public.eval_comparisons(kind, created_at desc);

create table if not exists public.judge_calibrations (
  id uuid primary key default gen_random_uuid(),
  judge_model text not null,
  judge_prompt_version_id uuid references public.prompt_versions(id) on delete set null,
  pairs_evaluated int not null,
  correct int not null,
  accuracy numeric(5,4) generated always as (case when pairs_evaluated = 0 then 0 else correct::numeric / pairs_evaluated end) stored,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- RLS: library and evals are internal. Authenticated users may read curated examples/critiques? No: prompts read them via service role. Admin only.
do $$
declare t text;
begin
  foreach t in array array['examples','example_sections','critiques','split_test_pairs','eval_briefs','eval_runs','eval_outputs','eval_comparisons','judge_calibrations'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s: admin all" on public.%I for all using (app.is_admin()) with check (app.is_admin())', t, t);
  end loop;
end $$;
alter table public.controls enable row level security;
create policy "controls: admin all" on public.controls for all using (app.is_admin()) with check (app.is_admin());
create policy "controls: member read own" on public.controls for select using (workspace_id is not null and app.is_workspace_member(workspace_id));
create policy "controls: editor write own" on public.controls for insert with check (workspace_id is not null and app.can_edit_workspace(workspace_id));
create policy "controls: editor update own" on public.controls for update using (workspace_id is not null and app.can_edit_workspace(workspace_id));

-- retrieval helpers (service role; used by the engine)
create or replace function public.match_examples(query_embedding vector(384), match_format text, match_count int default 3, exclude_losers boolean default true)
returns table (id uuid, title text, format text, lead_type text, argument_sentence text, excerpt text, lessons jsonb, annotations jsonb, similarity float)
language sql stable security definer set search_path = public as $$
  select e.id, e.title, e.format, e.lead_type, e.argument_sentence, e.excerpt, e.lessons, e.annotations,
         1 - (e.embedding <=> query_embedding) as similarity
  from public.examples e
  where e.status = 'curated' and e.embedding is not null
    and (match_format is null or e.format = match_format)
    and (not exclude_losers or not e.is_loser)
  order by e.embedding <=> query_embedding
  limit match_count
$$;
create or replace function public.match_critiques(query_embedding vector(384), match_format text, match_count int default 3)
returns table (id uuid, chief text, format text, weak_draft text, strong_revision text, defect_named text, principle text, similarity float)
language sql stable security definer set search_path = public as $$
  select c.id, c.chief, c.format, c.weak_draft, c.strong_revision, c.defect_named, c.principle,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.critiques c
  where c.status = 'curated' and c.embedding is not null
    and (match_format is null or c.format = match_format or c.format is null)
  order by c.embedding <=> query_embedding
  limit match_count
$$;
revoke all on function public.match_examples(vector, text, int, boolean), public.match_critiques(vector, text, int) from public, anon, authenticated;
grant execute on function public.match_examples(vector, text, int, boolean), public.match_critiques(vector, text, int) to service_role;
