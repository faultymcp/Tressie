-- Free try-on limits: run once in Supabase > SQL Editor > New query > Run.
-- Safe to run more than once.

-- Make sure the try-on log has what the limits need
alter table public.tryon_history add column if not exists device_id text;
alter table public.tryon_history add column if not exists created_at timestamptz not null default now();

-- Fast counting for "how many today" checks
create index if not exists tryon_history_created_at_idx on public.tryon_history (created_at);
create index if not exists tryon_history_device_day_idx on public.tryon_history (device_id, created_at);
create index if not exists tryon_history_user_day_idx   on public.tryon_history (user_id, created_at);

-- Handy check while testing: today's try-ons per phone
-- select device_id, count(*) from public.tryon_history
-- where created_at >= date_trunc('day', now() at time zone 'utc')
-- group by device_id order by 2 desc;

-- Account deletion keeps a phone's daily try-on count but removes the person from it
alter table public.tryon_history alter column user_id drop not null;
