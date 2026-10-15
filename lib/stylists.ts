// lib/stylists.ts
// Stylists come from the `stylists` table (supabase/sql/2026-10-14_stylists.sql),
// so new ones show up without an app update. Only published rows are visible.

import { supabase } from '@/lib/supabase';

export type Stylist = {
  id: string;
  name: string;
  speciality: string;
  city: string;
  about: string;
  hairTypes: string[];
  services: string[];
  photos: string[];
  bookingUrl: string | null;
  sample: boolean;
  verified: boolean;
};

export type StylistService = {
  id: string;
  name: string;
  pricePence: number;
  priceFrom: boolean;
  durationMin: number;
};

const COLUMNS = 'id, name, speciality, city, about, hair_types, services, photos, booking_url, sample, verified';

function toStylist(r: any): Stylist {
  return {
    id: r.id,
    name: r.name,
    speciality: r.speciality ?? '',
    city: r.city ?? '',
    about: r.about ?? '',
    hairTypes: r.hair_types ?? [],
    services: r.services ?? [],
    photos: r.photos ?? [],
    bookingUrl: r.booking_url ?? null,
    sample: !!r.sample,
    verified: !!r.verified,
  };
}

// Before supabase/sql/2026-10-15_stylist_services.sql is run, `verified`
// doesn't exist yet. Fall back to the old columns so Discover never breaks.
const OLD_COLUMNS = COLUMNS.replace(', verified', '');
const missingColumn = (e: any) => e?.code === '42703' || /verified/.test(e?.message ?? '');

export async function fetchStylists(): Promise<Stylist[]> {
  const query = (cols: string) => supabase
    .from('stylists')
    .select(cols)
    .eq('published', true)
    .order('sort')
    .order('created_at');
  let { data, error } = await query(COLUMNS);
  if (error && missingColumn(error)) ({ data, error } = await query(OLD_COLUMNS));
  if (error) throw error;
  return (data ?? []).map(toStylist);
}

export async function fetchStylist(id: string): Promise<Stylist | null> {
  const query = (cols: string) => supabase
    .from('stylists')
    .select(cols)
    .eq('id', id)
    .eq('published', true)
    .maybeSingle();
  let { data, error } = await query(COLUMNS);
  if (error && missingColumn(error)) ({ data, error } = await query(OLD_COLUMNS));
  if (error) throw error;
  return data ? toStylist(data) : null;
}

// Services with price and length, shown on the stylist's page.
// Empty before the SQL is run, or for stylists without a price list yet.
export async function fetchStylistServices(id: string): Promise<StylistService[]> {
  const { data } = await supabase
    .from('stylist_services')
    .select('id, name, price_pence, price_from, duration_min')
    .eq('stylist_id', id)
    .order('sort');
  return (data ?? []).map((r: any) => ({
    id: r.id, name: r.name, pricePence: r.price_pence, priceFrom: !!r.price_from, durationMin: r.duration_min,
  }));
}
