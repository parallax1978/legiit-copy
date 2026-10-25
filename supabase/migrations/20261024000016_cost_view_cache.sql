-- llm_cost_by_step gains the prompt-cache columns so the admin costs page can show the cache hit rate.
-- Dropped and recreated: create or replace cannot add columns except at the end.
drop view if exists public.llm_cost_by_step;
create view public.llm_cost_by_step with (security_invoker = true) as
select step, model, date_trunc('day', created_at) as day, count(*) as calls, sum(cost_usd) as cost_usd,
       sum(input_tokens) as input_tokens, sum(output_tokens) as output_tokens,
       sum(cache_read_tokens) as cache_read_tokens, sum(cache_write_tokens) as cache_write_tokens,
       avg(latency_ms)::int as avg_latency_ms
from public.llm_calls group by 1,2,3;
grant select on public.llm_cost_by_step to authenticated, service_role;
