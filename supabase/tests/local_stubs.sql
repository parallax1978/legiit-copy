-- Local validation stubs for Supabase-only schemas. NOT a migration.
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
alter table storage.objects enable row level security;
create schema if not exists pgmq;
create table if not exists pgmq.q_pipeline (msg_id bigserial primary key, read_ct int default 0, enqueued_at timestamptz default now(), vt timestamptz default now(), message jsonb);
create or replace function pgmq.create(queue_name text) returns void language plpgsql as $$ begin null; end $$;
create or replace function pgmq.send(queue_name text, msg jsonb, delay int default 0) returns bigint language plpgsql as $$ declare id bigint; begin insert into pgmq.q_pipeline(message, vt) values (msg, now() + (delay || ' seconds')::interval) returning msg_id into id; return id; end $$;
create or replace function pgmq.read(queue_name text, vt int, qty int) returns table(msg_id bigint, read_ct int, enqueued_at timestamptz, vt timestamptz, message jsonb) language sql as $$ update pgmq.q_pipeline q set read_ct = q.read_ct + 1, vt = now() + (read.vt || ' seconds')::interval where q.msg_id in (select msg_id from pgmq.q_pipeline where pgmq.q_pipeline.vt <= now() order by msg_id limit qty) returning q.msg_id, q.read_ct, q.enqueued_at, q.vt, q.message $$;
create or replace function pgmq.delete(queue_name text, msg_id bigint) returns boolean language sql as $$ delete from pgmq.q_pipeline where pgmq.q_pipeline.msg_id = delete.msg_id returning true $$;
create or replace function pgmq.archive(queue_name text, msg_id bigint) returns boolean language sql as $$ delete from pgmq.q_pipeline where pgmq.q_pipeline.msg_id = archive.msg_id returning true $$;
create schema if not exists net;
create or replace function net.http_post(url text, headers jsonb default '{}'::jsonb, body jsonb default '{}'::jsonb, timeout_milliseconds int default 5000) returns bigint language sql as $$ select 1::bigint $$;
create schema if not exists vault;
create table if not exists vault.decrypted_secrets (name text, decrypted_secret text);
-- API-role privileges as Supabase grants them (schema usage + default privileges on public), so RLS tests run as
-- `authenticated` the way PostgREST does and the migrations' explicit REVOKEs are exercised.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
