-- The offer page watches extraction status live.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.offers; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.offer_research; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.offer_variants; exception when duplicate_object then null; end;
  end if;
end $$;
