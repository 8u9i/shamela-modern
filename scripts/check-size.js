// Size-budget guardrail (Layer 8). Fails when a build ships an entry chunk that
// is too large — i.e. when someone re-adds a heavy import to the startup path.
// Run after `vite build`:  node scripts/check-size.js
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist', 'assets');

const BUDGET_ENTRY_KB = 320;   // startup chunk (vendor-react + eager shell)
const BUDGET_LAZY_KB = 320;    // any single lazy-loaded view chunk
const BUDGET_TOTAL_KB = 520;   // all JS shipped to the renderer

if (!fs.existsSync(DIST)) {
  console.error('dist/assets not found — run `npm run build` first.');
  process.exit(1);
}

const chunks = fs
  .readdirSync(DIST)
  .filter((f) => f.endsWith('.js'))
  .map((f) => {
    const kb = fs.statSync(path.join(DIST, f)).size / 1024;
    return { name: f, kb };
  })
  .sort((a, b) => b.kb - a.kb);

const totalKb = chunks.reduce((sum, c) => sum + c.kb, 0);
const entry = chunks.find((c) => /^index-.*\.js$/.test(c.name));

console.log('JS chunks (dist/assets):');
for (const c of chunks) {
  console.log(`  ${c.name.padEnd(30)} ${c.kb.toFixed(1)} KB`);
}
console.log(`  ${'TOTAL'.padEnd(30)} ${totalKb.toFixed(1)} KB`);

const failures = [];
if (entry && entry.kb > BUDGET_ENTRY_KB) {
  failures.push(`entry chunk ${entry.name} = ${entry.kb.toFixed(1)} KB > ${BUDGET_ENTRY_KB} KB budget`);
}
for (const c of chunks) {
  if (c.name !== entry?.name && c.kb > BUDGET_LAZY_KB) {
    failures.push(`lazy chunk ${c.name} = ${c.kb.toFixed(1)} KB > ${BUDGET_LAZY_KB} KB budget`);
  }
}
if (totalKb > BUDGET_TOTAL_KB) {
  failures.push(`total JS = ${totalKb.toFixed(1)} KB > ${BUDGET_TOTAL_KB} KB budget`);
}

if (failures.length > 0) {
  console.error('\nSize budget exceeded:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\nSize budget OK.');
