# Ingredient explainer

Scan a barcode or paste an ingredient list, and Halea explains what is in the product and whether it suits your hair. Every fact comes from a named source. Nothing is made up by AI.

## Where each fact comes from

| What | Source | Licence / rule |
|---|---|---|
| Product name, brand, ingredient list (from a barcode) | Open Beauty Facts, fetched live | Open Database Licence (ODbL): show the attribution line, send a custom User-Agent |
| Official function of about 22,000 ingredients, with CosIng reference numbers and EU annex restrictions | European Commission CosIng database, as compiled by Open Beauty Facts in their public GitHub repo. Table `cosing_ingredients` | EU open data; say "Ingredient functions: European Commission CosIng, via Open Beauty Facts". If anyone asks for this table, share it: it is public data |
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
- `scripts/cosing-to-csv.mjs`: rebuilds cosing-clean.csv from Open Beauty Facts' copy of CosIng.

## Setting it up (one time)

1. **Tables and notes.** Supabase → SQL Editor → paste `supabase/sql/2026-10-13_ingredients.sql` → Run.
2. **Function.** Set the contact email Open Beauty Facts asks for (it stays private, only sent to them): `npx supabase secrets set OBF_CONTACT=you@example.com`, then `npx supabase functions deploy ingredient-lookup`
3. **CosIng list.** Supabase → Table Editor → `cosing_ingredients` → Insert → Import data from CSV → choose `cosing-clean.csv` (sent separately, not in git).

   Where it comes from: the European Commission no longer offers CosIng as one bulk download. Open Beauty Facts keeps the inventory in `taxonomies/beauty/ingredients-cosing-obf.txt` and `inci_functions.txt` at github.com/openfoodfacts/openfoodfacts-server. To rebuild it: `node scripts/cosing-to-csv.mjs ingredients-cosing-obf.txt inci_functions.txt`.

   Their copy is incomplete: some everyday names (jojoba oil, sodium PCA, hydrolyzed keratin, polyquaternium-10) are missing. Halea's own notes cover those, so it only matters for the long tail.

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

1. Done 13 Oct: the chat's barcode scanner and "Check ingredients" use this function.
2. Photo of a label: read the text on the phone (ML Kit text recognition, like the face scan) and send it here. Needs a new build.
3. Budget and concern recommendations: tag products in our own `products` table with their ingredients, then match on concern, porosity and price.
4. Dupe finder: products whose first five ingredients match.
