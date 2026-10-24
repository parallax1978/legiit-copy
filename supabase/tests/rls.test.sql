-- RLS and privilege tests. NOT a migration. Run against a database built from local_stubs.sql + every migration:
--   psql -h localhost -U postgres -d sec_check -v ON_ERROR_STOP=1 -q -f supabase/tests/rls.test.sql
-- Everything runs inside one transaction that is rolled back. Each DO block raises on failure; a clean run prints
-- only the final notice. Claims are set the way PostgREST does (request.jwt.claim.sub / .role, request.jwt.claims)
-- and the statements run as the `authenticated` role, so policies, column grants and function grants all apply.
begin;

-- ---------- fixtures (superuser, bypasses RLS) ----------
create temp table fx (k text primary key, v uuid);
insert into fx values
  ('user_a', 'aaaaaaaa-0000-4000-8000-000000000001'),  -- owner of workspace A
  ('user_b', 'bbbbbbbb-0000-4000-8000-000000000001'),  -- owner of workspace B
  ('user_v', 'cccccccc-0000-4000-8000-000000000001'),  -- viewer in workspace A
  ('user_u', 'dddddddd-0000-4000-8000-000000000001');  -- signs up unconfirmed
grant select on fx to authenticated;

create or replace function pg_temp.id(k text) returns uuid language sql stable as $$ select v from fx where fx.k = id.k $$;
create or replace function pg_temp.login(k text, email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', pg_temp.id(k)::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.id(k), 'email', email, 'role', 'authenticated')::text, true);
end $$;

insert into auth.users (id, email, email_confirmed_at) values
  (pg_temp.id('user_a'), 'alice@a.test', now()),
  (pg_temp.id('user_b'), 'bob@b.test', now()),
  (pg_temp.id('user_v'), 'vic@a.test', now());

insert into fx select 'ws_a', workspace_id from public.workspace_members where user_id = pg_temp.id('user_a') and role = 'owner';
insert into fx select 'ws_b', workspace_id from public.workspace_members where user_id = pg_temp.id('user_b') and role = 'owner';
insert into public.workspace_members (workspace_id, user_id, role) values (pg_temp.id('ws_a'), pg_temp.id('user_v'), 'viewer');

insert into fx values ('offer_a', gen_random_uuid()), ('offer_b', gen_random_uuid()), ('gen_a', gen_random_uuid()), ('gen_b', gen_random_uuid()),
  ('draft_a', gen_random_uuid()), ('draft_b', gen_random_uuid()), ('claim_a', gen_random_uuid()), ('claim_b', gen_random_uuid());
insert into public.offers (id, workspace_id, name) values (pg_temp.id('offer_a'), pg_temp.id('ws_a'), 'Offer A'), (pg_temp.id('offer_b'), pg_temp.id('ws_b'), 'Offer B');
insert into public.generations (id, workspace_id, offer_id, format, status) values
  (pg_temp.id('gen_a'), pg_temp.id('ws_a'), pg_temp.id('offer_a'), 'email_single', 'completed'),
  (pg_temp.id('gen_b'), pg_temp.id('ws_b'), pg_temp.id('offer_b'), 'email_single', 'completed');
insert into public.drafts (id, generation_id, workspace_id, version, origin, markdown) values
  (pg_temp.id('draft_a'), pg_temp.id('gen_a'), pg_temp.id('ws_a'), 1, 'system', 'A secret draft'),
  (pg_temp.id('draft_b'), pg_temp.id('gen_b'), pg_temp.id('ws_b'), 1, 'system', 'B secret draft');
insert into public.offer_claims (id, offer_id, workspace_id, claim_text) values
  (pg_temp.id('claim_a'), pg_temp.id('offer_a'), pg_temp.id('ws_a'), 'A claim'),
  (pg_temp.id('claim_b'), pg_temp.id('offer_b'), pg_temp.id('ws_b'), 'B claim');
insert into public.generation_steps (generation_id, workspace_id, step, status) values
  (pg_temp.id('gen_a'), pg_temp.id('ws_a'), 'draft', 'completed'), (pg_temp.id('gen_b'), pg_temp.id('ws_b'), 'draft', 'completed');
insert into public.prompt_versions (step, version, template, active) values ('draft', 1, 'SECRET PROMPT', true);
insert into public.workspace_invites (workspace_id, email, role, token) values
  (pg_temp.id('ws_b'), 'alice@a.test', 'editor', 'tok-alice'),
  (pg_temp.id('ws_b'), 'other@x.test', 'editor', 'tok-other'),
  (pg_temp.id('ws_b'), 'unconf@u.test', 'editor', 'tok-unconf');

-- sign-up with a pending invite but no confirmed address: the invite stays pending until confirmation
insert into auth.users (id, email) values (pg_temp.id('user_u'), 'unconf@u.test');
do $$ begin
  assert not exists (select 1 from public.workspace_members where user_id = pg_temp.id('user_u') and workspace_id = pg_temp.id('ws_b')),
    'unconfirmed sign-up must not be added to the inviting workspace';
end $$;

-- ====================================================================================================
-- as alice (owner of A)
-- ====================================================================================================
set local role authenticated;
do $$ begin perform pg_temp.login('user_a', 'alice@a.test'); end $$;

do $$ begin
  -- reads stay inside A
  assert (select count(*) from public.offers) = 1, 'alice sees exactly her own offer';
  assert (select count(*) from public.offers where id = pg_temp.id('offer_b')) = 0, 'alice must not read offer B';
  assert (select count(*) from public.drafts where id = pg_temp.id('draft_b')) = 0, 'alice must not read draft B';
  assert (select count(*) from public.offer_claims where id = pg_temp.id('claim_b')) = 0, 'alice must not read claim B';
  assert (select count(*) from public.generations where id = pg_temp.id('gen_b')) = 0, 'alice must not read generation B';
  assert (select count(*) from public.generation_steps where generation_id = pg_temp.id('gen_b')) = 0, 'alice must not read B step rows';
  assert (select count(*) from public.workspace_members where workspace_id = pg_temp.id('ws_b')) = 0, 'alice must not list B members';
  assert (select count(*) from public.workspace_invites where workspace_id = pg_temp.id('ws_b') and email <> 'alice@a.test') = 0, 'alice sees only the invite addressed to her';
  -- profiles: self and co-members only
  assert (select count(*) from public.profiles where id = pg_temp.id('user_b')) = 0, 'alice must not read bob''s profile';
  assert (select count(*) from public.profiles where id = pg_temp.id('user_v')) = 1, 'alice reads her co-member''s profile';
  -- admin-only tables and prompts are empty for a plain user
  assert (select count(*) from public.prompt_versions) = 0, 'prompt templates are not readable by members';
  assert (select count(*) from public.examples) = 0 and (select count(*) from public.eval_runs) = 0 and (select count(*) from public.app_admins) = 0, 'admin tables are empty for members';
  assert (select count(*) from public.audit_log) = 0, 'audit log is admin only';
end $$;

-- cross-workspace references are refused even though workspace_id = A passes RLS
do $$
declare
  rejected int := 0;
  stmts text[] := array[
    format('insert into public.generations (workspace_id, offer_id, format, status) values (%L, %L, %L, %L)', pg_temp.id('ws_a'), pg_temp.id('offer_b'), 'email_single', 'completed'),
    format('insert into public.generation_steps (generation_id, workspace_id, step, status, output) values (%L, %L, %L, %L, %L::jsonb)', pg_temp.id('gen_b'), pg_temp.id('ws_a'), 'editorial', 'completed', '{"verdict":"APPROVE"}'),
    format('insert into public.drafts (generation_id, workspace_id, version, origin, markdown) values (%L, %L, 99, %L, %L)', pg_temp.id('gen_b'), pg_temp.id('ws_a'), 'user', 'injected'),
    format('insert into public.offer_claims (offer_id, workspace_id, claim_text) values (%L, %L, %L)', pg_temp.id('offer_b'), pg_temp.id('ws_a'), 'injected claim'),
    format('insert into public.voice_profiles (workspace_id, offer_id, name) values (%L, %L, %L)', pg_temp.id('ws_a'), pg_temp.id('offer_b'), 'injected voice'),
    format('insert into public.angles (generation_id, workspace_id, candidate) values (%L, %L, %L::jsonb)', pg_temp.id('gen_b'), pg_temp.id('ws_a'), '{}'),
    format('update public.generations set offer_id = %L where id = %L', pg_temp.id('offer_b'), pg_temp.id('gen_a')),
    format('update public.drafts set workspace_id = %L where id = %L', pg_temp.id('ws_b'), pg_temp.id('draft_a'))
  ];
  s text;
begin
  foreach s in array stmts loop
    begin
      execute s;
      raise exception 'TEST FAILED: statement was accepted: %', s;
    exception
      when check_violation or foreign_key_violation or insufficient_privilege then rejected := rejected + 1;
    end;
  end loop;
  assert rejected = array_length(stmts, 1), 'every cross-workspace reference is refused';
  -- the same shapes inside A are fine
  insert into public.offer_claims (offer_id, workspace_id, claim_text) values (pg_temp.id('offer_a'), pg_temp.id('ws_a'), 'own claim');
  insert into public.drafts (generation_id, workspace_id, version, origin, markdown) values (pg_temp.id('gen_a'), pg_temp.id('ws_a'), 2, 'user', 'own edit');
  update public.offers set name = 'Offer A renamed' where id = pg_temp.id('offer_a');
end $$;

-- security-definer RPCs and grants
do $$ begin
  begin
    perform public.requeue_generation(pg_temp.id('gen_b'), 'argument');
    raise exception 'TEST FAILED: alice requeued generation B';
  exception when others then
    if sqlerrm not like '%not allowed%' then raise; end if;
  end;
  begin
    perform public.record_usage(pg_temp.id('ws_a'), null, null, null, 'export', 0, 0);
    raise exception 'TEST FAILED: record_usage callable by a user';
  exception when insufficient_privilege then null; end;
  begin
    perform public.enqueue_step(pg_temp.id('gen_a'), 'draft', 0);
    raise exception 'TEST FAILED: enqueue_step callable by a user';
  exception when insufficient_privilege then null; end;
  begin
    perform public.get_setting('functions_url');
    raise exception 'TEST FAILED: get_setting callable by a user';
  exception when insufficient_privilege then null; end;
  begin
    perform public.set_setting('functions_url', 'x');
    raise exception 'TEST FAILED: set_setting callable by a user';
  exception when insufficient_privilege then null; end;
  begin
    perform public.queue_ack(1);
    raise exception 'TEST FAILED: queue_ack callable by a user';
  exception when insufficient_privilege then null; end;
  begin
    perform public.admin_get_setting('functions_url');
    raise exception 'TEST FAILED: admin_get_setting worked for a non-admin';
  exception when others then
    if sqlerrm not like '%admin only%' then raise; end if;
  end;
  begin
    perform public.match_examples(null, null, 3, true);
    raise exception 'TEST FAILED: match_examples callable by a user';
  exception when insufficient_privilege then null; end;
  begin
    perform public.leave_workspace(pg_temp.id('ws_a'));
    raise exception 'TEST FAILED: the last owner left the workspace';
  exception when others then
    if sqlerrm not like '%last owner%' then raise; end if;
  end;
end $$;

-- audit_log and profiles writes
do $$ begin
  begin
    insert into public.audit_log (actor_id, workspace_id, action) values (pg_temp.id('user_a'), pg_temp.id('ws_b'), 'spoof');
    raise exception 'TEST FAILED: audit row written for another workspace';
  exception when insufficient_privilege then null; end;
  insert into public.audit_log (actor_id, workspace_id, action) values (pg_temp.id('user_a'), pg_temp.id('ws_a'), 'ok');
  begin
    update public.profiles set email = 'ceo@b.test' where id = pg_temp.id('user_a');
    raise exception 'TEST FAILED: profile email rewritten by its owner';
  exception when insufficient_privilege then null; end;
  update public.profiles set full_name = 'Alice' where id = pg_temp.id('user_a');
  assert (select full_name from public.profiles where id = pg_temp.id('user_a')) = 'Alice', 'full_name update works';
end $$;

-- storage: the first folder is the workspace and nothing else is accepted
do $$ begin
  insert into storage.objects (bucket_id, name) values ('offer-sources', pg_temp.id('ws_a') || '/' || pg_temp.id('offer_a') || '/brief.pdf');
  begin
    insert into storage.objects (bucket_id, name) values ('offer-sources', pg_temp.id('ws_b') || '/' || pg_temp.id('offer_b') || '/evil.pdf');
    raise exception 'TEST FAILED: upload into another workspace''s folder';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects (bucket_id, name) values ('offer-sources', 'loose.pdf');
    raise exception 'TEST FAILED: upload without a workspace folder';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects (bucket_id, name) values ('exports', pg_temp.id('ws_a') || '/x/1.docx');
    raise exception 'TEST FAILED: user wrote into the exports bucket';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects (bucket_id, name) values ('offer-sources', 'not-a-uuid/x/y.pdf');
    raise exception 'TEST FAILED: non-uuid folder accepted';
  exception when insufficient_privilege or invalid_text_representation then null; end;
end $$;

-- invites: alice accepts the one addressed to her, not the other one
do $$ begin
  begin
    perform public.accept_invite('tok-other');
    raise exception 'TEST FAILED: alice accepted an invite for another address';
  exception when others then
    if sqlerrm not like '%different email%' then raise; end if;
  end;
  assert public.accept_invite('tok-alice') = pg_temp.id('ws_b'), 'accept_invite returns the workspace';
  assert (select role from public.workspace_members where workspace_id = pg_temp.id('ws_b') and user_id = pg_temp.id('user_a')) = 'editor', 'alice is now an editor of B';
  assert (select count(*) from public.offers where id = pg_temp.id('offer_b')) = 1, 'and can read offer B';
end $$;

-- ====================================================================================================
-- as vic (viewer in A)
-- ====================================================================================================
do $$ begin perform pg_temp.login('user_v', 'vic@a.test'); end $$;
do $$ begin
  assert (select count(*) from public.offers where id = pg_temp.id('offer_a')) = 1, 'viewer reads A';
  begin
    insert into public.offers (workspace_id, name) values (pg_temp.id('ws_a'), 'viewer offer');
    raise exception 'TEST FAILED: viewer inserted an offer';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.offer_claims (offer_id, workspace_id, claim_text) values (pg_temp.id('offer_a'), pg_temp.id('ws_a'), 'viewer claim');
    raise exception 'TEST FAILED: viewer inserted a claim';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.drafts (generation_id, workspace_id, version, origin, markdown) values (pg_temp.id('gen_a'), pg_temp.id('ws_a'), 50, 'user', 'viewer draft');
    raise exception 'TEST FAILED: viewer inserted a draft';
  exception when insufficient_privilege then null; end;
  begin
    update public.offers set name = 'viewer rename' where id = pg_temp.id('offer_a');
    assert (select name from public.offers where id = pg_temp.id('offer_a')) <> 'viewer rename', 'viewer update must not apply';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects (bucket_id, name) values ('offer-sources', pg_temp.id('ws_a') || '/' || pg_temp.id('offer_a') || '/viewer.pdf');
    raise exception 'TEST FAILED: viewer uploaded a file';
  exception when insufficient_privilege then null; end;
  begin
    perform public.requeue_generation(pg_temp.id('gen_a'), 'argument');
    raise exception 'TEST FAILED: viewer requeued a generation';
  exception when others then
    if sqlerrm not like '%not allowed%' then raise; end if;
  end;
  perform public.leave_workspace(pg_temp.id('ws_a'));
  assert (select count(*) from public.offers where id = pg_temp.id('offer_a')) = 0, 'after leaving, A is invisible';
end $$;

-- ====================================================================================================
-- as the unconfirmed user: no invite acceptance until confirmation
-- ====================================================================================================
do $$ begin perform pg_temp.login('user_u', 'unconf@u.test'); end $$;
do $$ begin
  begin
    perform public.accept_invite('tok-unconf');
    raise exception 'TEST FAILED: unconfirmed user accepted an invite';
  exception when others then
    if sqlerrm not like '%confirm your email%' then raise; end if;
  end;
end $$;

reset role;
update auth.users set email_confirmed_at = now() where id = pg_temp.id('user_u');
do $$ begin
  assert exists (select 1 from public.workspace_members where user_id = pg_temp.id('user_u') and workspace_id = pg_temp.id('ws_b')),
    'confirmation accepts the pending invite';
  assert (select accepted_at from public.workspace_invites where token = 'tok-unconf') is not null, 'the invite is marked accepted';
end $$;

do $$ begin raise notice 'rls.test.sql: all assertions passed'; end $$;
rollback;
