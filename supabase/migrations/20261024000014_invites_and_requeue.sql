-- Invites are visible to owners and to the invitee only; requeue only accepts real step names.
drop policy if exists "invites: member read" on public.workspace_invites;
create policy "invites: owner or invitee read" on public.workspace_invites for select
  using (app.workspace_role(workspace_id) = 'owner' or lower(email) = lower(coalesce((auth.jwt()->>'email'),'')));

create or replace function public.requeue_generation(p_generation_id uuid, p_from_step text) returns void
language plpgsql security definer set search_path = public as $$
declare g public.generations;
begin
  if p_from_step not in ('intake','research','offer','argument','draft','cold_read','editorial','mechanical','factual','revise','ship') then
    raise exception 'unknown step %', p_from_step;
  end if;
  select * into g from public.generations where id = p_generation_id;
  if g.id is null then raise exception 'generation not found'; end if;
  if not (app.can_edit_workspace(g.workspace_id) or app.is_admin()) then raise exception 'not allowed'; end if;
  if g.status not in ('needs_input','failed','completed','cancelled') then raise exception 'generation is still running'; end if;
  update public.generations set status = 'queued', current_step = p_from_step, progress_message = null, error = null, completed_at = null where id = p_generation_id;
  perform app.enqueue_step(p_generation_id, p_from_step);
  insert into public.audit_log (actor_id, workspace_id, action, target_type, target_id, meta)
  values (auth.uid(), g.workspace_id, 'requeue', 'generation', g.id::text, jsonb_build_object('from_step', p_from_step));
end $$;
