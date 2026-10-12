# Ingredient explainer

Scan a barcode or paste an ingredient list, and Halea explains what is in the product and whether it suits your hair. Every fact comes from a named source. Nothing is made up by AI.

## Where each fact comes from

| What | Source | Licence / rule |
|---|---|---|
| Product name, brand, ingredient list (from a barcode) | Open Beauty Facts, fetched live | Open Database Licence (ODbL): show the attribution line, send a custom User-Agent |
| Official function of every EU ingredient (about 30,000) | European Commission CosIng database, table `cosing_ingredients` | Free EU open data; say "Source: European Commission CosIng" |
| Plain-English notes, good for, watch out, porosity fit | Halea's own notes, table `ingredients` (starts with 155) | Ours. General information, not medical advice |
| Product notes ("Has silicones that can build up...") | Fixed rules in `supabase/functions/ingredient-lookup/parse.ts` | Ours |

### Rules that keep it legit

1. **Never copy Open Beauty Facts data into our own tables.** ODbL is share-alike: if we build our own product database from theirs and use it publicly, we would have to release that database openly too. Fetching live and showing the result only needs the attribution line.
2. Wherever a barcode result is shown, show the `attribution` text the function returns.
3. If someone adds a missing product, send them to the Open Beauty Facts app to add it there, so everyone benefits.
4. Our notes stay general ("can weigh down fine hair"), never medical ("treats hair loss"). UK cosmetics rules forbid medical claims for cosmetics.

## The pieces

- `supabase/sql/2026-10-13_ingredients.sql`: the three tables and the 155 starter notes. Safe to run twice.
- `data/halea-ingredients.csv`: the same notes as a spreadsheet, for editing.
- `supabase/functions/ingredient-lookup/`: the function the app calls.
- `scripts/cosing-to-csv.mjs`: turns the CosIng download into a file Supabase can import.

## Setting it up (one time)

1. **Tables and notes.** Supabase → SQL Editor → paste `supabase/sql/2026-10-13_ingredients.sql` → Run.
2. **Function.** `npx supabase functions deploy ingredient-lookup`
3. **CosIng list.**
   - Download the CosIng ingredients CSV from the European Commission (search "CosIng download" or find "CosIng" on data.europa.eu).
   - From the project folder run: `node scripts/cosing-to-csv.mjs "C:\full\path\to\the\download.csv"`
   - Supabase → Table Editor → `cosing_ingredients` → Insert → Import data from CSV → choose `cosing-clean.csv`.
   - Delete `cosing-clean.csv` afterwards (don't commit it).

## Calling it from the app

```ts
const { data, error } = await supabase.functions.invoke('ingredient-lookup', {
  body: { barcode: '3600523614462', porosity: 'high' },   // or { ingredients_text: '...' }
});
```

You get back `product`, `main` (first five ingredients, which make up most of the formula), `notes` (plain sentences about the whole product), `ingredients` (each one with what it does and a `fit` of good / ok / caution for the user's porosity), `explained` / `total`, and `attribution`.

## Growing the notes

Every ingredient people scan that has no Halea note is counted in `ingredient_misses`. Once a week:

```sql
select name, times from ingredient_misses order by times desc limit 30;
```

Write notes for the top ones (add rows to the CSV, then insert them), and the explainer gets better every week.

## Next, in this order

1. The result screen (after launch).
2. Switch the chat's barcode scanner from Open Food Facts to this function.
3. Budget and concern recommendations: tag products in our own `products` table with their ingredients, then match on concern, porosity and price.
4. Dupe finder: products whose first five ingredients match.
