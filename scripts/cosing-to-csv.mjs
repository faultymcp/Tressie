// Builds cosing-clean.csv for the `cosing_ingredients` table.
//
// The European Commission doesn't offer CosIng as one bulk download any more.
// Open Beauty Facts keeps the whole CosIng inventory (names, CosIng reference
// numbers, official functions, annex restrictions) in their public GitHub repo:
//   github.com/openfoodfacts/openfoodfacts-server/tree/main/taxonomies/beauty
// This script reads two files from there:
//
//   node scripts/cosing-to-csv.mjs ingredients-cosing-obf.txt inci_functions.txt
//
// Writes cosing-clean.csv in the current folder. Nothing is uploaded.

import fs from 'node:fs';

const [ingredientsFile, functionsFile] = process.argv.slice(2);
if (!ingredientsFile || !functionsFile || !fs.existsSync(ingredientsFile) || !fs.existsSync(functionsFile)) {
  console.error('\nUsage: node scripts/cosing-to-csv.mjs ingredients-cosing-obf.txt inci_functions.txt\n');
  process.exit(1);
}

const blocks = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split(/\n\s*\n/);
const slug = (s) => s.trim().toLowerCase().replace(/\s+/g, '-');

// Official function names, e.g. "en:hair-conditioning" -> "Hair conditioning"
const functionName = new Map();
for (const b of blocks(functionsFile)) {
  const m = b.match(/^en: (.+)$/m);
  if (m) functionName.set('en:' + slug(m[1]), m[1].trim());
}

const out = new Map();
for (const b of blocks(ingredientsFile)) {
  const lines = b.split('\n').filter((l) => l && !l.startsWith('#'));
  const nameLine = lines.find((l) => l.startsWith('en: '));
  const ref = lines.find((l) => l.startsWith('cosing:en: '));
  const fnLine = lines.find((l) => l.startsWith('inci_functions:en: '));
  if (!nameLine || (!ref && !fnLine)) continue;          // only CosIng entries, not OBF's own groupings
  const name = nameLine.slice(4).split(', ')[0].replace(/\s+/g, ' ').trim().toUpperCase();
  if (!name || out.has(name)) continue;
  const functions = fnLine
    ? fnLine.slice(19).split(',').map((s) => functionName.get(s.trim())).filter(Boolean).join(', ')
    : '';
  const restr = lines.find((l) => l.startsWith('inci_restriction:en: '));
  out.set(name, [name, ref ? ref.slice(11).split(',')[0].trim() : '', functions, restr ? restr.slice(21).trim() : '']);
}

const q = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const rows = ['inci_name,cosing_ref,functions,restriction', ...[...out.values()].map((r) => r.map(q).join(','))];
fs.writeFileSync('cosing-clean.csv', rows.join('\n') + '\n', 'utf8');
console.log(`\nDone: ${out.size} CosIng ingredients written to cosing-clean.csv\n`);
