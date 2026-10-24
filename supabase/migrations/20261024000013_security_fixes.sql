-- Security review fixes (2026-10-24). Layers on the earlier migrations; none of them is edited.
--
-- 1. Cross-tenant consistency. Every child row carries workspace_id for RLS, but nothing tied that column to the
--    parent the row points at. An editor of workspace A could insert generations(workspace_id = A, offer_id = <B's
--    offer>), drafts or generation_steps(workspace_id = A, generation_id = <B's generation>), voice_profiles(offer_id =
--    <B's offer>) and so on. run-step, export and rewrite-passage load parents by id with the service role, so that let
--    A read B's brief, claims and research through its own generation, and poison B's pipeline state and exports.
--    A BEFORE trigger now requires every parent reference to live in the row's own workspace. It runs for every role.
-- 2. Invites are accepted only for a confirmed email address, both at sign-up and in accept_invite. With password
--    sign-ups reachable through the Auth API and confirmations off, anyone could register a victim's address and
--    inherit their invites.
-- 3. audit_log inserts are scoped to the actor's own workspaces.
-- 4. prompt_versions are readable by admins only; functions read them with the service role.
-- 5. profiles: clients may change full_name and onboarding_state, never email (shown to co-members).
-- 6. Internal app.* helpers that no policy calls lose EXECUTE for API roles.

-- ---------- 1. parent references stay inside the row's workspace ----------
create or replace function app.enforce_parent_workspace() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  col text := tg_argv[0];
  parent text := tg_argv[1];
  child_ref uuid;
  parent_ws uuid;
begin
  child_ref := nullif(to_jsonb(new) ->> col, '')::uuid;
  if child_ref is null then return new; end if;
  execute format('select workspace_id from public.%I where id = $1', parent) into parent_ws using child_ref;
  if parent_ws is null then
    raise exception '%.% references a % row that does not exist', tg_table_name, col, parent using errcode = 'foreign_key_violation';
  end if;
  if parent_ws is distinct from new.workspace_id then
    raise exception '%.% must reference a % row in the same workspace', tg_table_name, col, parent using errcode = 'check_violation';
  end if;
  return new;
end $$;

do $$
declare r record;
begin
  for r in
    select * from (values
      ('offer_sources', 'offer_id', 'offers'),
      ('offer_claims', 'offer_id', 'offers'),
      ('offer_config', 'offer_id', 'offers'),
      ('offer_variants', 'offer_id', 'offers'),
      ('offer_research', 'offer_id', 'offers'),
      ('offer_questions', 'offer_id', 'offers'),
      ('voice_profiles', 'offer_id', 'offers'),
      ('campaigns', 'offer_id', 'offers'),
      ('generations', 'offer_id', 'offers'),
      ('generations', 'campaign_id', 'campaigns'),
      ('generations', 'research_id', 'offer_research'),
      ('generations', 'variant_id', 'offer_variants'),
      ('generations', 'voice_profile_id', 'voice_profiles'),
      ('generations', 'selected_angle_id', 'angles'),
      ('generation_steps', 'generation_id', 'generations'),
      ('angles', 'generation_id', 'generations'),
      ('drafts', 'generation_id', 'generations'),
      ('draft_flags', 'generation_id', 'generations'),
      ('draft_flags', 'draft_id', 'drafts'),
      ('draft_flags', 'claim_id', 'offer_claims'),
      ('draft_feedback', 'draft_id', 'drafts'),
      ('generation_predictions', 'generation_id', 'generations'),
      ('generation_predictions', 'draft_id', 'drafts')
    ) as t(tbl, col, parent)
  loop
    execute format('drop trigger if exists %I on public.%I', r.tbl || '_same_ws_' || r.col, r.tbl);
    execute format(
      'create trigger %I before insert or update of %I, workspace_id on public.%I for each row execute function app.enforce_parent_workspace(%L, %L)',
      r.tbl || '_same_ws_' || r.col, r.col, r.tbl, r.col, r.parent
    );
  end loop;
end $$;

-- ---------- 2. invites: only a confirmed address accepts ----------
create or replace function app.accept_pending_invites(p_user_id uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user_id is null or coalesce(p_email, '') = '' then return; end if;
  insert into public.workspace_members (workspace_id, user_id, role)
  select i.workspace_id, p_user_id, i.role from public.workspace_invites i
  where lower(i.email) = lower(p_email) and i.accepted_at is null and i.expires_at > now()
  on conflict do nothing;
  update public.workspace_invites set accepted_at = now()
  where lower(email) = lower(p_email) and accepted_at is null and expires_at > now();
end $$;
revoke all on function app.accept_pending_invites(uuid, text) from public, anon, authenticated;

-- Same as before, except: the owner membership tolerates the on_workspace_created trigger having inserted it first,
-- and pending invites are accepted only when the address is already confirmed (OAuth, admin-created users).
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
  insert into public.workspace_members (workspace_id, user_id, role) values (ws_id, new.id, 'owner') on conflict do nothing;

  if new.email_confirmed_at is not null then
    perform app.accept_pending_invites(new.id, new.email);
  end if;
  return new;
end $$;

-- Magic-link and password sign-ups confirm later: accept the pending invites at that moment.
create or replace function app.handle_user_confirmed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform app.accept_pending_invites(new.id, new.email);
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users
for each row execute function app.handle_user_confirmed();

-- The address comes from auth.users (not the JWT) and must be confirmed.
create or replace function public.accept_invite(invite_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv public.workspace_invites;
  u_email text;
  u_confirmed timestamptz;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select u.email, u.email_confirmed_at into u_email, u_confirmed from auth.users u where u.id = auth.uid();
  if u_email is null or u_confirmed is null then raise exception 'confirm your email address before accepting an invite'; end if;
  select * into inv from public.workspace_invites where token = invite_token and accepted_at is null and expires_at > now();
  if inv.id is null then raise exception 'invite not found or expired'; end if;
  if lower(inv.email) <> lower(u_email) then raise exception 'invite is for a different email'; end if;
  insert into public.workspace_members (workspace_id, user_id, role) values (inv.workspace_id, auth.uid(), inv.role) on conflict do nothing;
  update public.workspace_invites set accepted_at = now() where id = inv.id;
  return inv.workspace_id;
end $$;

-- ---------- 3. audit_log ----------
drop policy if exists "audit: member insert" on public.audit_log;
create policy "audit: member insert" on public.audit_log for insert
  with check (actor_id = auth.uid() and (workspace_id is null or app.is_workspace_member(workspace_id)));

-- ---------- 4. prompt_versions: admin only ----------
drop policy if exists "prompt_versions: authenticated read active" on public.prompt_versions;

-- ---------- 5. profiles: clients never rewrite email ----------
revoke update on public.profiles from anon, authenticated;
grant update (full_name, onboarding_state) on public.profiles to authenticated;

-- ---------- 6. internal helpers ----------
revoke execute on function app.sweep_stuck_generations(), app.current_user_id(), app.slugify(text) from public, anon, authenticated;
