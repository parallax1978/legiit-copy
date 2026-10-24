-- Public RPC wrappers the web app calls (RLS-safe, security definer).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$ select app.is_admin() $$;
grant execute on function public.is_admin() to authenticated;

create or replace function public.workspace_role(ws uuid) returns text
language sql stable security definer set search_path = public as $$ select app.workspace_role(ws) $$;
grant execute on function public.workspace_role(uuid) to authenticated;

-- Re-queue a generation from a given step (used after offer approval, "try another angle", retry after failure).
create or replace function public.requeue_generation(p_generation_id uuid, p_from_step text) returns void
language plpgsql security definer set search_path = public as $$
declare g public.generations;
begin
  select * into g from public.generations where id = p_generation_id;
  if g.id is null then raise exception 'generation not found'; end if;
  if not app.can_edit_workspace(g.workspace_id) then raise exception 'not allowed'; end if;
  if g.status not in ('needs_input','failed','completed','cancelled') then raise exception 'generation is still running'; end if;
  update public.generations set status = 'queued', current_step = p_from_step, progress_message = null, error = null, completed_at = null where id = p_generation_id;
  -- the trigger enqueues step_order[0]; override with the requested step
  perform app.enqueue_step(p_generation_id, p_from_step);
end $$;
grant execute on function public.requeue_generation(uuid, text) to authenticated;

-- The generations_enqueue trigger must not double-enqueue when requeue_generation already did.
create or replace function app.on_generation_queued() returns trigger
language plpgsql security definer set search_path = public as $$
declare first_step text;
begin
  if tg_op = 'INSERT' and new.status = 'queued' then
    first_step := coalesce(new.step_order->>0, 'research');
    perform app.enqueue_step(new.id, first_step);
  end if;
  return new;
end $$;

-- Record a usage event exactly once per completed step (service role).
create or replace function public.record_usage(p_workspace_id uuid, p_generation_id uuid, p_step text, p_attempt int, p_kind text, p_tokens int, p_cost numeric) returns void
language sql security definer set search_path = public as $$
  insert into public.usage_events (workspace_id, generation_id, step, attempt, kind, tokens, cost_usd)
  values (p_workspace_id, p_generation_id, p_step, p_attempt, p_kind, p_tokens, p_cost)
  on conflict do nothing
$$;
revoke all on function public.record_usage(uuid, uuid, text, int, text, int, numeric) from public, anon, authenticated;
grant execute on function public.record_usage(uuid, uuid, text, int, text, int, numeric) to service_role;

-- Admin dashboard rollups
create or replace view public.llm_cost_by_step with (security_invoker = true) as
select step, model, date_trunc('day', created_at) as day, count(*) as calls, sum(cost_usd) as cost_usd,
       sum(input_tokens) as input_tokens, sum(output_tokens) as output_tokens, avg(latency_ms)::int as avg_latency_ms
from public.llm_calls group by 1,2,3;
