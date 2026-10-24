-- Storage buckets, realtime publication, pipeline queue (pgmq) + dispatcher (pg_cron + pg_net).

-- ---------- storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('offer-sources', 'offer-sources', false, 26214400,
        array['application/pdf','text/plain','text/markdown','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/html'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit) values ('exports', 'exports', false, 26214400) on conflict (id) do nothing;

-- object paths are "<workspace_id>/<offer_id>/<file>"; the first folder is the workspace
create policy "offer-sources: member read" on storage.objects for select
  using (bucket_id = 'offer-sources' and app.is_workspace_member(((storage.foldername(name))[1])::uuid));
create policy "offer-sources: editor write" on storage.objects for insert
  with check (bucket_id = 'offer-sources' and app.can_edit_workspace(((storage.foldername(name))[1])::uuid));
create policy "offer-sources: editor delete" on storage.objects for delete
  using (bucket_id = 'offer-sources' and app.can_edit_workspace(((storage.foldername(name))[1])::uuid));
create policy "exports: member read" on storage.objects for select
  using (bucket_id = 'exports' and app.is_workspace_member(((storage.foldername(name))[1])::uuid));

-- ---------- realtime ----------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.generations; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.generation_steps; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.draft_flags; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.offer_sources; exception when duplicate_object then null; end;
  end if;
end $$;

-- ---------- queue ----------
do $$ begin
  begin create extension if not exists pgmq; exception when others then raise notice 'pgmq unavailable: %', sqlerrm; end;
  begin create extension if not exists pg_net; exception when others then raise notice 'pg_net unavailable: %', sqlerrm; end;
  begin create extension if not exists pg_cron; exception when others then raise notice 'pg_cron unavailable: %', sqlerrm; end;
end $$;

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'pgmq') then
    perform pgmq.create('pipeline');
  end if;
end $$;

-- enqueue a step for a generation
create or replace function app.enqueue_step(p_generation_id uuid, p_step text, p_delay_seconds int default 0) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from pg_namespace where nspname = 'pgmq') then
    perform pgmq.send('pipeline', jsonb_build_object('generation_id', p_generation_id, 'step', p_step, 'enqueued_at', now()), p_delay_seconds);
  else
    raise notice 'pgmq missing; step % for % not enqueued', p_step, p_generation_id;
  end if;
end $$;
revoke all on function app.enqueue_step(uuid, text, int) from public, anon, authenticated;

-- a new generation enqueues its first step
create or replace function app.on_generation_queued() returns trigger
language plpgsql security definer set search_path = public as $$
declare first_step text;
begin
  if (tg_op = 'INSERT' and new.status = 'queued') or (tg_op = 'UPDATE' and new.status = 'queued' and old.status is distinct from 'queued') then
    first_step := coalesce(new.step_order->>0, 'research');
    perform app.enqueue_step(new.id, first_step);
  end if;
  return new;
end $$;
drop trigger if exists generations_enqueue on public.generations;
create trigger generations_enqueue after insert or update of status on public.generations
for each row execute function app.on_generation_queued();

-- dispatcher: read a batch, POST each message to the run-step function. Visibility timeout 450s > function wall clock.
create or replace function app.dispatch_pipeline(batch_size int default 5) returns int
language plpgsql security definer set search_path = public as $$
declare
  fn_url text;
  secret text;
  msg record;
  n int := 0;
begin
  if not exists (select 1 from pg_namespace where nspname = 'pgmq') or not exists (select 1 from pg_namespace where nspname = 'net') then
    return 0;
  end if;
  select value into fn_url from app.settings where key = 'functions_url';
  if fn_url is null then return 0; end if;
  begin
    select decrypted_secret into secret from vault.decrypted_secrets where name = 'pipeline_shared_secret' limit 1;
  exception when others then secret := null; end;
  if secret is null then
    select value into secret from app.settings where key = 'pipeline_shared_secret';
  end if;

  for msg in select * from pgmq.read('pipeline', 450, batch_size) loop
    perform net.http_post(
      url := fn_url || '/run-step',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-pipeline-secret', coalesce(secret, ''), 'x-msg-id', msg.msg_id::text),
      body := jsonb_build_object('msg_id', msg.msg_id, 'read_ct', msg.read_ct, 'message', msg.message),
      timeout_milliseconds := 10000
    );
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function app.dispatch_pipeline(int) from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    begin perform cron.unschedule('pipeline-dispatch'); exception when others then null; end;
    perform cron.schedule('pipeline-dispatch', '5 seconds', $cron$ select app.dispatch_pipeline(5) $cron$);
  end if;
end $$;

-- housekeeping: generations stuck in running for > 30 min with no step activity are marked failed
create or replace function app.sweep_stuck_generations() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with stuck as (
    update public.generations g set status = 'failed', error = coalesce(error, 'timed out: no step activity for 30 minutes')
    where g.status = 'running' and g.updated_at < now() - interval '30 minutes'
    returning 1)
  select count(*) into n from stuck;
  return n;
end $$;
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    begin perform cron.unschedule('sweep-stuck-generations'); exception when others then null; end;
    perform cron.schedule('sweep-stuck-generations', '*/10 * * * *', $cron$ select app.sweep_stuck_generations() $cron$);
  end if;
end $$;
