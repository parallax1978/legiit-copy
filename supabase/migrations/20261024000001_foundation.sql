-- Legiit Copy: foundation. Extensions, helper schema, tenancy, profiles, admins, audit.
create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists pg_trgm;

create schema if not exists app;
grant usage on schema app to authenticated, anon, service_role;

-- ---------- helpers ----------
create or replace function app.current_user_id() returns uuid
language sql stable as $$ select auth.uid() $$;

create or replace function app.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- tenancy ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  onboarding_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  settings jsonb not null default '{}'::jsonb,
  instruction_memory jsonb not null default '[]'::jsonb, -- per-workspace learned preferences (never global)
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists workspace_members_user_idx on public.workspace_members(user_id);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor','viewer','owner')),
  token text not null unique default encode(gen_random_bytes(24),'hex'),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);
create index if not exists workspace_invites_email_idx on public.workspace_invites(lower(email));

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  workspace_id uuid,
  action text not null,
  target_type text,
  target_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_workspace_idx on public.audit_log(workspace_id, created_at desc);

-- ---------- membership helpers (security definer so RLS policies can call them without recursion) ----------
create or replace function app.is_workspace_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members m where m.workspace_id = ws and m.user_id = auth.uid())
$$;
create or replace function app.workspace_role(ws uuid) returns text
language sql stable security definer set search_path = public as $$
  select m.role from public.workspace_members m where m.workspace_id = ws and m.user_id = auth.uid() limit 1
$$;
create or replace function app.can_edit_workspace(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app.workspace_role(ws) in ('owner','editor'), false)
$$;
create or replace function app.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins a where a.user_id = auth.uid())
$$;
revoke all on function app.is_workspace_member(uuid), app.workspace_role(uuid), app.can_edit_workspace(uuid), app.is_admin() from public;
grant execute on function app.is_workspace_member(uuid), app.workspace_role(uuid), app.can_edit_workspace(uuid), app.is_admin() to authenticated, service_role;

-- ---------- new user: profile + personal workspace ----------
create or replace function app.slugify(t text) returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(coalesce(t,'')), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function app.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ws_id uuid;
  base text;
  candidate text;
  n int := 0;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''),'@',1)))
  on conflict (id) do nothing;

  base := coalesce(nullif(app.slugify(split_part(coalesce(new.email,''),'@',1)),''), 'workspace');
  candidate := base;
  while exists (select 1 from public.workspaces where slug = candidate) loop
    n := n + 1; candidate := base || '-' || n;
  end loop;

  insert into public.workspaces (name, slug, created_by)
  values (coalesce(new.raw_user_meta_data->>'workspace_name', 'My workspace'), candidate, new.id)
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role) values (ws_id, new.id, 'owner');

  -- accept any pending invites for this email
  insert into public.workspace_members (workspace_id, user_id, role)
  select i.workspace_id, new.id, i.role from public.workspace_invites i
  where lower(i.email) = lower(coalesce(new.email,'')) and i.accepted_at is null and i.expires_at > now()
  on conflict do nothing;
  update public.workspace_invites set accepted_at = now()
  where lower(email) = lower(coalesce(new.email,'')) and accepted_at is null and expires_at > now();
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function app.handle_new_user();

create trigger profiles_updated_at before update on public.profiles for each row execute function app.set_updated_at();
create trigger workspaces_updated_at before update on public.workspaces for each row execute function app.set_updated_at();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.app_admins enable row level security;
alter table public.audit_log enable row level security;

create policy "profiles: self read" on public.profiles for select using (id = auth.uid() or app.is_admin());
create policy "profiles: self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "workspaces: member read" on public.workspaces for select using (app.is_workspace_member(id) or app.is_admin());
create policy "workspaces: owner update" on public.workspaces for update using (app.workspace_role(id) = 'owner') with check (app.workspace_role(id) = 'owner');
create policy "workspaces: authenticated insert" on public.workspaces for insert with check (auth.uid() is not null and created_by = auth.uid());
create policy "workspaces: owner delete" on public.workspaces for delete using (app.workspace_role(id) = 'owner');

create policy "members: member read" on public.workspace_members for select using (app.is_workspace_member(workspace_id) or app.is_admin());
create policy "members: owner manage" on public.workspace_members for all using (app.workspace_role(workspace_id) = 'owner') with check (app.workspace_role(workspace_id) = 'owner');

create policy "invites: member read" on public.workspace_invites for select using (app.is_workspace_member(workspace_id) or lower(email) = lower(coalesce((auth.jwt()->>'email'),'')));
create policy "invites: owner manage" on public.workspace_invites for all using (app.workspace_role(workspace_id) = 'owner') with check (app.workspace_role(workspace_id) = 'owner');

create policy "admins: admin read" on public.app_admins for select using (app.is_admin());
create policy "audit: admin read" on public.audit_log for select using (app.is_admin());
create policy "audit: member insert" on public.audit_log for insert with check (actor_id = auth.uid());

-- creator becomes owner when a workspace is created from the app
create or replace function app.handle_new_workspace() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into public.workspace_members (workspace_id, user_id, role) values (new.id, new.created_by, 'owner') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_workspace_created after insert on public.workspaces for each row execute function app.handle_new_workspace();

-- invite acceptance for an already-registered user
create or replace function public.accept_invite(invite_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.workspace_invites;
begin
  select * into inv from public.workspace_invites where token = invite_token and accepted_at is null and expires_at > now();
  if inv.id is null then raise exception 'invite not found or expired'; end if;
  if lower(inv.email) <> lower(coalesce(auth.jwt()->>'email','')) then raise exception 'invite is for a different email'; end if;
  insert into public.workspace_members (workspace_id, user_id, role) values (inv.workspace_id, auth.uid(), inv.role) on conflict do nothing;
  update public.workspace_invites set accepted_at = now() where id = inv.id;
  return inv.workspace_id;
end $$;
grant execute on function public.accept_invite(text) to authenticated;
