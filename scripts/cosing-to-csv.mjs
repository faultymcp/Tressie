// Turns the official EU CosIng download into a clean CSV that Supabase can
// import straight into the `cosing_ingredients` table.
//
//   node scripts/cosing-to-csv.mjs "C:\path\to\the\cosing-download.csv"
//
// Writes cosing-clean.csv in the current folder. Nothing is uploaded.

import fs from 'node:fs';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('\nGive the path to the CosIng CSV you downloaded, in quotes.\n');
  process.exit(1);
}

const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');

function parseCsv(text, sep) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// The download can start with a few lines of notes; find the real header row.
const firstLines = raw.split('\n').slice(0, 40);
const headerLine = firstLines.find((l) => /inci name/i.test(l));
if (!headerLine) {
  console.error("\nCouldn't find an 'INCI name' column. Is this the CosIng ingredients CSV? Send me the first few lines.\n");
  process.exit(1);
}
const sep = (headerLine.match(/;/g) || []).length > (headerLine.match(/,/g) || []).length ? ';' : ',';
const rows = parseCsv(raw, sep);
const h = rows.findIndex((r) => r.some((c) => /^\s*inci name\s*$/i.test(c)));
const header = rows[h].map((c) => c.trim().toLowerCase());
const col = (re) => header.findIndex((c) => re.test(c));
const iName = col(/^inci name$/), iRef = col(/cosing ref/), iFn = col(/^function/), iRestr = col(/^restriction/);
if (iName < 0 || iFn < 0) {
  console.error('\nFound the header but not the Function column. Send me the first few lines.\n');
  process.exit(1);
}

const out = new Map();
for (const r of rows.slice(h + 1)) {
  const name = (r[iName] || '').replace(/\s+/g, ' ').trim().toUpperCase();
  if (!name || out.has(name)) continue;
  out.set(name, [
    name,
    iRef >= 0 ? (r[iRef] || '').trim() : '',
    (r[iFn] || '').replace(/\s+/g, ' ').trim(),
    iRestr >= 0 ? (r[iRestr] || '').replace(/\s+/g, ' ').trim() : '',
  ]);
}

const q = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const lines = ['inci_name,cosing_ref,functions,restriction', ...[...out.values()].map((r) => r.map(q).join(','))];
fs.writeFileSync('cosing-clean.csv', lines.join('\n') + '\n', 'utf8');
console.log(`\nDone: ${out.size} ingredients written to cosing-clean.csv\n`);
