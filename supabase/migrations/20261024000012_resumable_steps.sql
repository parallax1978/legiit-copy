-- A step that spans several invocations saves partial state and is marked 'continued' between them.
alter table public.generation_steps drop constraint if exists generation_steps_status_check;
alter table public.generation_steps add constraint generation_steps_status_check
  check (status in ('pending','running','completed','failed','interrupted','skipped','continued'));
