-- Members of the same workspace may see each other's name and email (the Members page needs it).
create or replace function app.shares_workspace_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members a
    join public.workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = auth.uid() and b.user_id = other
  )
$$;
revoke all on function app.shares_workspace_with(uuid) from public;
grant execute on function app.shares_workspace_with(uuid) to authenticated, service_role;

drop policy if exists "profiles: self read" on public.profiles;
create policy "profiles: self or co-member read" on public.profiles for select
  using (id = auth.uid() or app.is_admin() or app.shares_workspace_with(id));

-- a non-owner may leave a workspace
create or replace function public.leave_workspace(ws uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if app.workspace_role(ws) = 'owner' and (select count(*) from public.workspace_members where workspace_id = ws and role = 'owner') = 1 then
    raise exception 'the last owner cannot leave; transfer ownership first';
  end if;
  delete from public.workspace_members where workspace_id = ws and user_id = auth.uid();
end $$;
grant execute on function public.leave_workspace(uuid) to authenticated;
