# Adding a stylist to Halea

From Google Form to a live profile. No app update needed.
At launch, the **Book** button opens the stylist's own booking link (Fresha, Booksy, website or Instagram). Clients book with the stylist there.

## 1. What the Google Form must ask

| Question | Used for |
|---|---|
| Full name, business name (if any) | Profile name |
| Area of London (e.g. Brixton) | Profile city |
| What you specialise in (one line) | Profile speciality |
| About you (2 to 3 sentences) | Profile about |
| Hair types you work with (Type 1, 2, 3, 4) | Discover matching |
| Each service: name, price, how long it takes, "from" price or fixed | Price list on their page |
| **Booking link** (Fresha, Booksy, website, or Instagram if they book by DM) | The Book button |
| Instagram handle | Checking their work |
| 6 to 12 photos of their own work | Profile photos |
| Tick: "These photos are my own work and Halea can show them" | Permission |

## 2. Check them (before "Halea verified")

- The photos match their Instagram and are their own work.
- A short call or video call.
- Photo ID matches the name.
Only then set `verified = true`.

## 3. Put them in Supabase (SQL Editor)

Upload their photos to Storage -> `stylist-photos` first and copy each public URL.
Then edit the values below and run it. `id` is a short name with no spaces, e.g. `amara-brixton`.

```sql
-- Profile
insert into public.stylists (id, name, speciality, city, about, hair_types, services, photos, booking_url, verified)
values (
  'amara-brixton',
  'Amara O.',
  'Knotless braids and silk press',
  'Brixton, London',
  'Two or three sentences from their form.',
  array['Type 3', 'Type 4'],
  array['Knotless braids', 'Silk press'],
  array['https://...photo1.jpg', 'https://...photo2.jpg'],
  'https://www.fresha.com/...',   -- their booking link
  true                             -- Halea verified (after the checks above)
);

-- Price list: price in pence (£60 = 6000), length in minutes, price_from = true for "from £60"
insert into public.stylist_services (stylist_id, name, price_pence, duration_min, price_from, sort) values
  ('amara-brixton', 'Knotless braids, medium', 12000, 300, true, 1),
  ('amara-brixton', 'Silk press',               6000,  120, false, 2);
```

## 4. Useful changes later

```sql
-- Hide a stylist (keeps everything)
update public.stylists set published = false where id = 'amara-brixton';

-- Change their booking link
update public.stylists set booking_url = 'https://booksy.com/...' where id = 'amara-brixton';

-- Change a price
update public.stylist_services set price_pence = 6500 where stylist_id = 'amara-brixton' and name = 'Silk press';

-- Hide the four sample stylists once real ones are in
update public.stylists set published = false where sample;
```

## Counting bookings interest

Every tap on Book is counted in PostHog as `book_tapped`, with the stylist's id. That's the number to show stylists ("Halea sent 40 people to your booking page this month") and investors.
