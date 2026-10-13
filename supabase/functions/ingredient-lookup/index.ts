// supabase/functions/ingredient-lookup
// Explains a hair product's ingredients in plain English.
//
// Send ONE of:
//   { barcode: "3600523614462", porosity?: "low" | "normal" | "high" }
//   { ingredients_text: "Aqua, Cetearyl Alcohol, ...", porosity?: ... }
//
// Where the facts come from:
//   - Product name and ingredient list: Open Beauty Facts (open data, ODbL).
//     Fetched live and never copied into our tables, so we only owe attribution.
//   - What each ingredient does: Halea's own notes (table `ingredients`), and
//     the EU CosIng function list (table `cosing_ingredients`) for the rest.
//   - Product notes: fixed rules in parse.ts. No AI, nothing invented.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  splitIngredients, candidates, buildIndex, findHalea, fitFor, productNotes,
  keyOf, type HaleaIngredient, type Porosity,
} from './parse.ts';

// Open Beauty Facts asks every app to identify itself as AppName/Version (ContactEmail).
// The email is a Supabase secret so it never sits in the code:
//   npx supabase secrets set OBF_CONTACT=you@example.com
const USER_AGENT = `Halea/1.0 (${Deno.env.get('OBF_CONTACT') ?? 'no-contact-set'})`;
const ATTRIBUTION = 'Product data from Open Beauty Facts (openbeautyfacts.org), available under the Open Database Licence.';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

type Product = { name: string | null; brand: string | null; image: string | null };

async function fromOpenBeautyFacts(barcode: string): Promise<{ product: Product; text: string } | null> {
  const fields = 'product_name,brands,ingredients_text,ingredients_text_en,image_front_small_url';
  const res = await fetch(
    `https://world.openbeautyfacts.org/api/v3/product/${barcode}.json?fields=${fields}`,
    { headers: { 'User-Agent': USER_AGENT } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Beauty Facts ${res.status}`);
  const data = await res.json();
  const p = data?.product;
  if (!p) return null;
  return {
    product: {
      name: p.product_name || null,
      brand: p.brands ? String(p.brands).split(',')[0].trim() : null,
      image: p.image_front_small_url || null,
    },
    text: p.ingredients_text_en || p.ingredients_text || '',
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  let body: { barcode?: string; ingredients_text?: string; porosity?: string };
  try { body = await req.json(); } catch { return json({ error: 'Send JSON.' }, 400); }

  const porosity = (['low', 'normal', 'high'] as const).find((p) => p === body.porosity) as Porosity | undefined;

  let product: Product | null = null;
  let text = '';
  let source: 'open_beauty_facts' | 'text';

  if (body.barcode) {
    const barcode = String(body.barcode).trim();
    if (!/^\d{8,14}$/.test(barcode)) return json({ error: "That barcode doesn't look right." }, 400);
    let found;
    try { found = await fromOpenBeautyFacts(barcode); }
    catch { return json({ error: "We couldn't reach the product database. Try again in a moment." }, 502); }
    if (!found) return json({ error: "We don't know this product yet. You can type in its ingredient list instead.", not_found: true }, 404);
    product = found.product;
    text = found.text;
    source = 'open_beauty_facts';
    if (!text.trim()) {
      return json({ product, source, attribution: ATTRIBUTION, ingredients: [], notes: [], missing_ingredients: true,
        error: "We found the product but not its ingredient list yet. You can type it in instead." });
    }
  } else if (typeof body.ingredients_text === 'string' && body.ingredients_text.trim()) {
    text = body.ingredients_text.slice(0, 4000);
    source = 'text';
  } else {
    return json({ error: 'Send a barcode or an ingredient list.' }, 400);
  }

  const labels = splitIngredients(text).slice(0, 80);
  if (!labels.length) return json({ error: "We couldn't read that ingredient list." }, 400);

  // Halea notes: small table, load it whole.
  const { data: rows, error } = await admin.from('ingredients')
    .select('inci_name, also_called, type, what_it_does, good_for, watch_out, low_porosity, high_porosity');
  if (error) return json({ error: 'Something went wrong on our side.' }, 500);
  const index = buildIndex((rows ?? []) as HaleaIngredient[]);
  const halea = labels.map((l) => findHalea(l, index));

  // CosIng: look up only what Halea has no note for.
  const unmatched = labels.filter((_, i) => !halea[i]);
  const wanted = [...new Set(unmatched.flatMap((l) => candidates(l).map((c) => c.toUpperCase())))];
  const cosing = new Map<string, { inci_name: string; functions: string | null; restriction: string | null }>();
  if (wanted.length) {
    const { data } = await admin.from('cosing_ingredients')
      .select('inci_name, functions, restriction').in('inci_name', wanted.slice(0, 300));
    for (const c of data ?? []) cosing.set(c.inci_name, c);
  }

  const ingredients = labels.map((label, i) => {
    const h = halea[i];
    if (h) {
      return {
        position: i + 1, label, inci_name: h.inci_name, source: 'halea',
        type: h.type, what_it_does: h.what_it_does, good_for: h.good_for || null,
        watch_out: h.watch_out || null, fit: fitFor(h, porosity), cosing_functions: null,
      };
    }
    const c = candidates(label).map((k) => cosing.get(k.toUpperCase())).find(Boolean);
    return {
      position: i + 1, label, inci_name: c?.inci_name ?? null, source: c ? 'cosing' : 'unknown',
      type: null, what_it_does: null, good_for: null, watch_out: null, fit: null,
      cosing_functions: c?.functions ?? null,
    };
  });

  // Remember what we have no Halea note for, so we know what to write next.
  const misses = labels.filter((_, i) => !halea[i]).map(keyOf).slice(0, 50);
  if (misses.length) await admin.rpc('log_ingredient_misses', { names: misses });

  return json({
    product,
    source,
    attribution: source === 'open_beauty_facts' ? ATTRIBUTION : null,
    porosity: porosity ?? null,
    main: labels.slice(0, 5),
    notes: productNotes(halea, porosity),
    ingredients,
    explained: halea.filter(Boolean).length,
    total: labels.length,
  });
});
