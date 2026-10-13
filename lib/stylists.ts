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
};

const COLUMNS = 'id, name, speciality, city, about, hair_types, services, photos, booking_url, sample';

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
  };
}

export async function fetchStylists(): Promise<Stylist[]> {
  const { data, error } = await supabase
    .from('stylists')
    .select(COLUMNS)
    .eq('published', true)
    .order('sort')
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map(toStylist);
}

export async function fetchStylist(id: string): Promise<Stylist | null> {
  const { data, error } = await supabase
    .from('stylists')
    .select(COLUMNS)
    .eq('id', id)
    .eq('published', true)
    .maybeSingle();
  if (error) throw error;
  return data ? toStylist(data) : null;
}
