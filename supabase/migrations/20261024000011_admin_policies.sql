-- Admins manage the admin list; admins may requeue any generation.
create policy "admins: admin manage" on public.app_admins for all using (app.is_admin()) with check (app.is_admin());

create or replace function public.requeue_generation(p_generation_id uuid, p_from_step text) returns void
language plpgsql security definer set search_path = public as $$
declare g public.generations;
begin
  select * into g from public.generations where id = p_generation_id;
  if g.id is null then raise exception 'generation not found'; end if;
  if not (app.can_edit_workspace(g.workspace_id) or app.is_admin()) then raise exception 'not allowed'; end if;
  if g.status not in ('needs_input','failed','completed','cancelled') then raise exception 'generation is still running'; end if;
  update public.generations set status = 'queued', current_step = p_from_step, progress_message = null, error = null, completed_at = null where id = p_generation_id;
  perform app.enqueue_step(p_generation_id, p_from_step);
  insert into public.audit_log (actor_id, workspace_id, action, target_type, target_id, meta)
  values (auth.uid(), g.workspace_id, 'requeue', 'generation', g.id::text, jsonb_build_object('from_step', p_from_step));
end $$;
