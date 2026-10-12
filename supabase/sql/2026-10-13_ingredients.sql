-- Ingredient engine: Halea's own plain-English notes, the EU CosIng list,
-- and a log of ingredients we haven't written notes for yet.
-- Safe to run twice. Run in Supabase -> SQL Editor.

create table if not exists public.ingredients (
  inci_name     text primary key,
  also_called   text[] not null default '{}',
  type          text not null,
  what_it_does  text not null,
  good_for      text not null default '',
  watch_out     text not null default '',
  low_porosity  text not null default 'good' check (low_porosity in ('good','ok','caution')),
  high_porosity text not null default 'good' check (high_porosity in ('good','ok','caution')),
  updated_at    timestamptz not null default now()
);

-- Filled from the official CosIng download (see docs/INGREDIENTS.md).
-- Names are stored in capitals, the way CosIng writes them.
create table if not exists public.cosing_ingredients (
  inci_name   text primary key,
  cosing_ref  text,
  functions   text,
  restriction text
);

-- Ingredients people scanned that have no Halea note yet. Sort by "times"
-- to see what to write next.
create table if not exists public.ingredient_misses (
  name      text primary key,
  times     int not null default 1,
  last_seen timestamptz not null default now()
);

alter table public.ingredients        enable row level security;
alter table public.cosing_ingredients enable row level security;
alter table public.ingredient_misses  enable row level security;

-- Reference data anyone can read. Only the server (service role) writes.
drop policy if exists "ingredients are readable" on public.ingredients;
create policy "ingredients are readable" on public.ingredients for select using (true);
drop policy if exists "cosing is readable" on public.cosing_ingredients;
create policy "cosing is readable" on public.cosing_ingredients for select using (true);
-- ingredient_misses has no policies on purpose: only the server can see it.

create or replace function public.log_ingredient_misses(names text[])
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ingredient_misses (name)
  select distinct n from unnest(names) as n where length(n) between 1 and 120
  on conflict (name) do update
    set times = ingredient_misses.times + 1, last_seen = now();
$$;
revoke execute on function public.log_ingredient_misses(text[]) from public, anon, authenticated;
grant execute on function public.log_ingredient_misses(text[]) to service_role;

-- Starter notes (155 ingredients). The editable copy is data/halea-ingredients.csv.
insert into public.ingredients
  (inci_name, also_called, type, what_it_does, good_for, watch_out, low_porosity, high_porosity)
