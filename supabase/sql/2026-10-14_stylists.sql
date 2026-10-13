-- Stylists live in the database, so new ones appear in the app the moment
-- they're added: no app update, no App Store review.
-- Safe to run twice. Run in Supabase -> SQL Editor.
--
-- To add a real stylist: Table Editor -> stylists -> Insert row.
--   Fill name, speciality, city, about, hair_types (e.g. {"Type 3","Type 4"}),
--   services, photos (public links from the stylist-photos bucket) and
--   booking_url (their booking page or Instagram). Leave sample = false.
-- To hide someone without deleting them: set published = false.
-- When real stylists are in, hide the samples:
--   update public.stylists set published = false where sample;

create table if not exists public.stylists (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  speciality  text not null default '',
  city        text not null default '',
  about       text not null default '',
  hair_types  text[] not null default '{}',
  services    text[] not null default '{}',
  photos      text[] not null default '{}',
  booking_url text,
  sample      boolean not null default false,
  published   boolean not null default true,
  sort        int not null default 100,
  created_at  timestamptz not null default now()
);

alter table public.stylists enable row level security;

-- Anyone can see published stylists. Only we add or change them (dashboard).
drop policy if exists "published stylists are public" on public.stylists;
create policy "published stylists are public" on public.stylists
  for select using (published);

-- Public photo bucket for stylists' work. Upload in Storage -> stylist-photos,
-- then copy each file's public URL into the stylist's photos.
insert into storage.buckets (id, name, public)
values ('stylist-photos', 'stylist-photos', true)
on conflict (id) do nothing;

-- The four sample profiles the app showed before (Unsplash photos).
insert into public.stylists (id, name, speciality, city, about, hair_types, services, photos, sample, sort)
values
  ('sample-amara', 'Amara O.', 'Coils, silk press and scalp care', 'Brixton, London', 'Natural hair specialist. Silk presses that keep your curl pattern intact, and wash days built around moisture, not tension.', array['Type 4'], array['Silk press', 'Natural hair care', 'Treatments'],
   array['https://images.unsplash.com/photo-1632765854612-9b02b6ec2b15?fm=jpg&q=80&w=1200&auto=format&fit=crop', 'https://images.unsplash.com/photo-1783445744072-b2bc87d633ec?fm=jpg&q=80&w=1200&auto=format&fit=crop', 'https://images.unsplash.com/photo-1583994009906-c00c0bd8acb2?fm=jpg&q=80&w=1200&auto=format&fit=crop'], true, 10),
  ('sample-nia', 'Nia M.', 'Braids and protective styles', 'Peckham, London', 'Knotless, cornrows and long-wear protective styles, done light on the edges so your hair comes out healthier than it went in.', array['Type 3', 'Type 4'], array['Braids and protective styles', 'Cornrows'],
   array['https://images.unsplash.com/photo-1673470907547-1c0c6a996095?fm=jpg&q=80&w=1200&auto=format&fit=crop', 'https://images.unsplash.com/photo-1612459284970-e8f027596582?fm=jpg&q=80&w=1200&auto=format&fit=crop', 'https://images.unsplash.com/photo-1778953501987-ece284f0b34a?fm=jpg&q=80&w=1200&auto=format&fit=crop'], true, 20),
  ('sample-jade', 'Jade K.', 'Curl cuts and definition', 'Hackney, London', 'Dry cutting curl by curl, so the shape works on wash-and-go days, not just on the day you leave the chair.', array['Type 2', 'Type 3'], array['Cuts', 'Curl definition'],
   array['https://images.unsplash.com/photo-1739825353871-2b9c6716142a?fm=jpg&q=80&w=1200&auto=format&fit=crop', 'https://images.unsplash.com/photo-1664293272875-2cfa64e687c7?fm=jpg&q=80&w=1200&auto=format&fit=crop'], true, 30),
  ('sample-priya', 'Priya S.', 'Colour and sleek styling', 'Soho, London', 'Low-damage colour and glossy finishes. Every colour appointment starts with a strand test and a bond treatment.', array['Type 1', 'Type 2'], array['Colour', 'Treatments'],
   array['https://images.unsplash.com/photo-1674484145277-b42f70fbbfec?fm=jpg&q=80&w=1200&auto=format&fit=crop'], true, 40)
on conflict (id) do nothing;
