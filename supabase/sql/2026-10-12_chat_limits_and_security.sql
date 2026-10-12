-- 12 Oct 2026. Run once in Supabase > SQL Editor. Safe to run again.

-- 1. Daily chat limit: one row per chat message, written only by the
--    mistral-proxy function (server). Users can't read or change it.
create table if not exists public.chat_usage (
  id bigserial primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_usage_user_day_idx on public.chat_usage (user_id, created_at);
alter table public.chat_usage enable row level security;

-- 2. Security fixes (already run by hand on 12 Oct, kept here so they live in git)
alter table public.saved_looks enable row level security;
alter table public.saved_salons enable row level security;
alter table public.user_profiles enable row level security;
alter table public.profiles enable row level security;
alter table public.subscription_entitlements enable row level security;
alter table public.tryon_credit_packs enable row level security;
drop policy if exists "owners can create their salon" on public.salons;
drop policy if exists "owners can update their salon" on public.salons;
drop policy if exists "Users create own bookings" on public.bookings;

-- 3. Try-on log: lock it to the server too (users can still read their own history)
alter table public.tryon_history enable row level security;
