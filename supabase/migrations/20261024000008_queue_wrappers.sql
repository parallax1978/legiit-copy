-- Service-role wrappers so Edge Functions can drive the queue through PostgREST (schema app is not exposed).
create or replace function public.enqueue_step(p_generation_id uuid, p_step text, p_delay_seconds int default 0) returns void
language sql security definer set search_path = public as $$ select app.enqueue_step(p_generation_id, p_step, p_delay_seconds) $$;
revoke all on function public.enqueue_step(uuid, text, int) from public, anon, authenticated;
grant execute on function public.enqueue_step(uuid, text, int) to service_role;

create or replace function public.queue_ack(p_msg_id bigint) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from pg_namespace where nspname = 'pgmq') then return pgmq.delete('pipeline', p_msg_id); end if;
  return false;
end $$;
create or replace function public.queue_archive(p_msg_id bigint) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from pg_namespace where nspname = 'pgmq') then return pgmq.archive('pipeline', p_msg_id); end if;
  return false;
end $$;
revoke all on function public.queue_ack(bigint), public.queue_archive(bigint) from public, anon, authenticated;
grant execute on function public.queue_ack(bigint), public.queue_archive(bigint) to service_role;

-- app settings reachable by the service role (functions_url, eval_workspace_id)
create or replace function public.get_setting(p_key text) returns text
language sql security definer set search_path = public as $$ select value from app.settings where key = p_key $$;
create or replace function public.set_setting(p_key text, p_value text) returns void
language sql security definer set search_path = public as $$
  insert into app.settings (key, value) values (p_key, p_value) on conflict (key) do update set value = excluded.value, updated_at = now()
$$;
revoke all on function public.get_setting(text), public.set_setting(text, text) from public, anon, authenticated;
grant execute on function public.get_setting(text), public.set_setting(text, text) to service_role;
-- admins may read/write settings from the admin UI
create or replace function public.admin_get_setting(p_key text) returns text
language plpgsql security definer set search_path = public as $$
begin if not app.is_admin() then raise exception 'admin only'; end if; return (select value from app.settings where key = p_key); end $$;
create or replace function public.admin_set_setting(p_key text, p_value text) returns void
language plpgsql security definer set search_path = public as $$
begin if not app.is_admin() then raise exception 'admin only'; end if;
  insert into app.settings (key, value) values (p_key, p_value) on conflict (key) do update set value = excluded.value, updated_at = now(); end $$;
grant execute on function public.admin_get_setting(text), public.admin_set_setting(text, text) to authenticated;
