// Pure helpers for reading an ingredient list. No network, no Deno APIs,
// so they can be tested anywhere.

export type Fit = 'good' | 'ok' | 'caution';
export type Porosity = 'low' | 'normal' | 'high';

export type HaleaIngredient = {
  inci_name: string;
  also_called: string[];
  type: string;
  what_it_does: string;
  good_for: string;
  watch_out: string;
  low_porosity: Fit;
  high_porosity: Fit;
};

// "Ingredients: Aqua, Cetearyl Alcohol (and) ..., Parfum. May contain: CI 77491"
// -> ["Aqua", "Cetearyl Alcohol (and) ...", "Parfum"]
export function splitIngredients(text: string): string[] {
  let t = text.replace(/\s+/g, ' ').trim();
  // Drop a leading label such as "Ingredients:" or "INGREDIENTS / INGRÉDIENTS:"
  const colon = t.indexOf(':');
  if (colon > -1 && colon < 40 && /ingr/i.test(t.slice(0, colon))) t = t.slice(colon + 1);
  // Colour lists after "may contain" or "+/-" are not part of the formula order
  const cut = t.search(/\[?\s*(\+\/-|may contain|peut contenir)/i);
  if (cut > 0) t = t.slice(0, cut);

  const out: string[] = [];
  let depth = 0, cur = '';
  for (const ch of t) {
    if (ch === '(' || ch === '[') depth++;
    if ((ch === ')' || ch === ']') && depth > 0) depth--;
    if ((ch === ',' || ch === '•' || ch === ';') && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out
    // "CI 77491. *Natural origin": a footnote after a full stop is not an ingredient
    .map((s) => s.split(/\.\s/)[0])
    .map((s) => s.replace(/[*.]+$/g, '').replace(/^[*.\s]+/, '').trim())
    .filter((s) => s.length > 0 && s.length <= 120);
}

export function keyOf(name: string): string {
  return name
    .toLowerCase()
    .replace(/hydrolysed/g, 'hydrolyzed')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .trim()
    .replace(/\.+$/, '');
}

// Every way a label might match: as written, without brackets
// ("Butyrospermum Parkii (Shea) Butter" -> "butyrospermum parkii butter"),
// the bracket contents, and each part of "Aqua/Water/Eau".
export function candidates(label: string): string[] {
  const k = keyOf(label);
  const noBrackets = keyOf(k.replace(/\([^)]*\)|\[[^\]]*\]/g, ' '));
  const inBrackets = [...k.matchAll(/\(([^)]*)\)/g)].map((m) => keyOf(m[1]));
  const parts = noBrackets.includes('/') ? noBrackets.split('/').map(keyOf) : [];
  return [...new Set([k, noBrackets, ...parts, ...inBrackets].filter(Boolean))];
}

export function buildIndex(rows: HaleaIngredient[]): Map<string, HaleaIngredient> {
  const index = new Map<string, HaleaIngredient>();
  for (const r of rows) {
    index.set(keyOf(r.inci_name), r);
    for (const a of r.also_called ?? []) if (!index.has(keyOf(a))) index.set(keyOf(a), r);
  }
  return index;
}

export function findHalea(label: string, index: Map<string, HaleaIngredient>): HaleaIngredient | null {
  for (const c of candidates(label)) {
    const hit = index.get(c);
    if (hit) return hit;
  }
  return null;
}

export function fitFor(row: HaleaIngredient, porosity?: Porosity): Fit | null {
  if (porosity === 'low') return row.low_porosity;
  if (porosity === 'high') return row.high_porosity;
  return null;
}

// Plain, rule-based notes about the whole product. Every sentence comes from
// the ingredient types found, never from a model, so nothing is made up.
export function productNotes(list: (HaleaIngredient | null)[], porosity?: Porosity): string[] {
  const notes: string[] = [];
  const top5 = list.slice(0, 5);
  const firstHalf = list.slice(0, Math.max(1, Math.ceil(list.length / 2)));
  const has = (rows: (HaleaIngredient | null)[], ...types: string[]) =>
    rows.some((r) => r && types.includes(r.type));

  if (has(list, 'cleanser_strong')) {
    notes.push('Uses a strong cleanser. Good for buildup and oily scalps, but it can feel stripping on dry, curly or coily hair.');
  } else if (has(list, 'cleanser_gentle')) {
    notes.push('Cleans gently, without a strong cleanser.');
  }
  if (has(list, 'silicone_buildup')) {
    notes.push('Has silicones that can build up. A clarifying wash every week or two keeps hair light.');
  }
  if (has(firstHalf, 'protein', 'bond_repair')) {
    notes.push('Protein sits high on the list, so this is a strengthening product. If hair starts to feel stiff, use it less often.');
  }
  if (has(top5, 'butter', 'oil_heavy', 'occlusive')) {
    notes.push('Rich and sealing. Lovely on thick or dry hair, and can weigh down fine hair.');
  }
  if (has(top5, 'drying_alcohol')) {
    notes.push('A drying alcohol sits near the top of the list.');
  }
  if (has(list, 'fragrance', 'fragrance_allergen')) {
    notes.push('Contains fragrance. Patch test first if your scalp is sensitive.');
  }
  if (porosity === 'low' || porosity === 'high') {
    const watch = top5.filter((r): r is HaleaIngredient => !!r && fitFor(r, porosity) === 'caution');
    if (watch.length) {
      const names = [...new Set(watch.map((r) => r.also_called[0] || r.inci_name))];
      notes.push(`For ${porosity}-porosity hair, keep an eye on: ${names.join(', ')}.`);
    }
  }
  return notes;
}
