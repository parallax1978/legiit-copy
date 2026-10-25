-- Policy helper functions must be executable by anon too, so an unauthenticated query returns no rows instead of a permission error
-- (Realtime channels and logged-out clients hit RLS evaluation with the anon role). The functions only read auth.uid().
grant execute on function app.is_workspace_member(uuid), app.workspace_role(uuid), app.can_edit_workspace(uuid), app.is_admin(), app.shares_workspace_with(uuid) to anon;
