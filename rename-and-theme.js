// rename-and-theme.js
// 1. Renames Tressie / Tressana to Halea across the project.
// 2. Replaces the violet-and-pink palette with warm ink, clay and lime.
//
// Run from your project root:  node rename-and-theme.js
//
// The colour token NAMES are left alone on purpose. Colors.violet still
// exists everywhere in your code, it just isn't violet any more. That
// means the palette changes without touching a single component.

const fs = require('fs');
const path = require('path');

const DIRS = ['app', 'components', 'constants', 'lib', 'supabase'];
const EXT = new Set(['.ts', '.tsx', '.js', '.json', '.md']);
const SKIP_FILES = new Set(['package-lock.json']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      walk(full, out);
    } else if (EXT.has(path.extname(e.name)) && !SKIP_FILES.has(e.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk('.').filter(f => DIRS.some(d => f.startsWith(d + path.sep)));
if (fs.existsSync('app.json')) files.push('app.json');
if (fs.existsSync('package.json')) files.push('package.json');
if (fs.existsSync('README.md')) files.push('README.md');
if (fs.existsSync('BRAND.md')) files.push('BRAND.md');

// ─────────────────────────────────────────────────────────────────
// 1. Rename
// ─────────────────────────────────────────────────────────────────

let renamed = 0;
let renamedFiles = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let out = src;

  out = out.replace(/com\.tressie\.app|ai\.tressana\.app/g, 'com.halea.app');
  out = out.replace(/tressie\.app|tressie\.ai|tressana\.ai/g, 'halea.app');
  out = out.replace(/Tressana|Tressie/g, 'Halea');
  out = out.replace(/tressana|tressie/g, 'halea');
  out = out.replace(/TRESSANA|TRESSIE/g, 'HALEA');

  if (out !== src) {
    const hits = (src.match(/tressana|tressie/gi) || []).length;
    fs.writeFileSync(file, out, 'utf8');
    renamed += hits;
    renamedFiles++;
  }
}

console.log(`1. Rename       ${renamed} strings across ${renamedFiles} files -> Halea`);

// ─────────────────────────────────────────────────────────────────
// 2. Palette
//
// Violet-to-pink is the single loudest "generated" signal in the app.
// Warm near-black on porcelain reads editorial rather than templated,
// and lets photography carry the colour. Lime stays as the one accent
// because no AI product uses acid green.
// ─────────────────────────────────────────────────────────────────

const THEME = path.join('constants', 'theme.ts');
const SWAPS = [
  // Core
  ["violet: '#7643AC'",    "violet: '#241C17'"],   // primary actions, warm ink
  ["pink: '#F484B9'",      "pink: '#8C5A3C'"],     // clay
  ["lavender: '#C38CD9'",  "lavender: '#B08968'"], // light clay
  ["ink: '#332463'",       "ink: '#241C17'"],
  ["inkDeep: '#120B2E'",   "inkDeep: '#14100D'"],  // ceremonial ground
  ["muted: '#8A7FA0'",     "muted: '#8A7F76'"],    // warm grey, was purple grey
  ["border: '#EAE6F5'",    "border: '#E8E2D9'"],   // warm hairline
  ["dark: '#0c0a15'",      "dark: '#0D0A08'"],

  // Gradients. Kept as tokens so nothing breaks, but the stops are now
  // close together, so a gradient reads as depth rather than decoration.
  ["gradientPrimary: ['#7643AC', '#F484B9']",
   "gradientPrimary: ['#241C17', '#3D2F26']"],
  ["gradientHeader: ['#120B2E', '#332463', '#7643AC']",
   "gradientHeader: ['#14100D', '#241C17', '#3D2F26']"],
  ["gradientSplash: ['#120B2E', '#2d1854', '#4a2070', '#7643AC']",
   "gradientSplash: ['#14100D', '#1C1712', '#241C17', '#3D2F26']"],
  ["gradientWelcome: ['#120B2E', '#2d1854', '#4a2070', '#7643AC']",
   "gradientWelcome: ['#14100D', '#1C1712', '#241C17', '#3D2F26']"],
  ["gradientLime: ['#D9FF00', '#7643AC', '#F484B9']",
   "gradientLime: ['#D9FF00', '#C2E500']"],
  ["gradientWarm: ['#C38CD9', '#F484B9']",
   "gradientWarm: ['#B08968', '#8C5A3C']"],

  // Translucent tints
  ["violetBg: 'rgba(118,67,172,0.06)'",  "violetBg: 'rgba(36,28,23,0.05)'"],
  ["violetBg2: 'rgba(118,67,172,0.12)'", "violetBg2: 'rgba(36,28,23,0.09)'"],
  ["violetBg3: 'rgba(118,67,172,0.18)'", "violetBg3: 'rgba(36,28,23,0.14)'"],
];

let swapped = 0;
let missed = [];

if (fs.existsSync(THEME)) {
  let src = fs.readFileSync(THEME, 'utf8');
  for (const [from, to] of SWAPS) {
    if (src.includes(from)) { src = src.replace(from, to); swapped++; }
    else missed.push(from.split(':')[0].trim());
  }
  fs.writeFileSync(THEME, src, 'utf8');
} else {
  missed.push('constants/theme.ts not found');
}

console.log(`2. Palette      ${swapped} of ${SWAPS.length} colours swapped to warm ink, clay and lime`);
if (missed.length) console.log(`   not matched: ${missed.join(', ')}`);

// ─────────────────────────────────────────────────────────────────
// 3. Hardcoded violet outside the theme file
// ─────────────────────────────────────────────────────────────────

const HEX = {
  '#7643AC': '#241C17', '#F484B9': '#8C5A3C', '#C38CD9': '#B08968',
  '#120B2E': '#14100D', '#332463': '#241C17', '#9B59D0': '#3D2F26',
  '#2d1854': '#1C1712', '#4a2070': '#241C17', '#FDFCFF': '#FFFEF7', '#0c0a15': '#0D0A08',
  '#F9F7FE': '#FBF8F3',
};

let hexCount = 0;
// theme.ts is included here too: the named swaps above already replaced
// the Colors block, so anything still matching is elsewhere in the file
// (text tones, shadows, border tones) and needs the same treatment.
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let out = src;
  for (const [from, to] of Object.entries(HEX)) {
    out = out.split(from).join(to);
    out = out.split(from.toLowerCase()).join(to);
  }
  if (out !== src) {
    hexCount += (src.match(/#(7643AC|F484B9|C38CD9|120B2E|332463|9B59D0)/gi) || []).length;
    fs.writeFileSync(file, out, 'utf8');
  }
}

console.log(`3. Hardcoded    ${hexCount} violet hex values replaced across the codebase`);

console.log('\nOne consequence: local storage keys moved from tressie_ to halea_,');
console.log('so you will need to take the quiz once after this.');
console.log('\nRun "npx expo start -c". "git diff" shows everything that moved.');
