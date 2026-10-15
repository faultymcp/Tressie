-- Stylist profiles: "Halea verified" badge and a price list.
-- Booking at launch: the Book button opens the stylist's own booking link
-- (stylists.booking_url: Fresha, Booksy, website or Instagram).
-- Safe to run twice. Run in Supabase -> SQL Editor.
-- How to add a stylist from the Google Form: docs/STYLIST_ONBOARDING.md

-- Shown as "Halea verified" once we've checked them.
alter table public.stylists add column if not exists verified boolean not null default false;

-- Services with price and length, shown on the stylist's page.
create table if not exists public.stylist_services (
  id           uuid primary key default gen_random_uuid(),
  stylist_id   text not null references public.stylists(id) on delete cascade,
  name         text not null,
  price_pence  int not null check (price_pence >= 0),
  duration_min int not null check (duration_min between 15 and 720),
  price_from   boolean not null default false,  -- true = "from £60" (price depends on length, size...)
  sort         int not null default 100
);
alter table public.stylist_services enable row level security;
drop policy if exists "services of published stylists are public" on public.stylist_services;
create policy "services of published stylists are public" on public.stylist_services
  for select using (exists (select 1 from public.stylists s where s.id = stylist_id and s.published));