values
  ('Aqua', array['Water','Eau']::text[], 'base', 'The base of most products. It is the moisture itself.', 'Everyone', '', 'good', 'good'),
  ('Alcohol Denat.', array['Denatured alcohol','SD Alcohol']::text[], 'drying_alcohol', 'Thin, fast-evaporating alcohol that helps sprays and gels dry quickly.', 'Fine or oily hair in light styling products', 'Can dry out hair and scalp when it sits high on the list', 'caution', 'caution'),
  ('Alcohol', array['Ethanol']::text[], 'drying_alcohol', 'Fast-evaporating alcohol used as a solvent.', 'Quick-drying sprays', 'Drying when it sits high on the list', 'caution', 'caution'),
  ('Isopropyl Alcohol', array['IPA']::text[], 'drying_alcohol', 'Strong evaporating alcohol used as a solvent.', 'Rarely needed in hair care', 'Drying for most hair, especially textured and high-porosity hair', 'caution', 'caution'),
  ('Propanediol', '{}'::text[], 'humectant', 'Plant-derived solvent that also draws water into the hair.', 'Most hair types', '', 'good', 'good'),
  ('Sodium Lauryl Sulfate', array['SLS']::text[], 'cleanser_strong', 'A strong, high-foam cleanser that removes oil and buildup thoroughly.', 'Oily scalps; an occasional clarifying wash', 'Can strip dry, curly, coily or colour-treated hair and irritate sensitive scalps', 'ok', 'caution'),
  ('Sodium Laureth Sulfate', array['SLES']::text[], 'cleanser_strong', 'A strong cleanser, slightly milder than SLS, with rich foam.', 'Oily scalps and regular buildup', 'Can leave dry, curly and coily hair feeling stripped', 'ok', 'caution'),
  ('Ammonium Lauryl Sulfate', array['ALS']::text[], 'cleanser_strong', 'A strong foaming cleanser, similar to SLS.', 'Oily scalps; clarifying', 'Drying for curly, coily and colour-treated hair', 'ok', 'caution'),
  ('Ammonium Laureth Sulfate', array['ALES']::text[], 'cleanser_strong', 'A strong foaming cleanser, a little milder than ALS.', 'Oily scalps', 'Can dry out curly and coily hair', 'ok', 'caution'),
  ('Sodium C14-16 Olefin Sulfonate', '{}'::text[], 'cleanser_strong', 'A strong sulfate-free cleanser that cleans about as hard as a sulfate.', 'Clarifying and oily scalps', '''Sulfate-free'' does not mean gentle here; can still strip dry hair', 'ok', 'caution'),
  ('Sodium Myreth Sulfate', '{}'::text[], 'cleanser_strong', 'A strong foaming cleanser in the sulfate family.', 'Oily scalps', 'Can strip dry hair', 'ok', 'caution'),
  ('Cocamidopropyl Betaine', array['CAPB']::text[], 'cleanser_gentle', 'A mild cleanser that softens stronger ones and boosts foam.', 'Most hair types, including dry and curly', 'Occasional sensitivity on very reactive scalps', 'good', 'good'),
  ('Coco-Glucoside', '{}'::text[], 'cleanser_gentle', 'A very mild sugar-based cleanser.', 'Dry, curly, coily and sensitive scalps', 'May not shift heavy buildup on its own', 'good', 'good'),
  ('Decyl Glucoside', '{}'::text[], 'cleanser_gentle', 'A mild sugar-based cleanser with gentle foam.', 'Dry hair and sensitive scalps', 'May not shift heavy buildup on its own', 'good', 'good'),
  ('Lauryl Glucoside', '{}'::text[], 'cleanser_gentle', 'A mild sugar-based cleanser.', 'Dry and curly hair', '', 'good', 'good'),
  ('Sodium Cocoyl Isethionate', array['SCI']::text[], 'cleanser_gentle', 'A gentle cleanser that leaves hair soft rather than squeaky.', 'Dry, curly and coily hair; shampoo bars', '', 'good', 'good'),
  ('Sodium Lauroyl Methyl Isethionate', array['SLMI']::text[], 'cleanser_gentle', 'A gentle, creamy-foam cleanser.', 'Dry and curly hair', '', 'good', 'good'),
  ('Disodium Laureth Sulfosuccinate', '{}'::text[], 'cleanser_gentle', 'A mild cleanser despite the similar name to sulfates.', 'Most hair types', '', 'good', 'good'),
  ('Sodium Cocoamphoacetate', '{}'::text[], 'cleanser_gentle', 'A very mild cleanser often used in baby and curly shampoos.', 'Dry hair and sensitive scalps', '', 'good', 'good'),
  ('Disodium Cocoamphodiacetate', '{}'::text[], 'cleanser_gentle', 'A very mild cleanser.', 'Dry hair and sensitive scalps', '', 'good', 'good'),
  ('Sodium Lauroyl Sarcosinate', '{}'::text[], 'cleanser_gentle', 'A mild-to-moderate cleanser that rinses clean.', 'Most hair types', '', 'good', 'ok'),
  ('Sodium Methyl Cocoyl Taurate', '{}'::text[], 'cleanser_gentle', 'A mild cleanser with good foam.', 'Most hair types', '', 'good', 'good'),
  ('Sodium Lauroyl Glutamate', '{}'::text[], 'cleanser_gentle', 'A very mild amino-acid cleanser.', 'Dry, fragile and coily hair', '', 'good', 'good'),
  ('Cocamide MIPA', '{}'::text[], 'thickener', 'Thickens shampoo and stabilises foam.', 'Most hair types', '', 'good', 'good'),
  ('Cocamide DEA', '{}'::text[], 'thickener', 'Thickens shampoo and boosts foam.', 'Most hair types', 'Many brands have switched to alternatives over safety concerns', 'ok', 'ok'),
  ('Behentrimonium Chloride', '{}'::text[], 'conditioner', 'A conditioning agent that smooths the cuticle and makes detangling much easier.', 'Curly, coily, thick and tangle-prone hair', 'Can feel heavy on very fine hair', 'ok', 'good'),
  ('Behentrimonium Methosulfate', array['BTMS']::text[], 'conditioner', 'A gentle, effective detangler and softener.', 'Most hair types, especially curly and coily', '', 'good', 'good'),
  ('Cetrimonium Chloride', '{}'::text[], 'conditioner', 'A lighter conditioning agent that reduces static and tangles.', 'Fine to medium hair', 'Can irritate very sensitive scalps at higher amounts', 'good', 'good'),
  ('Stearamidopropyl Dimethylamine', '{}'::text[], 'conditioner', 'A conditioning agent that softens and detangles.', 'Most hair types', '', 'good', 'good'),
  ('Polyquaternium-10', '{}'::text[], 'conditioner', 'A conditioning polymer that leaves a light, smooth film.', 'Most hair types; common in 2-in-1s', 'Can build up over time; a clarifying wash clears it', 'ok', 'good'),
  ('Polyquaternium-7', '{}'::text[], 'conditioner', 'A conditioning polymer that adds slip and softness.', 'Most hair types', 'Can build up over time', 'ok', 'good'),
  ('Polyquaternium-11', '{}'::text[], 'film_former', 'A conditioning polymer that also gives light hold.', 'Styling products for waves and curls', 'Can build up over time', 'ok', 'good'),
  ('Guar Hydroxypropyltrimonium Chloride', '{}'::text[], 'conditioner', 'A plant-based conditioning agent that adds slip.', 'Most hair types', 'Can build up over time', 'ok', 'good'),
  ('Quaternium-91', '{}'::text[], 'conditioner', 'A conditioning agent that protects and smooths damaged areas.', 'Damaged and colour-treated hair', '', 'ok', 'good'),
  ('Brassicamidopropyl Dimethylamine', '{}'::text[], 'conditioner', 'A plant-derived conditioning agent that detangles.', 'Most hair types', '', 'good', 'good'),
  ('Cetyl Alcohol', '{}'::text[], 'fatty_alcohol', 'A fatty alcohol that softens and thickens. Not drying.', 'Everyone', '', 'good', 'good'),
  ('Stearyl Alcohol', '{}'::text[], 'fatty_alcohol', 'A fatty alcohol that softens and adds body to creams. Not drying.', 'Everyone', '', 'good', 'good'),
  ('Cetearyl Alcohol', '{}'::text[], 'fatty_alcohol', 'A blend of cetyl and stearyl alcohol that softens and thickens. Not drying.', 'Everyone', '', 'good', 'good'),
  ('Behenyl Alcohol', '{}'::text[], 'fatty_alcohol', 'A fatty alcohol that conditions and thickens. Not drying.', 'Everyone', '', 'good', 'good'),
  ('Myristyl Alcohol', '{}'::text[], 'fatty_alcohol', 'A fatty alcohol that softens. Not drying.', 'Everyone', '', 'good', 'good'),
  ('Dimethicone', '{}'::text[], 'silicone_buildup', 'A silicone that coats the hair for shine, slip and frizz control.', 'Frizz, heat styling, very damaged ends', 'Builds up without an occasional clarifying wash; can weigh down fine hair', 'caution', 'good'),
  ('Amodimethicone', '{}'::text[], 'silicone_buildup', 'A ''smart'' silicone that sticks mainly to damaged areas for smoothness.', 'Damaged and colour-treated hair', 'Builds up less than dimethicone, but still needs an occasional clarifying wash', 'ok', 'good'),
  ('Dimethiconol', '{}'::text[], 'silicone_buildup', 'A silicone that adds shine and smoothness.', 'Frizz and dry ends', 'Builds up without clarifying', 'caution', 'good'),
  ('Phenyl Trimethicone', '{}'::text[], 'silicone_buildup', 'A silicone that adds high shine.', 'Shine sprays and serums', 'Can build up', 'caution', 'ok'),
  ('Trimethylsiloxyamodimethicone', '{}'::text[], 'silicone_buildup', 'A conditioning silicone that targets damaged spots.', 'Damaged hair', 'Can build up', 'caution', 'good'),
  ('Cyclopentasiloxane', array['D5']::text[], 'silicone_evaporates', 'A light silicone that gives slip, then evaporates.', 'Serums and heat protectants', 'Tightly restricted in the EU for environmental reasons, so brands are moving away from it', 'good', 'good'),
  ('Cyclohexasiloxane', array['D6']::text[], 'silicone_evaporates', 'A light silicone that evaporates after giving slip.', 'Serums', 'Tightly restricted in the EU for environmental reasons', 'good', 'good'),
  ('PEG-12 Dimethicone', '{}'::text[], 'silicone_washes_out', 'A water-soluble silicone: slip and softness that rinse away.', 'Everyone, including no-buildup routines', '', 'good', 'good'),
  ('PEG/PPG-18/18 Dimethicone', '{}'::text[], 'silicone_washes_out', 'A water-soluble silicone that helps mix and soften.', 'Everyone', '', 'good', 'good'),
  ('Bis-PEG-18 Methyl Ether Dimethyl Silane', '{}'::text[], 'silicone_washes_out', 'A water-soluble silicone that adds softness.', 'Everyone', '', 'good', 'good'),
  ('Glycerin', array['Glycerol','Glycerine']::text[], 'humectant', 'Draws water into the hair and holds it there.', 'Most hair, especially dry and curly', 'Very dry or very humid weather can make it cause frizz', 'good', 'good'),
  ('Panthenol', array['Pro-vitamin B5']::text[], 'humectant', 'Draws in moisture and adds softness and a little shine.', 'Everyone', '', 'good', 'good'),
  ('Sodium PCA', '{}'::text[], 'humectant', 'A strong moisture-binder found naturally in skin.', 'Dry hair', 'Same weather caveats as glycerin', 'good', 'good'),
  ('Sodium Hyaluronate', array['Hyaluronic acid']::text[], 'humectant', 'Holds water on the hair and scalp.', 'Dry hair and scalp', '', 'good', 'good'),
  ('Butylene Glycol', '{}'::text[], 'humectant', 'A light humectant and solvent.', 'Everyone', '', 'good', 'good'),
  ('Propylene Glycol', '{}'::text[], 'humectant', 'A humectant and solvent that helps products spread.', 'Most hair', 'Can irritate very sensitive scalps', 'good', 'good'),
  ('Sorbitol', '{}'::text[], 'humectant', 'A sugar-based humectant.', 'Dry hair', '', 'good', 'good'),
  ('Honey', array['Mel']::text[], 'humectant', 'A natural humectant that draws in moisture.', 'Dry hair', 'Can feel sticky in humid weather', 'good', 'good'),
  ('Aloe Barbadensis Leaf Juice', array['Aloe vera']::text[], 'humectant', 'Hydrating and soothing for hair and scalp.', 'Dry hair and itchy scalps', '', 'good', 'good'),
  ('Betaine', '{}'::text[], 'humectant', 'A gentle moisture-binder from sugar beet.', 'Everyone', '', 'good', 'good'),
  ('Hydroxyethyl Urea', '{}'::text[], 'humectant', 'A strong humectant that feels lighter than glycerin.', 'Fine hair that still needs moisture', '', 'good', 'good'),
  ('Sodium Lactate', '{}'::text[], 'humectant', 'A moisture-binder that also helps balance pH.', 'Dry hair', '', 'good', 'good'),
  ('Urea', '{}'::text[], 'humectant', 'Draws in moisture; on the scalp it softens flakes.', 'Dry scalps', '', 'good', 'good'),
  ('Hydrolyzed Keratin', '{}'::text[], 'protein', 'Small pieces of keratin that temporarily patch and strengthen damaged areas.', 'Damaged, bleached, heat-styled and high-porosity hair', 'Too much, too often can leave hair stiff and brittle', 'caution', 'good'),
  ('Hydrolyzed Wheat Protein', '{}'::text[], 'protein', 'Adds strength and body and helps hair hold moisture.', 'Fine, limp and damaged hair', 'Avoid if you have a wheat allergy; overuse can stiffen hair', 'caution', 'good'),
  ('Hydrolyzed Silk', array['Silk amino acids']::text[], 'protein', 'Very small proteins that add smoothness and shine.', 'Most hair types', '', 'ok', 'good'),
  ('Hydrolyzed Rice Protein', '{}'::text[], 'protein', 'Adds body and strength.', 'Fine and damaged hair', 'Overuse can stiffen hair', 'caution', 'good'),
  ('Hydrolyzed Collagen', '{}'::text[], 'protein', 'Adds body and helps damaged hair feel stronger.', 'Damaged hair', 'Overuse can stiffen hair', 'caution', 'good'),
  ('Hydrolyzed Oat Protein', '{}'::text[], 'protein', 'Strengthens and soothes.', 'Damaged hair and sensitive scalps', '', 'caution', 'good'),
  ('Hydrolyzed Soy Protein', '{}'::text[], 'protein', 'Adds strength and body.', 'Fine and damaged hair', '', 'caution', 'good'),
  ('Hydrolyzed Quinoa', '{}'::text[], 'protein', 'Plant protein that strengthens and protects colour.', 'Damaged and colour-treated hair', '', 'caution', 'good'),
  ('Arginine', '{}'::text[], 'protein', 'An amino acid that conditions and supports damaged hair.', 'Damaged hair', '', 'ok', 'good'),
  ('Bis-Aminopropyl Diglycol Dimaleate', '{}'::text[], 'bond_repair', 'A bond-building ingredient that helps repair links broken by bleach and heat.', 'Bleached, coloured and heat-damaged hair', '', 'ok', 'good'),
  ('Argania Spinosa Kernel Oil', array['Argan oil']::text[], 'oil_light', 'A light oil that softens and adds shine without much weight.', 'Most hair types, including fine', '', 'good', 'good'),
  ('Simmondsia Chinensis Seed Oil', array['Jojoba oil']::text[], 'oil_light', 'A light, wax-like oil close to the scalp''s own oil.', 'Scalps and most hair types', '', 'good', 'good'),
  ('Vitis Vinifera Seed Oil', array['Grapeseed oil']::text[], 'oil_light', 'A very light oil that softens without greasiness.', 'Fine and low-porosity hair', '', 'good', 'ok'),
  ('Prunus Amygdalus Dulcis Oil', array['Sweet almond oil']::text[], 'oil_light', 'A light-to-medium oil that softens.', 'Most hair types', 'Avoid with a nut allergy', 'good', 'good'),
  ('Helianthus Annuus Seed Oil', array['Sunflower oil']::text[], 'oil_light', 'A light oil that softens and helps protect.', 'Most hair types', '', 'good', 'good'),
  ('Camellia Japonica Seed Oil', array['Camellia oil']::text[], 'oil_light', 'A light oil that adds shine and smoothness.', 'Fine to medium hair', '', 'good', 'good'),
  ('Squalane', '{}'::text[], 'oil_light', 'A very light, stable oil that softens without weight.', 'Fine and low-porosity hair; scalps', '', 'good', 'good'),
  ('Rosa Canina Fruit Oil', array['Rosehip oil']::text[], 'oil_light', 'A light oil that softens.', 'Dry ends', '', 'good', 'good'),
  ('Cannabis Sativa Seed Oil', array['Hemp seed oil']::text[], 'oil_light', 'A light oil that softens.', 'Most hair types', '', 'good', 'good'),
  ('Caprylic/Capric Triglyceride', array['Fractionated coconut oil']::text[], 'oil_light', 'A light, non-greasy oil that softens.', 'Fine and low-porosity hair', '', 'good', 'good'),
  ('Coco-Caprylate', '{}'::text[], 'oil_light', 'A light emollient that feels silky, often a silicone alternative.', 'Fine hair', '', 'good', 'good'),
  ('Isopropyl Myristate', '{}'::text[], 'oil_light', 'A light emollient that helps products spread.', 'Most hair', 'Can clog pores on acne-prone hairlines', 'good', 'good'),
  ('Cocos Nucifera Oil', array['Coconut oil']::text[], 'oil_medium', 'Soaks into the hair shaft and helps reduce protein loss when washing.', 'Medium to thick, high-porosity hair; pre-wash treatments', 'Can leave some hair, often low-porosity or coarse, feeling stiff or coated', 'caution', 'good'),
  ('Persea Gratissima Oil', array['Avocado oil']::text[], 'oil_medium', 'A rich oil that soaks in and softens.', 'Dry and thick hair', '', 'ok', 'good'),
  ('Olea Europaea Fruit Oil', array['Olive oil']::text[], 'oil_medium', 'A rich oil that softens and seals.', 'Thick, dry and coily hair', 'Can weigh down fine hair', 'caution', 'good'),
  ('Orbignya Oleifera Seed Oil', array['Babassu oil']::text[], 'oil_medium', 'A softening oil similar to coconut but lighter.', 'Most hair types', '', 'ok', 'good'),
  ('Ricinus Communis Seed Oil', array['Castor oil']::text[], 'oil_heavy', 'A very thick oil that seals in moisture and adds shine.', 'Thick, coily hair; edges and ends', 'Heavy and hard to wash out; growth claims are not well proven', 'caution', 'good'),
  ('Moringa Oleifera Seed Oil', array['Moringa oil']::text[], 'oil_light', 'A light, stable oil that softens.', 'Most hair types', '', 'good', 'good'),
  ('Rosmarinus Officinalis Leaf Oil', array['Rosemary oil']::text[], 'scalp_care', 'An essential oil used for scalp care and scent.', 'Scalps', 'Use diluted; growth claims rest on limited evidence; can irritate sensitive skin', 'good', 'good'),
  ('Mentha Piperita Oil', array['Peppermint oil']::text[], 'scalp_care', 'A cooling essential oil for the scalp.', 'Scalps that like a tingle', 'Can irritate sensitive scalps', 'good', 'good'),
  ('Melaleuca Alternifolia Leaf Oil', array['Tea tree oil']::text[], 'scalp_care', 'An essential oil with antimicrobial properties for the scalp.', 'Flaky or itchy scalps', 'Can irritate when concentrated; patch test', 'good', 'good'),
  ('Butyrospermum Parkii Butter', array['Shea butter']::text[], 'butter', 'A rich butter that seals in moisture and softens.', 'Thick, dry, curly and coily hair', 'Can weigh down fine or low-porosity hair', 'caution', 'good'),
  ('Theobroma Cacao Seed Butter', array['Cocoa butter']::text[], 'butter', 'A firm, rich butter that seals and softens.', 'Thick, dry hair and ends', 'Heavy on fine hair', 'caution', 'good'),
  ('Mangifera Indica Seed Butter', array['Mango butter']::text[], 'butter', 'A softer butter that seals moisture in.', 'Dry and curly hair', 'Can weigh down fine hair', 'caution', 'good'),
  ('Astrocaryum Murumuru Seed Butter', array['Murumuru butter']::text[], 'butter', 'A rich butter that softens and adds shine.', 'Curly and coily hair', 'Heavy on fine hair', 'caution', 'good'),
  ('Theobroma Grandiflorum Seed Butter', array['Cupuacu butter']::text[], 'butter', 'A butter that holds water well and softens.', 'Dry, curly and coily hair', '', 'caution', 'good'),
  ('Lanolin', '{}'::text[], 'butter', 'A rich, wax-like emollient that seals moisture in.', 'Very dry hair and ends', 'Avoid with a wool allergy; heavy', 'caution', 'good'),
  ('Paraffinum Liquidum', array['Mineral oil']::text[], 'occlusive', 'A non-absorbing oil that seals moisture in and adds shine.', 'Very dry ends; sealing after moisture', 'Sits on top rather than soaking in; can feel heavy', 'caution', 'ok'),
  ('Petrolatum', array['Petroleum jelly']::text[], 'occlusive', 'A heavy seal that locks moisture in.', 'Very dry ends and edges', 'Heavy and hard to wash out', 'caution', 'ok'),
  ('Cera Alba', array['Beeswax']::text[], 'occlusive', 'A wax that seals and gives hold.', 'Twists, locs maintenance and edges', 'Builds up and is hard to wash out', 'caution', 'ok'),
  ('PVP', array['Polyvinylpyrrolidone']::text[], 'film_former', 'Gives hold by forming a flexible film.', 'Gels and styling for curls and waves', 'Can flake or feel crunchy in high amounts', 'ok', 'ok'),
  ('VP/VA Copolymer', '{}'::text[], 'film_former', 'Gives flexible hold.', 'Gels and mousses', 'Can flake', 'ok', 'ok'),
  ('Acrylates Copolymer', '{}'::text[], 'film_former', 'Gives firm hold and frizz resistance.', 'Gels and edge controls', 'Can feel crunchy until scrunched out', 'ok', 'ok'),
  ('Linum Usitatissimum Seed Extract', array['Flaxseed extract']::text[], 'film_former', 'Plant-based gel that gives soft hold and definition.', 'Curls and coils', '', 'good', 'good'),
  ('Xanthan Gum', '{}'::text[], 'thickener', 'A natural thickener that gives products body and slip.', 'Everyone', 'Can feel slimy in large amounts', 'good', 'good'),
  ('Hydroxyethylcellulose', '{}'::text[], 'thickener', 'A plant-based thickener for gels.', 'Everyone', '', 'good', 'good'),
  ('Carbomer', '{}'::text[], 'thickener', 'Thickens gels into a clear texture.', 'Everyone', '', 'good', 'good'),
  ('Cyamopsis Tetragonoloba Gum', array['Guar gum']::text[], 'thickener', 'A plant thickener that adds slip.', 'Everyone', '', 'good', 'good'),
  ('Sodium Chloride', array['Salt']::text[], 'thickener', 'Thickens shampoos.', 'Everyone', 'In high amounts can dry the scalp', 'good', 'good'),
  ('Ceteareth-20', '{}'::text[], 'emulsifier', 'Helps oil and water mix into a smooth cream.', 'Everyone', '', 'good', 'good'),
  ('Polysorbate 20', '{}'::text[], 'emulsifier', 'Helps oils mix into water-based products.', 'Everyone', '', 'good', 'good'),
  ('Polysorbate 80', '{}'::text[], 'emulsifier', 'Helps oils mix into water-based products.', 'Everyone', '', 'good', 'good'),
  ('Glyceryl Stearate', '{}'::text[], 'emulsifier', 'Helps creams hold together and adds softness.', 'Everyone', '', 'good', 'good'),
  ('PEG-100 Stearate', '{}'::text[], 'emulsifier', 'Helps creams hold together.', 'Everyone', '', 'good', 'good'),
  ('Glycol Distearate', '{}'::text[], 'emulsifier', 'Gives shampoos a pearly look and a little softness.', 'Everyone', '', 'good', 'good'),
  ('Phenoxyethanol', '{}'::text[], 'preservative', 'Keeps the product free of bacteria and mould.', 'Everyone', '', 'good', 'good'),
  ('Sodium Benzoate', '{}'::text[], 'preservative', 'A gentle preservative.', 'Everyone', '', 'good', 'good'),
  ('Potassium Sorbate', '{}'::text[], 'preservative', 'A gentle preservative.', 'Everyone', '', 'good', 'good'),
  ('Benzyl Alcohol', '{}'::text[], 'preservative', 'A preservative and solvent. Not a drying alcohol in these amounts.', 'Everyone', 'Can irritate very sensitive skin', 'good', 'good'),
  ('Ethylhexylglycerin', '{}'::text[], 'preservative', 'Boosts preservatives and conditions lightly.', 'Everyone', '', 'good', 'good'),
  ('Caprylyl Glycol', '{}'::text[], 'preservative', 'Boosts preservatives and conditions lightly.', 'Everyone', '', 'good', 'good'),
  ('Methylparaben', '{}'::text[], 'preservative', 'A long-used, effective preservative.', 'Everyone', 'Some people prefer to avoid parabens; approved for use in the UK and EU', 'good', 'good'),
  ('Propylparaben', '{}'::text[], 'preservative', 'An effective preservative.', 'Everyone', 'Allowed at low levels in the UK and EU; some people prefer to avoid', 'good', 'good'),
  ('Methylisothiazolinone', array['MIT']::text[], 'preservative', 'A strong preservative.', 'Rinse-off products', 'A known skin sensitiser; only allowed in rinse-off products in the UK and EU', 'good', 'good'),
  ('Methylchloroisothiazolinone', array['CMIT']::text[], 'preservative', 'A strong preservative, usually paired with MIT.', 'Rinse-off products', 'A known skin sensitiser', 'good', 'good'),
  ('DMDM Hydantoin', '{}'::text[], 'preservative', 'A preservative that slowly releases tiny amounts of formaldehyde.', 'Rarely the best choice', 'Can irritate sensitive scalps; many brands have moved away from it', 'ok', 'ok'),
  ('Parfum', array['Fragrance','Perfume']::text[], 'fragrance', 'Scent.', 'Everyone who enjoys scent', 'A common cause of scalp irritation; choose fragrance-free if sensitive', 'good', 'good'),
  ('Linalool', '{}'::text[], 'fragrance_allergen', 'A scent ingredient, listed because some people react to it.', '', 'Patch test if you have a sensitive scalp', 'good', 'good'),
  ('Limonene', '{}'::text[], 'fragrance_allergen', 'A citrus scent ingredient, listed because some people react to it.', '', 'Patch test if sensitive', 'good', 'good'),
  ('Citronellol', '{}'::text[], 'fragrance_allergen', 'A rose-scented ingredient, listed because some people react to it.', '', 'Patch test if sensitive', 'good', 'good'),
  ('Geraniol', '{}'::text[], 'fragrance_allergen', 'A floral scent ingredient, listed because some people react to it.', '', 'Patch test if sensitive', 'good', 'good'),
  ('Hexyl Cinnamal', '{}'::text[], 'fragrance_allergen', 'A jasmine-like scent ingredient, listed because some people react to it.', '', 'Patch test if sensitive', 'good', 'good'),
  ('Coumarin', '{}'::text[], 'fragrance_allergen', 'A vanilla-like scent ingredient, listed because some people react to it.', '', 'Patch test if sensitive', 'good', 'good'),
  ('Citric Acid', '{}'::text[], 'ph_adjuster', 'Lowers pH so the cuticle lies flat, which helps shine and smoothness.', 'Everyone', '', 'good', 'good'),
  ('Lactic Acid', '{}'::text[], 'ph_adjuster', 'Balances pH and adds a little moisture.', 'Everyone', '', 'good', 'good'),
  ('Sodium Hydroxide', '{}'::text[], 'ph_adjuster', 'Adjusts pH in small amounts. Fine in finished products.', 'Everyone', 'Only a concern in relaxers, where it is the main active', 'good', 'good'),
  ('Disodium EDTA', '{}'::text[], 'chelator', 'Grabs minerals from hard water so they don''t build up on hair.', 'Hard-water areas', '', 'good', 'good'),
  ('Tetrasodium EDTA', '{}'::text[], 'chelator', 'Grabs hard-water minerals so they don''t build up.', 'Hard-water areas', '', 'good', 'good'),
  ('Tetrasodium Glutamate Diacetate', array['GLDA']::text[], 'chelator', 'A biodegradable chelator for hard-water minerals.', 'Hard-water areas', '', 'good', 'good'),
  ('Sodium Phytate', '{}'::text[], 'chelator', 'A plant-based chelator for hard-water minerals.', 'Hard-water areas', '', 'good', 'good'),
  ('Salicylic Acid', '{}'::text[], 'scalp_care', 'Loosens flakes and buildup on the scalp.', 'Flaky and oily scalps', 'Can dry out the lengths; focus it on the scalp', 'good', 'good'),
  ('Zinc Pyrithione', '{}'::text[], 'scalp_care', 'Treats dandruff by calming the yeast behind it.', 'Dandruff', '', 'good', 'good'),
  ('Piroctone Olamine', '{}'::text[], 'scalp_care', 'An anti-dandruff active that calms flaking.', 'Dandruff and itchy scalps', '', 'good', 'good'),
  ('Climbazole', '{}'::text[], 'scalp_care', 'An anti-dandruff active.', 'Dandruff', '', 'good', 'good'),
  ('Niacinamide', array['Vitamin B3']::text[], 'scalp_care', 'Soothes and supports a healthy scalp.', 'Sensitive and oily scalps', '', 'good', 'good'),
  ('Caffeine', '{}'::text[], 'scalp_care', 'A scalp ingredient often used in anti-shedding products.', 'Scalps', 'Evidence for regrowth is limited; not a medical treatment', 'good', 'good'),
  ('Menthol', '{}'::text[], 'scalp_care', 'Gives a cooling tingle.', 'Scalps that like a fresh feel', 'Can irritate sensitive scalps', 'good', 'good'),
  ('Tocopherol', array['Vitamin E']::text[], 'antioxidant', 'Protects oils in the product from going off.', 'Everyone', '', 'good', 'good'),
  ('Biotin', array['Vitamin B7']::text[], 'other', 'Often added for marketing.', '', 'There''s little evidence it does much applied to hair', 'good', 'good'),
  ('Hydrolyzed Vegetable Protein', '{}'::text[], 'protein', 'Adds strength and body.', 'Damaged and fine hair', 'Overuse can stiffen hair', 'caution', 'good'),
  ('Silica', '{}'::text[], 'other', 'Absorbs oil and gives a matte, grippy feel.', 'Dry shampoos and texture sprays', 'Can dry out hair', 'ok', 'ok'),
  ('Oryza Sativa Starch', array['Rice starch']::text[], 'other', 'Absorbs oil.', 'Dry shampoos', 'Can leave a white cast on dark hair', 'ok', 'ok')
on conflict (inci_name) do update set
  also_called = excluded.also_called, type = excluded.type, what_it_does = excluded.what_it_does,
  good_for = excluded.good_for, watch_out = excluded.watch_out,
  low_porosity = excluded.low_porosity, high_porosity = excluded.high_porosity, updated_at = now();
