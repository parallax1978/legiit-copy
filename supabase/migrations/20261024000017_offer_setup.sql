-- What only the client knows, asked once at offer setup and never again: who signs the copy, who the reader is,
-- which offer to lead with, the refund terms if any, and the proof on hand. Read by intake as the user's own word.
alter table public.offers add column if not exists setup jsonb not null default '{}'::jsonb;
