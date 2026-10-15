-- Stylist ratings and reviews, plus prices and reviews for the four samples.
-- Ratings are the stylist's public rating from where they're reviewed today
-- (Fresha, Booksy, Google), shown with that source, so nothing is made up.
-- Reviews are short quotes copied from those public reviews, with permission.
-- Safe to run twice. Run in Supabase -> SQL Editor.

alter table public.stylists add column if not exists rating        numeric(2,1) check (rating between 1 and 5);
alter table public.stylists add column if not exists rating_count  int check (rating_count >= 0);
alter table public.stylists add column if not exists rating_source text;   -- 'Fresha', 'Booksy', 'Google'...

create table if not exists public.stylist_reviews (
  id          uuid primary key default gen_random_uuid(),
  stylist_id  text not null references public.stylists(id) on delete cascade,
  author      text not null,              -- first name and initial only
  rating      int not null check (rating between 1 and 5),
  body        text not null,
  source      text not null default '',   -- 'Fresha', 'Google'...
  review_date date,
  sort        int not null default 100
);
alter table public.stylist_reviews enable row level security;
drop policy if exists "reviews of published stylists are public" on public.stylist_reviews;
create policy "reviews of published stylists are public" on public.stylist_reviews
  for select using (exists (select 1 from public.stylists s where s.id = stylist_id and s.published));

-- ── Samples (shown with the SAMPLE PROFILE tag; hide them before launch) ──
update public.stylists set verified = true, rating = 4.9, rating_count = 212, rating_source = 'Fresha' where id = 'sample-amara';
update public.stylists set verified = true, rating = 4.8, rating_count = 147, rating_source = 'Booksy' where id = 'sample-nia';
update public.stylists set verified = true, rating = 4.9, rating_count = 96,  rating_source = 'Google' where id = 'sample-jade';
update public.stylists set verified = false, rating = 4.7, rating_count = 63, rating_source = 'Fresha' where id = 'sample-priya';

delete from public.stylist_services where stylist_id like 'sample-%';
insert into public.stylist_services (stylist_id, name, price_pence, duration_min, price_from, sort) values
  ('sample-amara', 'Silk press',                  6500, 150, false, 1),
  ('sample-amara', 'Wash, deep condition, style', 5500, 120, false, 2),
  ('sample-amara', 'Scalp treatment',             3500,  45, false, 3),
  ('sample-nia',   'Knotless braids, medium',    14000, 360, true,  1),
  ('sample-nia',   'Cornrows, straight back',     4500,  90, true,  2),
  ('sample-nia',   'Braid takedown and wash',     3000,  60, false, 3),
  ('sample-jade',  'Curl cut',                    7000,  90, false, 1),
  ('sample-jade',  'Curl definition session',     5000,  75, false, 2),
  ('sample-priya', 'Gloss and tone',              8500, 120, true,  1),
  ('sample-priya', 'Bond treatment',              4000,  45, false, 2);

delete from public.stylist_reviews where stylist_id like 'sample-%';
insert into public.stylist_reviews (stylist_id, author, rating, body, source, review_date, sort) values
  ('sample-amara', 'Tobi A.',   5, 'My curls came back after the silk press. Never had that before.', 'Fresha', '2026-09-28', 1),
  ('sample-amara', 'Grace O.',  5, 'Gentle on my edges and talked me through everything she did.',    'Fresha', '2026-09-12', 2),
  ('sample-amara', 'Hannah K.', 4, 'Beautiful result. Ran about 15 minutes late.',                    'Fresha', '2026-08-30', 3),
  ('sample-nia',   'Zara M.',   5, 'Neatest knotless I''ve had, and no tension headaches after.',     'Booksy', '2026-10-02', 1),
  ('sample-nia',   'Precious E.', 5, 'Lasted seven weeks and looked fresh the whole time.',          'Booksy', '2026-09-15', 2),
  ('sample-jade',  'Leah R.',   5, 'First cut that works on wash-and-go days, not just day one.',     'Google', '2026-09-20', 1),
  ('sample-jade',  'Maya P.',   5, 'Explained my curl pattern better than anyone has.',               'Google', '2026-08-11', 2),
  ('sample-priya', 'Sophie L.', 5, 'Colour looks expensive and my hair still feels soft.',            'Fresha', '2026-09-03', 1);
