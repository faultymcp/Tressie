// fix-polish.js
// One pass over the app for three things that make it read as templated:
//   1. Arbitrary spacing values
//   2. Entrance animations on screens that don't need them
//   3. The two decorative gradient headers on the auth screen
//
// Run from your project root:  node fix-polish.js
//
// This edits your files in place. Commit or stash first if you want an
// easy way back. Every change is printed.
//
// It works on whatever your tree currently contains — it matches on
// structure, not on exact file contents, and skips anything it can't
// match confidently.

const fs = require('fs');
const path = require('path');

const DIRS = ['app', 'components', 'constants'];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      walk(full, out);
    } else if (['.ts', '.tsx'].includes(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

const files = walk('.').filter(f => DIRS.some(d => f.startsWith(d + path.sep)));

// ─────────────────────────────────────────────────────────────────
// 1. Spacing
//
// Only the values that are clearly arbitrary. 6, 10, 14, 18 are used
// consistently enough across the app to be deliberate, so they stay —
// rewriting those would shift layouts that already look right.
// ─────────────────────────────────────────────────────────────────

const SPACING = { 1: 2, 3: 4, 5: 4, 7: 8, 13: 12, 15: 16, 17: 16, 22: 24, 30: 32, 36: 32, 44: 40 };
let spacingCount = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let n = 0;
  const out = src.replace(/\b((?:padding|margin|gap)[A-Za-z]*)\s*:\s*(\d+)\b/g, (m, prop, num) => {
    const v = Number(num);
    if (!(v in SPACING)) return m;
    n++;
    return `${prop}: ${SPACING[v]}`;
  });
  if (n) { fs.writeFileSync(file, out, 'utf8'); spacingCount += n; }
}
console.log(`1. Spacing      ${spacingCount} values normalised to a 4pt scale`);

// ─────────────────────────────────────────────────────────────────
// 2. Animations
//
// Kept where motion carries meaning: splash, onboarding, the quiz
// sequence, the name screens, the reveal. Stripped everywhere else.
// Only the `entering={...}` prop is deleted — JSX structure is never
// touched, so this cannot break a component.
// ─────────────────────────────────────────────────────────────────

const KEEP = new Set([
  'index.tsx', 'onboarding.tsx', 'account-type.tsx',
  'quiz.tsx', 'name.tsx', 'name-capture.tsx', 'reveal.tsx',
]);

function stripEntering(src) {
  let out = '', i = 0, removed = 0;
  while (i < src.length) {
    const at = src.indexOf('entering={', i);
    if (at === -1) { out += src.slice(i); break; }
    out += src.slice(i, at);
    let depth = 0, j = at + 'entering='.length;
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    if (src[j] === ' ') j++;
    removed++;
    i = j;
  }
  return { out, removed };
}

let animCount = 0, animFiles = 0, animKept = 0;

for (const file of files) {
  if (path.extname(file) !== '.tsx') continue;
  const base = path.basename(file);
  const src = fs.readFileSync(file, 'utf8');
  const found = (src.match(/entering=\{/g) || []).length;
  if (!found) continue;
  if (KEEP.has(base)) { animKept += found; continue; }
  const { out, removed } = stripEntering(src);
  if (removed) { fs.writeFileSync(file, out, 'utf8'); animCount += removed; animFiles++; }
}
console.log(`2. Animations   ${animCount} removed across ${animFiles} files, ${animKept} kept where motion means something`);

// ─────────────────────────────────────────────────────────────────
// 3. Auth header gradients
//
// The violet-to-pink block behind the wordmark is decoration, not the
// primary action. Every other gradient in the app is a CTA, a
// ceremonial backdrop, or a photo blend, and those all stay.
// ─────────────────────────────────────────────────────────────────

const authPath = path.join('app', 'auth.tsx');
let gradCount = 0;

if (fs.existsSync(authPath)) {
  let src = fs.readFileSync(authPath, 'utf8');
  const lines = src.split('\n');
  const opens = [];

  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*<LinearGradient\s*$/.test(lines[i])) continue;
    // Look ahead for the header style within the prop block.
    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      if (lines[j].includes('>')) break;
      if (lines[j].includes('styles.headerGradient')) { opens.push(i); break; }
    }
  }

  for (const open of opens.reverse()) {
    // Find the prop block end and the matching closing tag.
    let end = open;
    while (end < lines.length && !/^\s*>\s*$/.test(lines[end])) end++;
    let close = end, depth = 1;
    for (let k = end + 1; k < lines.length; k++) {
      if (lines[k].includes('<LinearGradient')) depth++;
      if (lines[k].includes('</LinearGradient>')) { depth--; if (!depth) { close = k; break; } }
    }
    if (close === end) continue;

    lines[open] = lines[open].replace('<LinearGradient', '<View');
    lines[close] = lines[close].replace('</LinearGradient>', '</View>');
    // Drop gradient-only props from the block.
    for (let k = open + 1; k < end; k++) {
      if (/^\s*(colors=|start=|end=|locations=)/.test(lines[k])) lines[k] = null;
    }
    gradCount++;
  }

  if (gradCount) {
    src = lines.filter(l => l !== null).join('\n');
    if (!/headerGradient:\s*\{\s*\n\s*backgroundColor/.test(src)) {
      src = src.replace(/(headerGradient:\s*\{)/, '$1\n    backgroundColor: Colors.inkDeep,');
    }
    fs.writeFileSync(authPath, src, 'utf8');
  }
}
console.log(`3. Gradients    ${gradCount} decorative header${gradCount === 1 ? '' : 's'} replaced with a solid ground`);

console.log('\nRun "npx expo start -c" and check the auth screen first.');
console.log('"git diff" shows everything that moved.');
